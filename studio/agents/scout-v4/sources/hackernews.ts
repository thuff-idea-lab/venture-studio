import axios from 'axios';
import { logger } from '../../../lib/logger';
import type { RawSignal, StrategyName } from '../types';

interface HNHit {
  title: string;
  url?: string;
  story_text?: string;
  objectID: string;
  points: number;
  num_comments: number;
}

/**
 * Search Hacker News via the Algolia API.
 */
export async function searchHN(params: {
  query: string;
  tags?: string;
  numericFilters?: string;
  hitsPerPage?: number;
  strategy: StrategyName;
}): Promise<RawSignal[]> {
  const { query, tags, numericFilters, hitsPerPage = 20, strategy } = params;

  try {
    const searchParams: Record<string, string> = {
      query,
      hitsPerPage: String(hitsPerPage),
    };
    if (tags) searchParams.tags = tags;
    if (numericFilters) searchParams.numericFilters = numericFilters;

    const res = await axios.get('https://hn.algolia.com/api/v1/search', {
      params: searchParams,
      timeout: 10000,
    });

    const hits: HNHit[] = res.data.hits ?? [];

    return hits
      .filter(h => h.points >= 3)
      .map(h => ({
        title: h.title,
        body: h.story_text ? h.story_text.slice(0, 800) : undefined,
        url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        platform: 'hackernews',
        strategy,
        metadata: {
          points: h.points,
          comments: h.num_comments,
          hnId: h.objectID,
        },
      }));
  } catch (err: any) {
    logger.warn('scout-v4', `HN search failed for "${query}": ${err.message}`);

    // Fallback to Firebase API for Ask HN
    if (tags?.includes('ask_hn')) {
      return fetchAskHNFallback(strategy);
    }
    return [];
  }
}

async function fetchAskHNFallback(strategy: StrategyName): Promise<RawSignal[]> {
  try {
    const res = await axios.get(
      'https://hacker-news.firebaseio.com/v0/askstories.json',
      { timeout: 10000 }
    );
    const ids: number[] = (res.data ?? []).slice(0, 20);

    const signals: RawSignal[] = [];
    for (const id of ids.slice(0, 10)) {
      try {
        const item = await axios.get(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
          { timeout: 5000 }
        );
        if (item.data && item.data.score >= 3) {
          signals.push({
            title: item.data.title ?? '',
            body: item.data.text ? item.data.text.slice(0, 800) : undefined,
            url: `https://news.ycombinator.com/item?id=${id}`,
            platform: 'hackernews',
            strategy,
            metadata: { points: item.data.score, comments: item.data.descendants ?? 0 },
          });
        }
      } catch { /* skip individual item failures */ }
    }
    return signals;
  } catch (err: any) {
    logger.warn('scout-v4', `HN Firebase fallback failed: ${err.message}`);
    return [];
  }
}
