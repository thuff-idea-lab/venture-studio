import * as dotenv from 'dotenv';
dotenv.config();

import { logger } from '../../lib/logger';
import { db } from '../../lib/db';
import { callLLM } from '../../lib/llm';
import { fetchRSSFeeds } from './sources/reddit';
import { fetchRedditIntentSearch } from './sources/reddit-search';
import { fetchHackerNews } from './sources/hackernews';
import { fetchComplaintEcosystemPosts } from './sources/complaints';
import { rankRawPost } from './prefilter';
import type { RawPost, IdeaRecord, SourceLane } from './types';

const AGENT = 'scout';

// ── LLM extraction prompt (v2 — 100-point scoring) ────────────────────────────

const SYSTEM_PROMPT = `You are an opportunity researcher for a one-person software business builder.

Your ONLY job is to find posts that reveal specific, repeated, monetizable pain, buying confusion, discovery gaps, fragmented information, or ugly manual workflows — and turn them into structured opportunity briefs.

FOUNDER CONTEXT
The founder is a strong product-minded software builder. They can build polished software products, calculators, comparison tools, directories, searchable databases, dashboards, automations, APIs, lightweight SaaS, content/data products, and decision-support tools. They ship fast and solo. They are NOT a security expert, compliance specialist, infrastructure engineer, deep ML researcher, quant specialist, or hardware builder.

NORTH STAR
Prefer opportunities that could become a small, sharp internet business with:
- a very clear user
- a very clear recurring trigger
- a small, useful V1
- obvious monetization
- an easy-to-explain demo
- at least one believable early distribution path

AUTO-REJECT — return only the word REJECT if any are true:
- generic tech news, trend commentary, AI model releases, culture discussion
- politics, outages, rants, or vague discussion
- no specific nameable user group
- no concrete recurring workflow, buying decision, discovery gap, or operational pain
- security, cryptography, compliance, legal, or medical expertise is the core value proposition
- deep infrastructure, distributed systems, kernel engineering, or enterprise platform engineering
- enterprise trust required from day one
- research-grade ML or scientific depth required
- hardware-first execution
- no plausible V1 without specialist expertise
- the idea is just a broad software category with no specific wedge
- the distribution path is generic or hand-wavy

QUALIFICATIONS — ALL must be true to survive:
1. Specific nameable user segment with a narrow, designable job-to-be-done (not "businesses", "developers", "everyone")
2. Concrete recurring pain, buying confusion, discovery gap, or ugly manual workflow — not opinions or hot takes
3. Problem happens regularly (per sale, invoice, project, publish, search, comparison, or buying decision)
4. A realistic small V1 can be described with a clear wedge and a clear reason to exist instead of a spreadsheet, generic tool, or incumbent
5. At least one clear monetization path exists
6. Founder could ship a useful V1 without specialist expertise
7. At least one specific early distribution path can be named

STRONGLY PREFER:
- calculators, estimators, quizzes, sizing tools
- comparison sites and decision-support tools
- directories, searchable databases, registries, provider finders
- affiliate/research sites where discovery is the bottleneck
- creator and seller helpers for listings, titles, descriptions, keywords, captions
- ugly boring manual workflows (spreadsheet, manual email, copy-paste)
- repetitive tasks done every sale/invoice/project
- comparison confusion (too many options, no good comparison tool)
- fragmented information (data exists but isn't searchable/organized)
- expensive or bloated incumbents with obvious niche gaps
- buying friction (research takes too long, specs are hard to compare)
- products that can be demonstrated in under 15 seconds from a landing page, screenshot, or short video

DE-EMPHASIZE OR PENALIZE:
- enterprise back-office software unless the V1 is obviously narrow, lightweight, and easy to distribute
- ideas that require compliance expertise, security credibility, or infrastructure depth
- vague productivity software without a concrete narrow user and repeatable trigger
- broad dashboard / management / workflow / platform ideas without a specific niche wedge
- ideas whose title/category could plausibly describe 50 existing SaaS startups
- consumer durable-goods comparison ideas unless the source clearly supports repeated monetizable buying behavior

TITLE RULES:
- title must be concrete, specific, and noun-heavy
- do not use vague prefixes like "AI-Powered", "Streamlined", "Optimized", "Simplified", or "Automated" unless the title also names a very specific user and job-to-be-done
- avoid generic endings like "Tool" when a more specific product shape is obvious
- prefer names like "Childcare Provider Search Directory" over "AI-Powered Discovery Tool"
- reject titles that are still vague after sanitization

ASSET TYPE RULES:
- asset_type_hint must be exactly one of: saas, directory, newsletter, website, calculator, comparison, dashboard, unknown
- choose only one value
- never return free-form combinations like "tool | calculator | comparison"

DISTRIBUTION RULES:
- distribution_paths must be specific and believable
- bad examples: "SEO", "Reddit", "X", "communities"
- good examples: "r/EtsySellers threads about listing optimization", "search traffic for high-intent calculator queries", "cold outreach to freelance designers already discussing unpaid invoices", "parent groups comparing local childcare options"
- if distribution is generic, reject the idea

If the post does NOT qualify, return only: REJECT

If it qualifies, return ONLY valid JSON. No markdown, no explanation:
{
  "title": "5-8 word opportunity name",
  "audience": "specific user segment — narrow and designable",
  "pain": "one-sentence concrete recurring pain, buying confusion, or discovery gap",
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

const SOURCE_LANE_LIMITS: Record<SourceLane, number> = {
  pain_communities: 80,
  complaint_ecosystems: 60,
  buying_confusion: 60,
  discovery_data_gaps: 30,
  startup_ecosystem: 10,
};

const LLM_LANE_TARGET_SHARES: Record<SourceLane, number> = {
  pain_communities: 0.35,
  complaint_ecosystems: 0.2,
  buying_confusion: 0.25,
  discovery_data_gaps: 0.15,
  startup_ecosystem: 0.05,
};

const DEFAULT_MAX_LLM_POSTS = 80;
const DEFAULT_PREVIEW_SAMPLE_SIZE = 3;

function balancePostsBySourceLane(posts: RawPost[]): RawPost[] {
  const groups = new Map<SourceLane | 'unknown', RawPost[]>();

  for (const post of posts) {
    const lane = post.metadata?.sourceLane ?? 'unknown';
    const existing = groups.get(lane) ?? [];
    existing.push(post);
    groups.set(lane, existing);
  }

  const selected: RawPost[] = [];

  for (const [lane, lanePosts] of groups.entries()) {
    const sorted = [...lanePosts].sort((left, right) => rankRawPost(right) - rankRawPost(left));
    const limit = lane === 'unknown' ? 12 : SOURCE_LANE_LIMITS[lane];
    selected.push(...sorted.slice(0, limit));
  }

  return selected.sort((left, right) => rankRawPost(right) - rankRawPost(left));
}

function getLaneCounts(posts: RawPost[]): Record<string, number> {
  return posts.reduce<Record<string, number>>((counts, post) => {
    const lane = post.metadata?.sourceLane ?? 'unknown';
    counts[lane] = (counts[lane] ?? 0) + 1;
    return counts;
  }, {});
}

function capPostsForLLM(posts: RawPost[], maxPosts: number): RawPost[] {
  if (posts.length <= maxPosts) return posts;

  const grouped = new Map<SourceLane | 'unknown', RawPost[]>();

  for (const post of posts) {
    const lane = post.metadata?.sourceLane ?? 'unknown';
    const existing = grouped.get(lane) ?? [];
    existing.push(post);
    grouped.set(lane, existing);
  }

  const activeLanes = [...grouped.entries()]
    .filter(([, lanePosts]) => lanePosts.length > 0)
    .map(([lane]) => lane);

  const weightedLanes = activeLanes.filter((lane): lane is SourceLane => lane !== 'unknown');
  const totalWeight = weightedLanes.reduce((sum, lane) => sum + LLM_LANE_TARGET_SHARES[lane], 0);

  const allocations = new Map<SourceLane | 'unknown', number>();
  let reserved = 0;

  for (const lane of activeLanes) {
    const lanePosts = grouped.get(lane) ?? [];
    if (lane === 'unknown' || totalWeight === 0) {
      allocations.set(lane, 0);
      continue;
    }

    const rawAllocation = Math.floor((maxPosts * LLM_LANE_TARGET_SHARES[lane]) / totalWeight);
    const allocation = Math.min(lanePosts.length, Math.max(rawAllocation, 1));
    allocations.set(lane, allocation);
    reserved += allocation;
  }

  while (reserved > maxPosts) {
    const reducibleLane = [...allocations.entries()]
      .filter(([lane, allocation]) => lane !== 'unknown' && allocation > 1)
      .sort((left, right) => (left[1] - right[1]) || (LLM_LANE_TARGET_SHARES[left[0] as SourceLane] - LLM_LANE_TARGET_SHARES[right[0] as SourceLane]))[0];

    if (!reducibleLane) break;
    allocations.set(reducibleLane[0], reducibleLane[1] - 1);
    reserved -= 1;
  }

  while (reserved < maxPosts) {
    const expandableLane = activeLanes
      .map(lane => ({
        lane,
        allocated: allocations.get(lane) ?? 0,
        available: (grouped.get(lane) ?? []).length,
        weight: lane === 'unknown' ? 0 : LLM_LANE_TARGET_SHARES[lane],
      }))
      .filter(entry => entry.allocated < entry.available)
      .sort((left, right) => {
        if (right.weight !== left.weight) return right.weight - left.weight;
        return (right.available - right.allocated) - (left.available - left.allocated);
      })[0];

    if (!expandableLane) break;
    allocations.set(expandableLane.lane, (allocations.get(expandableLane.lane) ?? 0) + 1);
    reserved += 1;
  }

  const selected: RawPost[] = [];

  for (const lane of activeLanes) {
    const allocation = allocations.get(lane) ?? 0;
    if (allocation <= 0) continue;
    selected.push(...(grouped.get(lane) ?? []).slice(0, allocation));
  }

  return selected.sort((left, right) => rankRawPost(right) - rankRawPost(left)).slice(0, maxPosts);
}

function getMaxLLMPosts(): number {
  const rawValue = process.env.SCOUT_MAX_LLM_POSTS;
  if (!rawValue) return DEFAULT_MAX_LLM_POSTS;

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    logger.warn(AGENT, `Invalid SCOUT_MAX_LLM_POSTS value "${rawValue}". Falling back to ${DEFAULT_MAX_LLM_POSTS}.`);
    return DEFAULT_MAX_LLM_POSTS;
  }

  return Math.floor(parsed);
}

function isPreviewOnlyMode(): boolean {
  const rawValue = process.env.SCOUT_PREVIEW_ONLY;
  if (!rawValue) return false;

  return ['1', 'true', 'yes', 'on'].includes(rawValue.toLowerCase());
}

function getRunTag(): string | null {
  const rawValue = process.env.SCOUT_RUN_TAG?.trim();
  if (!rawValue) return null;

  const sanitized = rawValue.toLowerCase().replace(/[^a-z0-9:_-]+/g, '-');
  return sanitized.length > 0 ? sanitized : null;
}

function buildPreviewByLane(posts: RawPost[]): Record<string, Array<Record<string, string | number>>> {
  const grouped = new Map<string, RawPost[]>();

  for (const post of posts) {
    const lane = post.metadata?.sourceLane ?? 'unknown';
    const existing = grouped.get(lane) ?? [];
    existing.push(post);
    grouped.set(lane, existing);
  }

  return [...grouped.entries()].reduce<Record<string, Array<Record<string, string | number>>>>((result, [lane, lanePosts]) => {
    result[lane] = lanePosts.slice(0, DEFAULT_PREVIEW_SAMPLE_SIZE).map(post => ({
      title: post.title,
      platform: post.platform,
      intent: post.metadata?.intent ?? 'unknown',
      prefilterScore: post.metadata?.prefilterScore ?? 0,
      url: post.url,
    }));
    return result;
  }, {});
}

function normalizeAssetTypeHint(rawValue: unknown, title: string, mvpIdea: string): IdeaRecord['assetTypeHint'] {
  const normalized = `${String(rawValue ?? '')} ${title} ${mvpIdea}`.toLowerCase();

  if (/comparison|compare|alternative|versus|vs\b/.test(normalized)) return 'comparison';
  if (/calculator|estimator|pricing tool|cost tool|quote tool/.test(normalized)) return 'calculator';
  if (/directory|finder|listing|registry|lookup|search/.test(normalized)) return 'directory';
  if (/dashboard|analytics|reporting|report generator/.test(normalized)) return 'dashboard';
  if (/newsletter/.test(normalized)) return 'newsletter';
  if (/youtube/.test(normalized)) return 'youtube';
  if (/website/.test(normalized)) return 'website';
  if (/saas|software|workflow|scheduler|resizer|generator|organizing|organizer|tool/.test(normalized)) return 'saas';

  return 'unknown';
}

function isWeakOpportunityTitle(title: string): boolean {
  const normalized = title.trim();

  if (!normalized) return true;
  if (/^ai-powered\b/i.test(normalized)) return true;
  if (/^(streamlined|simplified|optimized|automated)\b.*\btool$/i.test(normalized)) return true;
  if (/\b(growth|customer acquisition|productivity) tool$/i.test(normalized)) return true;

  const genericProductPatterns = /(dashboard|management|workflow|platform|system|portal|tracker|automation)\b/i;
  const specificQualifierPatterns = /(for\s+.+)|(\b[a-z]+\s+(directory|calculator|comparison|finder|estimator|resizer|optimizer|checklist|search)\b)/i;

  if (genericProductPatterns.test(normalized) && !specificQualifierPatterns.test(normalized)) {
    return true;
  }

  return false;
}

function sanitizeOpportunityTitle(title: string): string {
  return title
    .replace(/^ai-powered\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isWeakAudience(audience: string): boolean {
  const normalized = audience.trim().toLowerCase();
  if (!normalized) return true;

  return [
    'businesses',
    'small businesses',
    'consumers',
    'users',
    'teams',
    'founders',
    'creators',
    'developers',
    'everyone',
  ].includes(normalized);
}

function hasSpecificDistributionPaths(paths: string[]): boolean {
  if (!Array.isArray(paths) || paths.length === 0) return false;

  const genericPatterns = [
    /^seo$/i,
    /^reddit$/i,
    /^x$/i,
    /^communities$/i,
    /^social media$/i,
    /^content marketing$/i,
    /^ads$/i,
  ];

  return paths.some(path => {
    const normalized = path.trim();
    if (!normalized) return false;
    if (genericPatterns.some(pattern => pattern.test(normalized))) return false;
    return normalized.length >= 18;
  });
}

function inferEvidenceConfidence(post: RawPost): 'low' | 'medium' | 'high' {
  const lane = post.metadata?.sourceLane ?? 'unknown';
  const priority = post.metadata?.sourcePriority ?? 'validation';
  const score = post.metadata?.prefilterScore ?? 0;

  if (priority === 'primary' && (lane === 'buying_confusion' || lane === 'discovery_data_gaps') && score >= 18) {
    return 'high';
  }

  if (priority === 'primary' && score >= 12) return 'medium';
  if (priority === 'secondary' && score >= 12) return 'medium';
  return 'low';
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

export async function runScout(): Promise<IdeaRecord[]> {
  logger.info(AGENT, 'Starting scout run (v2 — intent search + 100-point scoring)');

  // Stage 1: Ingest from all sources in parallel
  const [hnResult, rssResult, redditSearchResult, complaintResult] = await Promise.allSettled([
    fetchHackerNews(),
    fetchRSSFeeds(),
    fetchRedditIntentSearch(),
    fetchComplaintEcosystemPosts(),
  ]);

  const rawPosts: RawPost[] = [];
  if (hnResult.status === 'fulfilled') rawPosts.push(...hnResult.value);
  else logger.warn(AGENT, 'HN fetch failed', hnResult.reason);
  if (redditSearchResult.status === 'fulfilled') rawPosts.push(...redditSearchResult.value);
  else logger.warn(AGENT, 'Reddit intent search failed', redditSearchResult.reason);
  if (rssResult.status === 'fulfilled') rawPosts.push(...rssResult.value);
  else logger.warn(AGENT, 'RSS fetch failed', rssResult.reason);
  if (complaintResult.status === 'fulfilled') rawPosts.push(...complaintResult.value);
  else logger.warn(AGENT, 'Complaint ecosystem source failed', complaintResult.reason);

  const laneBalancedPosts = balancePostsBySourceLane(rawPosts);
  const maxLLMPosts = getMaxLLMPosts();
  const cappedPosts = capPostsForLLM(laneBalancedPosts, maxLLMPosts);

  logger.info(AGENT, `Stage 1: ${rawPosts.length} raw posts fetched, ${laneBalancedPosts.length} selected after lane balancing`);
  logger.info(AGENT, 'Stage 1 lane counts before cap', getLaneCounts(laneBalancedPosts));
  logger.info(AGENT, `Stage 1 LLM cap: processing ${cappedPosts.length} posts (SCOUT_MAX_LLM_POSTS=${maxLLMPosts})`);
  logger.info(AGENT, 'Stage 1 lane counts after cap', getLaneCounts(cappedPosts));

  const runTag = getRunTag();
  if (runTag) {
    logger.info(AGENT, `Stage 1 run tag enabled: run:${runTag}`);
  }

  if (isPreviewOnlyMode()) {
    logger.info(AGENT, 'Stage 1 preview sample by lane', buildPreviewByLane(cappedPosts));
    logger.info(AGENT, 'Preview-only mode enabled. Skipping LLM extraction and database writes.');
    return [];
  }

  // Stage 2: LLM extraction with 100-point scoring
  const extracted: IdeaRecord[] = [];
  let llmAttemptCount = 0;
  let llmFailureCount = 0;
  let llmFatalFailureCount = 0;
  const fatalFailureMessages: string[] = [];

  for (const post of cappedPosts) {
    try {
      llmAttemptCount += 1;
      logger.info(AGENT, `LLM extracting: [${post.platform}] ${post.title}`);
      const prefilterContext = post.metadata
        ? `Scout prefilter signals:\n- source_lane: ${post.metadata.sourceLane ?? 'unknown'}\n- source_name: ${post.metadata.sourceName ?? 'unknown'}\n- source_priority: ${post.metadata.sourcePriority ?? 'unknown'}\n- bucket: ${post.metadata.bucket ?? 'unknown'}\n- intent: ${post.metadata.intent ?? 'unknown'}\n- easy_build_score: ${post.metadata.easyBuildScore ?? 0}\n- hard_build_penalty: ${post.metadata.hardBuildPenalty ?? 0}\n- prefilter_score: ${post.metadata.prefilterScore ?? 0}\nTreat startup ecosystem sources as secondary validation, not primary pain discovery. Strongly favor opportunities that can become a lightweight, easy-to-demo V1 such as a calculator, estimator, comparison tool, directory, searchable database, research helper, diagnostic, or creator/seller workflow aid. Penalize generic dashboard, management, workflow, platform, and tracker ideas unless the source clearly supports a very specific underserved user and repeated trigger.\n\n`
        : '';
      const prompt = `${SYSTEM_PROMPT}\n\n${prefilterContext}Post title: ${post.title}\n${post.body ? `Post content: ${post.body.slice(0, 600)}` : ''}`;
      const response = await callLLM(prompt, { model: 'gpt-4o-mini', temperature: 0.2 });

      if (response.trim().toUpperCase().startsWith('REJECT')) continue;

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]);

      // Skip anything the LLM itself scored as REJECT
      if (parsed.status === 'REJECT') continue;

      const sanitizedTitle = sanitizeOpportunityTitle(parsed.title ?? post.title);
      if (isWeakOpportunityTitle(sanitizedTitle)) continue;

      const audience = parsed.audience ?? '';
      if (isWeakAudience(audience)) continue;

      const distributionPaths = Array.isArray(parsed.distribution_paths) ? parsed.distribution_paths : [];
      if (!hasSpecificDistributionPaths(distributionPaths)) continue;

      const monetization = Array.isArray(parsed.monetization) ? parsed.monetization : [];
      if (monetization.length === 0) continue;

      const mvpIdea = parsed.mvp_idea ?? '';
      if (!mvpIdea.trim()) continue;

      const totalScore = typeof parsed.total_score === 'number' ? parsed.total_score : 50;
      const founderFitScore = parsed.score_breakdown?.founder_fit ?? 3;
      const assetTypeHint = normalizeAssetTypeHint(parsed.asset_type_hint, sanitizedTitle, mvpIdea);
      const opportunityConfidence: 'low' | 'medium' | 'high' = totalScore >= 85 ? 'high' : totalScore >= 72 ? 'medium' : 'low';
      const evidenceConfidence = inferEvidenceConfidence(post);

      extracted.push({
        title: sanitizedTitle,
        audience,
        pain: parsed.pain ?? '',
        workaround: parsed.workaround ?? '',
        frequency: parsed.frequency ?? 'unknown',
        mvpIdea,
        productPossibilities: parsed.product_possibilities ?? [],
        monetization,
        distributionPaths,
        founderFitReason: parsed.founder_fit_reason ?? [],
        expansionPaths: parsed.expansion_paths ?? [],
        sourceExcerpt: parsed.source_excerpt ?? '',
        confidence:
          opportunityConfidence === 'high' && evidenceConfidence !== 'low'
            ? 'high'
            : opportunityConfidence === 'medium' && evidenceConfidence !== 'low'
              ? 'medium'
              : 'low',
        opportunityConfidence,
        evidenceConfidence,
        whyNow: parsed.why_now ?? '',
        founderFitScore: founderFitScore,
        signalCount: 1,
        sourceTypeCount: 1,
        sourceLaneCount: 1,
        sourceCluster: [{ platform: post.platform, url: post.url, context: post.title }],
        summary: `${audience} — ${parsed.pain ?? ''}`,
        evidence: post.points ? [{ type: 'metric' as const, value: `${post.points} upvotes` }] : [],
        sources: [{ platform: post.platform, url: post.url, context: post.title }],
        keywords: post.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').filter(w => w.length > 3),
        tags: [parsed.status ?? 'WATCH', ...(runTag ? [`run:${runTag}`] : [])],
        canonicalTags: [assetTypeHint, post.metadata?.sourceLane ?? 'unknown'],
        assetTypeHint,
      });
    } catch (err: any) {
      llmFailureCount += 1;
      const errorMessage = err?.message ?? String(err);
      if (isFatalLLMFailure(errorMessage)) {
        llmFatalFailureCount += 1;
        fatalFailureMessages.push(errorMessage);
      }

      logger.warn(AGENT, `LLM extraction failed for "${post.title}": ${err?.message ?? err}`);
    }
  }

  if (llmFatalFailureCount > 0 && extracted.length === 0) {
    throw new Error(`Scout aborted after ${llmFatalFailureCount}/${llmAttemptCount} fatal LLM failures. Example: ${fatalFailureMessages[0]}`);
  }

  if (llmAttemptCount > 0 && llmFailureCount === llmAttemptCount && extracted.length === 0) {
    throw new Error('Scout aborted because every LLM extraction attempt failed and no opportunities were produced.');
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
      existing.sources.push(...idea.sources);
      existing.evidence.push(...idea.evidence);
      existing.sourceTypeCount = new Set(existing.sources.map(source => source.platform)).size;
      existing.canonicalTags = [...new Set([...(existing.canonicalTags ?? []), ...(idea.canonicalTags ?? [])])];
      existing.sourceLaneCount = new Set((existing.canonicalTags ?? []).filter(tag => tag.includes('_'))).size;

      if (idea.opportunityConfidence === 'high' || existing.opportunityConfidence === 'high') {
        existing.opportunityConfidence = 'high';
      } else if (idea.opportunityConfidence === 'medium' || existing.opportunityConfidence === 'medium') {
        existing.opportunityConfidence = 'medium';
      }

      if (idea.evidenceConfidence === 'high' || existing.evidenceConfidence === 'high') {
        existing.evidenceConfidence = 'high';
      } else if (idea.evidenceConfidence === 'medium' || existing.evidenceConfidence === 'medium') {
        existing.evidenceConfidence = 'medium';
      }

      if (existing.signalCount >= 3 && existing.opportunityConfidence !== 'low') existing.confidence = 'high';
      else if (existing.signalCount >= 2 && existing.opportunityConfidence !== 'low' && existing.evidenceConfidence !== 'low') existing.confidence = 'medium';
    } else {
      clusters.set(key, idea);
    }
  }

  // Stage 4: Promote PROMOTE + WATCH — both are worth storing
  const promoted = [...clusters.values()].filter(idea => idea.confidence !== 'low' && (idea.opportunityConfidence === 'high' || idea.signalCount >= 2));

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
      opportunity_confidence: idea.opportunityConfidence ?? idea.confidence,
      evidence_confidence: idea.evidenceConfidence ?? idea.confidence,
      why_now: idea.whyNow,
      founder_fit_score: idea.founderFitScore,
      signal_count: idea.signalCount,
      source_type_count: idea.sourceTypeCount ?? 1,
      source_lane_count: idea.sourceLaneCount ?? 1,
      source_cluster: idea.sourceCluster,
      summary: idea.summary,
      evidence: idea.evidence,
      sources: idea.sources,
      keywords: idea.keywords,
      tags: idea.tags,
      canonical_tags: idea.canonicalTags ?? [],
      asset_type_hint: idea.assetTypeHint,
    });
    written++;
  }

  logger.info(AGENT, `Scout complete — ${written} new ideas written to DB`);
  return promoted;
}

function isFatalLLMFailure(message: string): boolean {
  return /GITHUB_TOKEN not set|GitHub Models API error 401|GitHub Models API error 403|GitHub Models API error 429|GitHub Models API error 5\d\d|OPENAI_API_KEY not set|fetch failed|ECONNRESET|ENOTFOUND|ETIMEDOUT/i.test(message);
}

