import * as dotenv from 'dotenv';
dotenv.config();

import { logger } from '../../lib/logger';
import { db } from '../../lib/db';
import { callLLM } from '../../lib/llm';
import { fetchRSSFeeds } from './sources/reddit';
import { fetchHackerNews } from './sources/hackernews';
import type { RawPost, IdeaRecord } from './types';

const AGENT = 'scout';

// ── LLM extraction prompt ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a venture scout for a one-person software business builder. Your ONLY job is to find posts that reveal real, repeated, monetizable operational pain — and extract them as structured opportunity briefs.

FOUNDER CONTEXT
The founder builds software: products, tools, dashboards, automations, APIs, content-plus-software businesses, comparison sites, directories. They ship fast. They are NOT a security expert, compliance specialist, infrastructure engineer, deep ML researcher, or hardware builder. Reject anything that requires those skills.

AUTO-REJECT — return only the word REJECT if any are true:
- generic tech news, trend commentary, AI model releases, or culture discussion
- politics, outages, or isolated one-off rants
- no specific nameable user group
- no concrete recurring workflow or operational pain
- security, cryptography, or compliance is the core value proposition
- deep infrastructure, distributed systems, or kernel engineering
- enterprise-grade trust or credibility required from day one
- research-grade machine learning or scientific depth required
- hardware-first execution
- no plausible V1 the founder could ship in days to a few weeks without specialist expertise

QUALIFICATIONS — ALL must be true to survive:
1. Specific nameable user segment (not "businesses", "developers", "everyone", "consumers")
2. Concrete recurring operational pain — not opinions, hot takes, news, or one-off events
3. Problem happens regularly (every sale, invoice, project, publish cycle, or buying decision)
4. A realistic small V1 can be described (tool, calculator, comparison site, dashboard, directory, automation)
5. At least one believable monetization path exists
6. Founder could ship a useful V1 in days to a few weeks with no specialist expertise

FAVORED V1 SHAPES (score these higher when extracting confidence):
workflow automation tool / niche SaaS subscription / calculator or estimator / comparison or affiliate site / directory or data product / dashboard or reporting layer / decision-support tool / AI-assisted helper / research layer / content-plus-software site

TASTE EXAMPLES

GOOD: "Service business owners manually chasing unpaid invoices by emailing from Gmail and updating a spreadsheet"
Why: clear user, recurring pain per-transaction, ugly manual workaround, obvious SaaS wedge, easy distribution in small business communities, clear subscription monetization

GOOD: "Buyers researching robot mowers who can't cleanly compare specs and setup complexity across brands"
Why: comparison pain per-buying-decision, strong affiliate revenue angle, calculator or quiz V1, content-plus-software, SEO-friendly distribution

BAD: "New XOR encryption tool for red-team penetration testers"
Why: specialist domain, trust-sensitive, outside founder range, hard to distribute, hard to support — REJECT

BAD: "GPT-5 release gets lots of comments on HN"
Why: trend discussion, no user workflow, no wedge, no monetization path — REJECT

If the post does NOT qualify, return only: REJECT

If it qualifies, return ONLY a valid JSON object. No markdown fences, no explanation, no text outside the JSON:
{
  "title": "5-8 word opportunity name",
  "audience": "specific user segment — narrow and designable",
  "pain": "one-sentence concrete recurring operational pain",
  "workaround": "what they do today instead (be specific — spreadsheet, manual email, 3 tools, nothing)",
  "frequency": "daily | weekly | monthly | per transaction | per buying decision | unknown",
  "mvp_idea": "the smallest useful first product in one sentence",
  "product_possibilities": ["V1 shapes that fit this pain"],
  "monetization": ["realistic revenue paths"],
  "distribution_paths": ["specific ways to reach first users"],
  "founder_fit_reason": ["why a product-minded software builder can ship this without specialist expertise"],
  "expansion_paths": ["how this could grow over time"],
  "source_excerpt": "short quote or paraphrase from the post that shows the pain",
  "confidence": "low | medium | high",
  "why_now": "one sentence: why this is an actionable opportunity right now",
  "asset_type_hint": "saas | directory | newsletter | website | calculator | comparison | dashboard | unknown",
  "founder_fit_score": 7
}

founder_fit_score is 1-10:
1-3 = requires specialist expertise or trust (should have been rejected)
4-6 = doable but friction exists
7-9 = clear fit: product/automation/content play, fast to ship
10 = perfect: obvious wedge, no dependencies, native founder range`;

// ── Clustering ────────────────────────────────────────────────────────────────

function getClusterKey(record: IdeaRecord): string {
  // Simple cluster key: first 3 significant words of audience + first 3 of pain
  const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').filter(w => w.length > 3).slice(0, 3).join('_');
  return `${words(record.audience)}__${words(record.pain)}`;
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

export async function runScout(): Promise<IdeaRecord[]> {
  logger.info(AGENT, 'Starting scout run');

  // Stage 1: Ingest raw posts from all sources
  const [rssResult, hnResult] = await Promise.allSettled([
    fetchRSSFeeds(),
    fetchHackerNews(),
  ]);

  const rawPosts: RawPost[] = [];
  // HN Algolia first — Ask/Show HN are highest-signal for opportunities
  if (hnResult.status === 'fulfilled') rawPosts.push(...hnResult.value);
  else logger.warn(AGENT, 'HN fetch failed', hnResult.reason);
  if (rssResult.status === 'fulfilled') rawPosts.push(...rssResult.value);
  else logger.warn(AGENT, 'RSS fetch failed', rssResult.reason);

  // Cap at 150 (the daily low-tier quota) — rate limiter controls throughput
  const MAX_LLM_PER_RUN = 150;
  const postsToProcess = rawPosts.slice(0, MAX_LLM_PER_RUN);
  logger.info(AGENT, `Stage 1: ${rawPosts.length} raw posts, processing ${postsToProcess.length} through LLM`);

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  // Stage 2: LLM extraction — sequential with rate limiting (< 15 calls/min)
  const extracted: IdeaRecord[] = [];

  for (const post of postsToProcess) {
    try {
      await sleep(4200); // Rate limit: stay under 15 calls/min for GitHub Models
      logger.info(AGENT, `LLM extracting: [${post.platform}] ${post.title}`);
      const prompt = `${SYSTEM_PROMPT}\n\nPost title: ${post.title}\n${post.body ? `Post content: ${post.body.slice(0, 400)}` : ''}`;
      const response = await callLLM(prompt, { model: 'gpt-4o-mini', temperature: 0.2 });

      if (response.trim().toUpperCase().startsWith('REJECT')) continue;

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]);

      extracted.push({
        title: parsed.title ?? post.title,
        audience: parsed.audience ?? '',
        pain: parsed.pain ?? '',
        workaround: parsed.workaround ?? '',
        frequency: parsed.frequency ?? 'unknown',
        mvpIdea: parsed.mvp_idea ?? '',
        productPossibilities: parsed.product_possibilities ?? [],
        monetization: parsed.monetization ?? [],
        distributionPaths: parsed.distribution_paths ?? [],
        founderFitReason: parsed.founder_fit_reason ?? [],
        expansionPaths: parsed.expansion_paths ?? [],
        sourceExcerpt: parsed.source_excerpt ?? '',
        confidence: parsed.confidence ?? 'low',
        whyNow: parsed.why_now ?? '',
        founderFitScore: typeof parsed.founder_fit_score === 'number' ? parsed.founder_fit_score : 5,
        signalCount: 1,
        sourceCluster: [{ platform: post.platform, url: post.url, context: post.title }],
        summary: `${parsed.audience} — ${parsed.pain}`,
        evidence: post.points ? [{ type: 'metric' as const, value: `${post.points} upvotes` }] : [],
        sources: [{ platform: post.platform, url: post.url, context: post.title }],
        keywords: post.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').filter(w => w.length > 3),
        tags: [],
        assetTypeHint: (parsed.asset_type_hint ?? 'unknown') as IdeaRecord['assetTypeHint'],
      });
    } catch (err: any) {
      logger.warn(AGENT, `LLM extraction failed for "${post.title}": ${err?.message ?? err}`);
    }
  }

  logger.info(AGENT, `Stage 2: ${extracted.length} opportunities extracted by LLM`);

  // Stage 3: Cluster — merge ideas with similar audience+pain into one with higher signal_count
  const clusters = new Map<string, IdeaRecord>();
  for (const idea of extracted) {
    const key = getClusterKey(idea);
    if (clusters.has(key)) {
      const existing = clusters.get(key)!;
      existing.signalCount += 1;
      existing.sourceCluster.push(...idea.sourceCluster);
      // Upgrade confidence if signal count hits threshold
      if (existing.signalCount >= 3) existing.confidence = 'high';
      else if (existing.signalCount >= 2) existing.confidence = existing.confidence === 'low' ? 'medium' : existing.confidence;
    } else {
      clusters.set(key, idea);
    }
  }

  // Stage 4: Promote ideas where LLM assessed medium or high confidence
  // (single-run can't accumulate 2+ signals — clustering helps across future runs)
  const promoted = [...clusters.values()].filter(
    idea => idea.confidence !== 'low'
  );

  logger.info(AGENT, `Stage 3/4: ${clusters.size} clusters, ${promoted.length} promoted (medium/high confidence)`);

  // Stage 5: Dedup against existing DB ideas (by title similarity) and write
  const { data: existingIdeas } = await db.from('ideas').select('title');
  const existingTitles = new Set((existingIdeas ?? []).map((r: any) => r.title.toLowerCase()));

  let written = 0;
  for (const idea of promoted) {
    if (existingTitles.has(idea.title.toLowerCase())) continue;

    await db.from('ideas').insert({
      title: idea.title,
      audience: idea.audience,
      pain: idea.pain,
      workaround: idea.workaround,
      frequency: idea.frequency,
      mvp_idea: idea.mvpIdea,
      product_possibilities: idea.productPossibilities,
      monetization: idea.monetization,
      distribution_paths: idea.distributionPaths,
      founder_fit_reason: idea.founderFitReason,
      expansion_paths: idea.expansionPaths,
      source_excerpt: idea.sourceExcerpt,
      confidence: idea.confidence,
      why_now: idea.whyNow,
      founder_fit_score: idea.founderFitScore,
      signal_count: idea.signalCount,
      source_cluster: idea.sourceCluster,
      summary: idea.summary,
      evidence: idea.evidence,
      sources: idea.sources,
      keywords: idea.keywords,
      tags: idea.tags,
      asset_type_hint: idea.assetTypeHint,
    });
    written++;
  }

  logger.info(AGENT, `Scout complete — ${written} new ideas written to DB`);
  return promoted;
}
