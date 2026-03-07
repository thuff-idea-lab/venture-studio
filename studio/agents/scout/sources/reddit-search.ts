import axios from 'axios';
import { logger } from '../../../lib/logger';
import { enrichRawPost } from '../prefilter';
import type { OpportunityBucket, RawPost } from '../types';

interface RedditSearchItem {
  data: {
    title: string;
    selftext: string;
    url: string;
    permalink: string;
    subreddit_name_prefixed: string;
    score: number;
    num_comments: number;
  };
}

const QUERY_BUCKETS: Record<OpportunityBucket, string[]> = {
  workflow: [
    'I wish there was a tool for',
    'how do you handle',
    'what do you use for',
    'takes too long',
    'I do this manually',
    'looking for a better way to',
    'is there a tool for',
    'need to automate',
  ],
  buying: [
    'which one should I buy',
    'best for my situation',
    'what do I need for',
    'worth it',
    'comparison',
    'vs',
    'for beginners',
    'for small space',
    'for large yard',
    'for my home',
    'how much does it cost',
    'calculator',
    'estimator',
  ],
  discovery: [
    'how do I find',
    'where can I find',
    'directory',
    'database',
    'list of',
    'public records',
    'official registry',
    'search by zip',
    'compare providers',
    'licensed in my area',
  ],
  creator: [
    'writing descriptions takes forever',
    'how do you make titles',
    'how do you come up with keywords',
    'how do you organize content',
    'how do you repurpose',
    'how long does it take you to',
    'I hate doing captions',
    'I still do this manually',
  ],
};

const SUBREDDIT_BUCKETS: Record<OpportunityBucket, string[]> = {
  workflow: [
    'r/entrepreneur',
    'r/smallbusiness',
    'r/freelance',
    'r/microsaas',
    'r/consulting',
  ],
  buying: [
    'r/BuyItForLife',
    'r/HomeImprovement',
    'r/Tools',
    'r/Appliances',
    'r/lawncare',
    'r/robotmowers',
  ],
  discovery: [
    'r/RealEstate',
    'r/realestateinvesting',
    'r/Parents',
    'r/Homeowners',
    'r/smallbusiness',
  ],
  creator: [
    'r/EtsySellers',
    'r/youtubers',
    'r/ecommerce',
    'r/Flipping',
    'r/printondemand',
  ],
};

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

const QUERY_SAMPLE_COUNT: Record<OpportunityBucket, number> = {
  workflow: 3,
  buying: 5,
  discovery: 4,
  creator: 4,
};

const SUBREDDIT_SAMPLE_COUNT: Record<OpportunityBucket, number> = {
  workflow: 3,
  buying: 5,
  discovery: 4,
  creator: 4,
};

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

async function searchReddit(subreddit: string, query: string): Promise<RedditSearchItem[]> {
  const url = `https://www.reddit.com/${subreddit}/search.json?q=${encodeURIComponent(query)}&sort=new&restrict_sr=1&limit=20&t=year`;
  const response = await axios.get<{ data: { children: RedditSearchItem[] } }>(url, {
    headers: FETCH_HEADERS,
    timeout: 10000,
  });
  return response.data?.data?.children ?? [];
}

function buildEnrichedPost(bucket: OpportunityBucket, item: RedditSearchItem['data']): RawPost | null {
  return enrichRawPost(
    {
      title: item.title ?? '',
      body: item.selftext ? item.selftext.slice(0, 500) : undefined,
      url: `https://www.reddit.com${item.permalink}`,
      platform: item.subreddit_name_prefixed,
      points: item.score,
      comments: item.num_comments,
    },
    {
      bucket,
      sourceLane:
        bucket === 'buying'
          ? 'buying_confusion'
          : bucket === 'discovery'
            ? 'discovery_data_gaps'
            : 'pain_communities',
      sourceName: 'reddit_intent_search',
      sourcePriority: 'primary',
    }
  );
}

function pickBalancedQueries(bucket: OpportunityBucket): string[] {
  return shuffle(QUERY_BUCKETS[bucket]).slice(0, QUERY_SAMPLE_COUNT[bucket]);
}

function pickBalancedSubreddits(bucket: OpportunityBucket): string[] {
  return shuffle(SUBREDDIT_BUCKETS[bucket]).slice(0, SUBREDDIT_SAMPLE_COUNT[bucket]);
}

export async function fetchRedditIntentSearch(): Promise<RawPost[]> {
  const posts: RawPost[] = [];
  const seen = new Set<string>();
  const bucketPlan: OpportunityBucket[] = ['workflow', 'buying', 'discovery', 'creator'];

  for (const bucket of bucketPlan) {
    const queries = pickBalancedQueries(bucket);
    const subreddits = pickBalancedSubreddits(bucket);

    for (const subreddit of subreddits) {
      for (const query of queries) {
        try {
          const children = await searchReddit(subreddit, query);

          for (const child of children) {
            const item = child.data;
            if (!item.title || !item.permalink) continue;

            const postUrl = `https://www.reddit.com${item.permalink}`;
            if (seen.has(postUrl)) continue;

            const enriched = buildEnrichedPost(bucket, item);
            if (!enriched) continue;

            seen.add(postUrl);
            posts.push(enriched);
          }
        } catch (err: any) {
          logger.warn('scout', `Reddit search failed [${bucket} | ${subreddit} | "${query}"]: ${err?.message ?? err}`);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  posts.sort((a, b) => (b.metadata?.prefilterScore ?? 0) - (a.metadata?.prefilterScore ?? 0));

  logger.info(
    'scout',
    `Reddit intent search: ${posts.length} filtered posts across balanced opportunity buckets`
  );

  return posts;
}
