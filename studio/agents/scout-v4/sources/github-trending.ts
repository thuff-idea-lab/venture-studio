import axios from 'axios';
import { logger } from '../../../lib/logger';
import type { RawSignal, StrategyName } from '../types';

const TOPICS = ['tool', 'cli', 'utility', 'automation', 'saas', 'self-hosted'];

/**
 * Fetch trending repositories from GitHub matching our criteria.
 * Uses GitHub Search API. Authenticated requests get 30 req/min, unauthenticated 10 req/min.
 */
export async function fetchTrendingRepos(params: {
  topics?: string[];
  minStars?: number;
  maxStars?: number;
  createdAfter?: string;
  strategy: StrategyName;
}): Promise<RawSignal[]> {
  const {
    topics = TOPICS,
    minStars = 50,
    maxStars = 5000,
    createdAfter = getThreeMonthsAgo(),
    strategy,
  } = params;

  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'scout-v4/1.0',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const signals: RawSignal[] = [];

  // Query a few topic groups to stay within rate limits
  const topicGroups = [
    topics.slice(0, 3).join('+topic:'),
    topics.slice(3).join('+topic:'),
  ].filter(Boolean);

  for (const topicQuery of topicGroups) {
    try {
      const q = `topic:${topicQuery}+stars:${minStars}..${maxStars}+created:>${createdAfter}`;
      const res = await axios.get('https://api.github.com/search/repositories', {
        params: { q, sort: 'stars', order: 'desc', per_page: 30 },
        headers,
        timeout: 15000,
      });

      const items: any[] = res.data.items ?? [];
      for (const repo of items) {
        signals.push({
          title: repo.full_name ?? repo.name,
          body: (repo.description ?? '').slice(0, 500),
          url: repo.html_url,
          platform: 'github',
          strategy,
          metadata: {
            stars: repo.stargazers_count,
            language: repo.language,
            topics: repo.topics,
            created_at: repo.created_at,
          },
        });
      }
    } catch (err: any) {
      logger.warn('scout-v4', `GitHub trending search failed: ${err.message}`);
    }
  }

  return signals;
}

function getThreeMonthsAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().slice(0, 10);
}
