import * as dotenv from 'dotenv';
dotenv.config();

import { logger } from '../../lib/logger';
import { db } from '../../lib/db';
import { callLLM } from '../../lib/llm';
import { fetchRSSFeeds } from './sources/reddit';
import { fetchRedditIntentSearch } from './sources/reddit-search';
import { fetchHackerNews } from './sources/hackernews';
import type { RawPost, IdeaRecord } from './types';

const AGENT = 'scout';

// ── LLM extraction prompt (v2 — 100-point scoring) ────────────────────────────

const SYSTEM_PROMPT = `You are an opportunity researcher for a one-person software business builder.

Your ONLY job is to find posts that reveal real, repeated, monetizable operational pain — and score them as structured opportunity briefs.

FOUNDER CONTEXT
The founder builds software: products, tools, dashboards, automations, APIs, comparison sites, directories. They ship fast and solo. They are NOT a security expert, compliance specialist, infrastructure engineer, deep ML researcher, or hardware builder.

AUTO-REJECT — return only the word REJECT if any are true:
- generic tech news, trend commentary, AI model releases, culture discussion
- politics, outages, or rants
- no specific nameable user group
- no concrete recurring workflow or operational pain
- security, cryptography, or compliance is the core value proposition
- deep infrastructure, distributed systems, or kernel engineering
- enterprise trust required from day one
- research-grade ML or scientific depth required
- hardware-first execution
- no plausible V1 without specialist expertise

QUALIFICATIONS — ALL must be true to survive:
1. Specific nameable user segment (not "businesses", "developers", "everyone")
2. Concrete recurring operational pain — not opinions or hot takes
3. Problem happens regularly (per sale, invoice, project, publish, buying decision)
4. A realistic small V1 can be described (tool, calculator, comparison site, dashboard, directory, automation)
5. At least one clear monetization path exists
6. Founder could ship a useful V1 without specialist expertise

FAVORED OPPORTUNITY TYPES:
- ugly boring manual workflows (spreadsheet, manual email, copy-paste)
- repetitive tasks done every sale/invoice/project
- comparison confusion (too many options, no good comparison tool)
- fragmented information (data exists but isn't searchable/organized)
- expensive or bloated incumbents with obvious niche gaps
- buying friction (research takes too long, specs are hard to compare)

If the post does NOT qualify, return only: REJECT

If it qualifies, return ONLY valid JSON. No markdown, no explanation:
{
  "title": "5-8 word opportunity name",
  "audience": "specific user segment — narrow and designable",
  "pain": "one-sentence concrete recurring operational pain",
  "workaround": "what they do today instead (spreadsheet, manual email, nothing, 3 tools)",
  "frequency": "daily | weekly | monthly | per transaction | per buying decision | unknown",
  "mvp_idea": "smallest useful first product in one sentence",
  "product_possibilities": ["V1 shapes that fit this pain"],
  "monetization": ["realistic revenue paths"],
  "distribution_paths": ["specific ways to reach first users"],
  "founder_fit_reason": ["why a product-minded software builder can ship this"],
  "expansion_paths": ["how this could grow"],
  "source_excerpt": "short quote or paraphrase showing the pain",
  "why_now": "one sentence: why this is actionable right now",
  "asset_type_hint": "saas | directory | newsletter | website | calculator | comparison | dashboard | unknown",
  "score_breakdown": {
    "pain_clarity": 0,
    "user_segment_clarity": 0,
    "monetization_potential": 0,
    "mvp_feasibility": 0,
    "repeatability": 0,
    "distribution_clarity": 0,
    "expansion_potential": 0,
    "product_leverage": 0,
    "founder_fit": 0
  },
  "penalties": [],
  "total_score": 0,
  "status": "PROMOTE | WATCH | REJECT"
}

SCORING GUIDE (100 points total):
Positive: pain_clarity(20) + user_segment_clarity(15) + monetization_potential(15) + mvp_feasibility(15) + repeatability(10) + distribution_clarity(10) + expansion_potential(5) + product_leverage(5) + founder_fit(5)
Penalties: too_technical(-20), regulated_or_trust_critical(-20), no_clear_revenue(-15), too_broad(-15), requires_large_team(-15), generic_news(-25)
Thresholds: 80+ = PROMOTE, 65-79 = WATCH, <65 = REJECT`;

// ── Clustering ────────────────────────────────────────────────────────────────

function getClusterKey(record: IdeaRecord): string {
  const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').filter(w => w.length > 3).slice(0, 3).join('_');
  return `${words(record.audience)}__${words(record.pain)}`;
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

export async function runScout(): Promise<IdeaRecord[]> {
  logger.info(AGENT, 'Starting scout run (v2 — intent search + 100-point scoring)');

  // Stage 1: Ingest from all sources in parallel
  const [hnResult, rssResult, redditSearchResult] = await Promise.allSettled([
    fetchHackerNews(),
    fetchRSSFeeds(),
    fetchRedditIntentSearch(),
  ]);

  const rawPosts: RawPost[] = [];
  if (hnResult.status === 'fulfilled') rawPosts.push(...hnResult.value);
  else logger.warn(AGENT, 'HN fetch failed', hnResult.reason);
  if (redditSearchResult.status === 'fulfilled') rawPosts.push(...redditSearchResult.value);
  else logger.warn(AGENT, 'Reddit intent search failed', redditSearchResult.reason);
  if (rssResult.status === 'fulfilled') rawPosts.push(...rssResult.value);
  else logger.warn(AGENT, 'RSS fetch failed', rssResult.reason);

  logger.info(AGENT, `Stage 1: ${rawPosts.length} raw posts to process`);

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  // Stage 2: LLM extraction with 100-point scoring
  const extracted: IdeaRecord[] = [];

  for (const post of rawPosts) {
    try {
      await sleep(1000); // OpenAI has much higher rate limits than GitHub Models
      logger.info(AGENT, `LLM extracting: [${post.platform}] ${post.title}`);
      const prompt = `${SYSTEM_PROMPT}\n\nPost title: ${post.title}\n${post.body ? `Post content: ${post.body.slice(0, 600)}` : ''}`;
      const response = await callLLM(prompt, { model: 'gpt-4o-mini', temperature: 0.2 });

      if (response.trim().toUpperCase().startsWith('REJECT')) continue;

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]);

      // Skip anything the LLM itself scored as REJECT
      if (parsed.status === 'REJECT') continue;

      const totalScore = typeof parsed.total_score === 'number' ? parsed.total_score : 50;
      const founderFitScore = parsed.score_breakdown?.founder_fit ?? 3;

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
        confidence: totalScore >= 80 ? 'high' : totalScore >= 65 ? 'medium' : 'low',
        whyNow: parsed.why_now ?? '',
        founderFitScore: founderFitScore,
        signalCount: 1,
        sourceCluster: [{ platform: post.platform, url: post.url, context: post.title }],
        summary: `${parsed.audience} — ${parsed.pain}`,
        evidence: post.points ? [{ type: 'metric' as const, value: `${post.points} upvotes` }] : [],
        sources: [{ platform: post.platform, url: post.url, context: post.title }],
        keywords: post.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').filter(w => w.length > 3),
        tags: [parsed.status ?? 'WATCH'],
        assetTypeHint: (parsed.asset_type_hint ?? 'unknown') as IdeaRecord['assetTypeHint'],
      });
    } catch (err: any) {
      logger.warn(AGENT, `LLM extraction failed for "${post.title}": ${err?.message ?? err}`);
    }
  }

  logger.info(AGENT, `Stage 2: ${extracted.length} opportunities extracted by LLM`);

  // Stage 3: Cluster — merge ideas with similar audience+pain
  const clusters = new Map<string, IdeaRecord>();
  for (const idea of extracted) {
    const key = getClusterKey(idea);
    if (clusters.has(key)) {
      const existing = clusters.get(key)!;
      existing.signalCount += 1;
      existing.sourceCluster.push(...idea.sourceCluster);
      if (existing.signalCount >= 3) existing.confidence = 'high';
      else if (existing.signalCount >= 2 && existing.confidence === 'low') existing.confidence = 'medium';
    } else {
      clusters.set(key, idea);
    }
  }

  // Stage 4: Promote PROMOTE + WATCH — both are worth storing
  const promoted = [...clusters.values()].filter(idea => idea.confidence !== 'low');

  logger.info(AGENT, `Stage 3/4: ${clusters.size} clusters, ${promoted.length} promoted (medium/high confidence)`);

  // Stage 5: Dedup against existing DB ideas and write
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

