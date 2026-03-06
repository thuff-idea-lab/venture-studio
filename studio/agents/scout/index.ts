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

const SYSTEM_PROMPT = `You are an opportunity extraction system for an internet venture studio. Your job is to identify monetizable business opportunities from raw internet posts.

Only return an opportunity if ALL of these are true:
1. There is a specific, identifiable user group (not "everyone" or "people")
2. There is a recurring, concrete problem or friction — not a one-off complaint
3. The problem implies a possible digital product, service, automation, or content asset
4. There is a plausible way to make money from solving it
5. It is NOT: generic news, broad discussion, outage chatter, politics, career philosophy, or anything without a clear target user

If the post does not meet all criteria, return exactly: REJECT

If it does, return a JSON object with these exact fields:
{
  "title": "short opportunity name (5-8 words)",
  "audience": "who specifically has this problem",
  "pain": "the specific recurring friction or problem",
  "workaround": "what they currently do instead (or 'Nothing — they go without')",
  "product_possibilities": ["list", "of", "product", "types"],
  "monetization": ["list", "of", "monetization", "paths"],
  "confidence": "low|medium|high",
  "asset_type_hint": "saas|directory|newsletter|website|bot|data|unknown"
}`;

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
        productPossibilities: parsed.product_possibilities ?? [],
        monetization: parsed.monetization ?? [],
        confidence: parsed.confidence ?? 'low',
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
      product_possibilities: idea.productPossibilities,
      monetization: idea.monetization,
      confidence: idea.confidence,
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
