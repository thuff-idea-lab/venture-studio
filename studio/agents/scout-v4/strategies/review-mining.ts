import { fetchLowRatedExtensions, CWS_CATEGORIES } from '../sources/chrome-web-store';
import { searchReddit } from '../sources/reddit';
import { logger } from '../../../lib/logger';
import type { RawSignal, StrategyName } from '../types';

const STRATEGY: StrategyName = 'review_mining';

const REVIEW_REDDIT_QUERIES: string[] = [
  'cancelled my subscription to',
  'looking for alternative to',
  'sucks',
  'frustrated with',
  'overpriced',
  'too complicated',
  'too bloated',
  'I just want a simple',
  'why is so expensive',
  'free alternative to',
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

export async function runReviewMining(): Promise<RawSignal[]> {
  logger.info('scout-v4', 'Running review-mining strategy');
  const dayOfYear = getDayOfYear();
  const signals: RawSignal[] = [];

  // 1. Chrome Web Store — low-rated extensions
  try {
    const categories = pickSubset(CWS_CATEGORIES, 3, dayOfYear + 5);
    const cwsSignals = await fetchLowRatedExtensions(categories, STRATEGY);
    signals.push(...cwsSignals.slice(0, 10));
  } catch (err: any) {
    logger.warn('scout-v4', `Review mining CWS failed: ${err.message}`);
  }

  // 2. Reddit — frustration/alternative queries (broad search, no specific subreddit)
  const queries = pickSubset(REVIEW_REDDIT_QUERIES, 5, dayOfYear);

  for (const query of queries) {
    if (signals.length >= SIGNAL_CAP) break;
    try {
      const results = await searchReddit({
        query,
        sort: 'new',
        time: 'year',
        limit: 10,
        strategy: STRATEGY,
      });
      signals.push(...results);
    } catch (err: any) {
      logger.warn('scout-v4', `Review mining Reddit search failed: ${err.message}`);
    }
  }

  logger.info('scout-v4', `Review mining: ${signals.length} signals collected`);
  return signals.slice(0, SIGNAL_CAP);
}
