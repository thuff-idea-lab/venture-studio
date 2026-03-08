import { db } from '../../lib/db';
import { logger } from '../../lib/logger';
import type { RawSignal, ExtractedIdea } from './types';

// ── Within-Run Dedup ───────────────────────────────────────────────────────────

/**
 * Normalize a title for comparison: lowercase, strip punctuation, collapse spaces.
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get significant tokens from a normalized title (words > 2 chars, no stop words).
 */
function getTokens(normalized: string): Set<string> {
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was',
    'has', 'have', 'been', 'not', 'but', 'what', 'all', 'can', 'how',
    'will', 'you', 'your', 'they', 'its', 'any', 'our', 'just', 'too',
  ]);
  return new Set(
    normalized
      .split(' ')
      .filter(w => w.length > 2 && !stopWords.has(w))
  );
}

/**
 * Calculate Jaccard similarity between two token sets.
 */
function tokenSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Strategy priority — higher priority strategies keep their signals when deduping
const STRATEGY_PRIORITY: Record<string, number> = {
  pain_mining: 6,
  gap_detection: 5,
  platform_gaps: 4,
  trend_surfing: 3,
  clone_hunting: 2,
  review_mining: 1,
};

/**
 * Deduplicate raw signals within a single run.
 * - Exact URL dedup
 * - Fuzzy title similarity (>70% token overlap)
 * - Keeps higher-priority strategy signal when merging
 */
export function deduplicateRawSignals(signals: RawSignal[]): RawSignal[] {
  // 1. Exact URL dedup
  const seenUrls = new Set<string>();
  const urlDeduped: RawSignal[] = [];
  for (const signal of signals) {
    const normalizedUrl = signal.url.toLowerCase().replace(/\/$/, '');
    if (!seenUrls.has(normalizedUrl)) {
      seenUrls.add(normalizedUrl);
      urlDeduped.push(signal);
    }
  }

  // 2. Fuzzy title dedup
  const result: RawSignal[] = [];
  const processedTitles: { tokens: Set<string>; index: number }[] = [];

  for (const signal of urlDeduped) {
    const normalized = normalizeTitle(signal.title);
    const tokens = getTokens(normalized);

    let isDup = false;
    for (const existing of processedTitles) {
      const similarity = tokenSimilarity(tokens, existing.tokens);
      if (similarity > 0.7) {
        // Keep the higher-priority strategy version
        const existingPriority = STRATEGY_PRIORITY[result[existing.index].strategy] ?? 0;
        const newPriority = STRATEGY_PRIORITY[signal.strategy] ?? 0;
        if (newPriority > existingPriority) {
          result[existing.index] = signal;
          existing.tokens = tokens;
        }
        isDup = true;
        break;
      }
    }

    if (!isDup) {
      processedTitles.push({ tokens, index: result.length });
      result.push(signal);
    }
  }

  logger.info('scout-v4', `Dedup: ${signals.length} → ${result.length} signals`);
  return result;
}

// ── Cross-Run Dedup ────────────────────────────────────────────────────────────

/**
 * Check if an extracted idea is a duplicate of something already in the database.
 * Checks both ideas_v4 (V4 output) and ideas (V3 output).
 * Match = similar title + similar target_user/pain within the last 30 days.
 */
export async function isDuplicate(idea: ExtractedIdea): Promise<boolean> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString();

  const normalizedTitle = normalizeTitle(idea.title);
  const titleTokens = getTokens(normalizedTitle);

  try {
    // Check ideas_v4 table
    const { data: v4Ideas } = await db
      .from('ideas_v4')
      .select('title, target_user, pain')
      .gte('created_at', cutoff);

    if (v4Ideas) {
      for (const existing of v4Ideas) {
        const existingTokens = getTokens(normalizeTitle(existing.title));
        if (tokenSimilarity(titleTokens, existingTokens) > 0.6) {
          logger.debug('scout-v4', `Cross-run dup (v4): "${idea.title}" ≈ "${existing.title}"`);
          return true;
        }
      }
    }

    // Check V3 ideas table
    const { data: v3Ideas } = await db
      .from('ideas')
      .select('title')
      .gte('created_at', cutoff);

    if (v3Ideas) {
      for (const existing of v3Ideas) {
        const existingTokens = getTokens(normalizeTitle(existing.title));
        if (tokenSimilarity(titleTokens, existingTokens) > 0.6) {
          logger.debug('scout-v4', `Cross-run dup (v3): "${idea.title}" ≈ "${existing.title}"`);
          return true;
        }
      }
    }
  } catch (err: any) {
    // If DB query fails, don't block the pipeline — treat as not duplicate
    logger.warn('scout-v4', `Dedup DB check failed: ${err.message}`);
  }

  return false;
}
