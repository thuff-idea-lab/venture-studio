import { getRelatedQueries, trendsDelay } from '../sources/google-trends';
import { checkSERP } from '../sources/serp';
import { searchReddit } from '../sources/reddit';
import { logger } from '../../../lib/logger';
import type { RawSignal, StrategyName } from '../types';

const STRATEGY: StrategyName = 'trend_surfing';

const TREND_SEEDS: string[] = [
  'small business software',
  'freelancer tools',
  'side hustle',
  'content creation tools',
  'ecommerce tools',
  'personal finance app',
  'productivity app',
  'AI tool for',
  'automation for',
  'no code',
];

function pickSubset<T>(items: T[], count: number, dayOfYear: number): T[] {
  const offset = dayOfYear % items.length;
  const result: T[] = [];
  for (let i = 0; i < count && i < items.length; i++) {
    result.push(items[(offset + i) % items.length]);
  }
  return result;
}

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

const SIGNAL_CAP = 15;

export async function runTrendSurfing(): Promise<RawSignal[]> {
  logger.info('scout-v4', 'Running trend-surfing strategy');
  const dayOfYear = getDayOfYear();
  const signals: RawSignal[] = [];

  // Pick 4-6 trend seeds
  const seeds = pickSubset(TREND_SEEDS, 5, dayOfYear);

  // Collect rising queries from Google Trends
  const risingQueries: { query: string; value: string; seed: string }[] = [];

  for (const seed of seeds) {
    try {
      const related = await getRelatedQueries(seed);
      await trendsDelay();

      for (const rising of related.rising.slice(0, 5)) {
        risingQueries.push({ query: rising.query, value: rising.value, seed });
      }
    } catch (err: any) {
      logger.warn('scout-v4', `Trends query failed for "${seed}": ${err.message}`);
    }
  }

  logger.info('scout-v4', `Found ${risingQueries.length} rising queries from ${seeds.length} seeds`);

  // For each rising query, check SERP for gaps
  let serpChecks = 0;
  const maxSerpChecks = 8;

  for (const rising of risingQueries.slice(0, 15)) {
    if (signals.length >= SIGNAL_CAP) break;

    let competitionLevel = 'UNKNOWN';
    if (serpChecks < maxSerpChecks) {
      try {
        const serp = await checkSERP(rising.query);
        serpChecks++;
        competitionLevel = serp.competition_level;

        // Skip if strong competition already exists
        if (serp.competition_level === 'STRONG') continue;
      } catch {
        // SERP failed — continue without competition data
      }
    }

    // Cross-reference with Reddit for pain signal
    let redditSignals: RawSignal[] = [];
    try {
      redditSignals = await searchReddit({
        query: rising.query,
        sort: 'new',
        time: 'month',
        limit: 5,
        strategy: STRATEGY,
      });
    } catch {
      // Reddit cross-ref failed — still valid signal
    }

    const hasRedditActivity = redditSignals.length > 0;

    signals.push({
      title: rising.query,
      body: `Rising trend (${rising.value}) from seed "${rising.seed}". ${
        hasRedditActivity
          ? `Found ${redditSignals.length} related Reddit posts.`
          : 'No Reddit activity yet — early stage.'
      }`,
      url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(rising.query)}`,
      platform: 'google_trends',
      strategy: STRATEGY,
      metadata: {
        trendValue: rising.value,
        seed: rising.seed,
        competition: competitionLevel,
        redditPosts: redditSignals.length,
      },
    });
  }

  logger.info('scout-v4', `Trend surfing: ${signals.length} signals, ${serpChecks} SERP checks used`);
  return signals.slice(0, SIGNAL_CAP);
}
