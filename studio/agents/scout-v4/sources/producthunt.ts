import RssParser from 'rss-parser';
import { logger } from '../../../lib/logger';
import type { RawSignal, StrategyName } from '../types';

const parser = new RssParser();

/**
 * Fetch latest Product Hunt launches via RSS.
 */
export async function fetchProductHuntLaunches(
  strategy: StrategyName
): Promise<RawSignal[]> {
  try {
    const feed = await parser.parseURL('https://www.producthunt.com/feed');
    const items = feed.items.slice(0, 30);

    return items.map(item => ({
      title: item.title ?? 'Untitled',
      body: item.contentSnippet?.slice(0, 500) ?? item.content?.slice(0, 500),
      url: item.link ?? '',
      platform: 'producthunt',
      strategy,
      metadata: {
        pubDate: item.pubDate,
      },
    }));
  } catch (err: any) {
    logger.warn('scout-v4', `Product Hunt RSS failed: ${err.message}`);
    return [];
  }
}
