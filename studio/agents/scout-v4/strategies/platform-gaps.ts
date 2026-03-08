import { searchReddit } from '../sources/reddit';
import { logger } from '../../../lib/logger';
import type { RawSignal, StrategyName } from '../types';

const STRATEGY: StrategyName = 'platform_gaps';

const PLATFORM_SUBREDDITS: string[] = [
  // Ecommerce platforms
  'r/Shopify', 'r/BigCommerce', 'r/WooCommerce',
  // Website builders
  'r/squarespace', 'r/wix', 'r/webflow', 'r/wordpress',
  // Productivity/ops
  'r/Notion', 'r/airtable', 'r/clickup', 'r/asana',
  // Finance
  'r/quickbooks', 'r/xero', 'r/waveapps',
  // Payments
  'r/stripe',
  // Email/marketing
  'r/mailchimp', 'r/convertkit',
  // Design
  'r/canva', 'r/figma',
  // Social
  'r/Instagram', 'r/TikTokHelp',
];

const PLATFORM_GAP_QUERIES: string[] = [
  'workaround for',
  'how do I',
  'plugin for',
  'does anyone know how to',
  "I can't believe it doesn't",
  'is there an app that',
  'integration for',
  'I need a way to',
  'feature request',
  'missing feature',
  "why can't I",
  'alternative because',
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

const SIGNAL_CAP = 20;

export async function runPlatformGaps(): Promise<RawSignal[]> {
  logger.info('scout-v4', 'Running platform-gaps strategy');
  const dayOfYear = getDayOfYear();
  const signals: RawSignal[] = [];

  // Pick 5-8 platform subreddits and 4-6 queries
  const subreddits = pickSubset(PLATFORM_SUBREDDITS, 6, dayOfYear);
  const queries = pickSubset(PLATFORM_GAP_QUERIES, 5, dayOfYear + 11);

  for (const sub of subreddits) {
    if (signals.length >= SIGNAL_CAP) break;
    for (const query of queries) {
      if (signals.length >= SIGNAL_CAP) break;
      try {
        const results = await searchReddit({
          query,
          subreddit: sub,
          sort: 'top',
          time: 'year',
          limit: 10,
          strategy: STRATEGY,
        });
        signals.push(...results);
      } catch (err: any) {
        logger.warn('scout-v4', `Platform gaps search failed (${sub}): ${err.message}`);
      }
    }
  }

  logger.info('scout-v4', `Platform gaps: ${signals.length} signals collected`);
  return signals.slice(0, SIGNAL_CAP);
}
