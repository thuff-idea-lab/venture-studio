import axios from 'axios';
import { logger } from '../../../lib/logger';
import { enrichRawPost } from '../prefilter';
import type { OpportunityBucket, RawPost } from '../types';

interface RedditAccessToken {
  token: string;
  expiresAt: number;
}

interface RedditListingChild {
  data: RedditPostData;
}

interface RedditPostData {
  title: string;
  selftext?: string;
  url?: string;
  permalink: string;
  subreddit_name_prefixed: string;
  score: number;
  num_comments: number;
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

const REDDIT_HOSTS = [
  'https://www.reddit.com',
  'https://old.reddit.com',
];

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

const TARGET_BUCKET_RESULTS: Record<OpportunityBucket, number> = {
  workflow: 18,
  buying: 20,
  discovery: 16,
  creator: 14,
};

const MIN_BUCKET_RESULTS: Record<OpportunityBucket, number> = {
  workflow: 8,
  buying: 10,
  discovery: 8,
  creator: 8,
};

const FALLBACK_BUCKET_PATTERNS: Record<OpportunityBucket, RegExp[]> = {
  workflow: [
    /manual|manually|spreadsheet|follow up|workflow|takes too long|automate|tedious|time-consuming/i,
    /how do you handle|what do you use for|better way to|tool for/i,
  ],
  buying: [
    /compare|comparison|vs\.?\b|which one|best for|worth it|alternative|cost|price|calculator|estimator/i,
    /for beginners|for my home|for small space|for large yard/i,
  ],
  discovery: [
    /directory|database|registry|lookup|finder|where can i find|search by zip|licensed in my area/i,
    /provider|providers|compare providers|list of|official registry|public records/i,
  ],
  creator: [
    /listing|title|titles|description|descriptions|keyword|keywords|caption|captions|thumbnail/i,
    /repurpose|content|etsy|youtube|organize content|product listing/i,
  ],
};

const REQUEST_DELAY_MS = 250;
const REDDIT_TOKEN_REFRESH_BUFFER_MS = 60_000;
const QUERY_STOP_WORDS = new Set([
  'i',
  'a',
  'an',
  'the',
  'for',
  'how',
  'what',
  'when',
  'where',
  'which',
  'who',
  'does',
  'do',
  'you',
  'your',
  'with',
  'this',
  'that',
  'there',
  'tool',
  'best',
  'need',
  'worth',
  'list',
]);

let redditAccessToken: RedditAccessToken | null = null;

function hashSeed(value: string): number {
  let hash = 0;

  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function getSelectionSeed(): string {
  const explicitSeed = process.env.SCOUT_SELECTION_SEED?.trim();
  if (explicitSeed) return explicitSeed;

  return new Date().toISOString().slice(0, 10);
}

function stableSample<T>(items: T[], count: number, seedKey: string): T[] {
  if (items.length <= count) return [...items];

  const ordered = [...items];
  const offset = hashSeed(seedKey) % ordered.length;
  const rotated = ordered.slice(offset).concat(ordered.slice(0, offset));
  return rotated.slice(0, count);
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

function getRedditUserAgent(): string {
  return process.env.REDDIT_USER_AGENT?.trim()
    || 'venture-studio/0.1 by thuff-idea-lab';
}

function hasAuthenticatedRedditConfig(): boolean {
  return Boolean(process.env.REDDIT_CLIENT_ID?.trim() && process.env.REDDIT_SECRET?.trim());
}

async function getRedditAccessToken(): Promise<string | null> {
  if (!hasAuthenticatedRedditConfig()) {
    return null;
  }

  const now = Date.now();
  if (redditAccessToken && redditAccessToken.expiresAt > now + REDDIT_TOKEN_REFRESH_BUFFER_MS) {
    return redditAccessToken.token;
  }

  const clientId = process.env.REDDIT_CLIENT_ID!.trim();
  const clientSecret = process.env.REDDIT_SECRET!.trim();
  const body = new URLSearchParams({ grant_type: 'client_credentials' });

  const response = await axios.post<{ access_token: string; expires_in: number }>(
    'https://www.reddit.com/api/v1/access_token',
    body.toString(),
    {
      auth: {
        username: clientId,
        password: clientSecret,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': getRedditUserAgent(),
      },
      timeout: 10000,
    }
  );

  redditAccessToken = {
    token: response.data.access_token,
    expiresAt: now + (response.data.expires_in * 1000),
  };

  return redditAccessToken.token;
}

async function fetchRedditChildren(path: string): Promise<RedditListingChild[]> {
  let lastError: string | null = null;

  const accessToken = await getRedditAccessToken();

  if (accessToken) {
    try {
      const response = await axios.get<{ data?: { children?: RedditListingChild[] } }>(`https://oauth.reddit.com${path}`, {
        headers: {
          Accept: 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': getRedditUserAgent(),
        },
        timeout: 10000,
      });

      return response.data?.data?.children ?? [];
    } catch (err: any) {
      lastError = err?.message ?? String(err);
      logger.warn('scout', `Authenticated Reddit request failed for ${path}: ${lastError}`);
    }
  }

  for (const host of REDDIT_HOSTS) {
    const url = `${host}${path}`;

    try {
      const response = await axios.get<{ data?: { children?: RedditListingChild[] } }>(url, {
        headers: FETCH_HEADERS,
        timeout: 10000,
      });

      return response.data?.data?.children ?? [];
    } catch (err: any) {
      lastError = err?.message ?? String(err);
    }
  }

  throw new Error(lastError ?? `Reddit request failed for ${path}`);
}

async function searchReddit(subreddit: string, query: string): Promise<RedditPostData[]> {
  const children = await fetchRedditChildren(
    `/${subreddit}/search.json?q=${encodeURIComponent(query)}&sort=new&restrict_sr=1&limit=20&t=year&raw_json=1`
  );
  return children.map(child => child.data);
}

async function fetchSubredditListing(subreddit: string): Promise<RedditPostData[]> {
  const topChildren = await fetchRedditChildren(`/${subreddit}/top.json?limit=30&t=year&raw_json=1`);
  const recentChildren = await fetchRedditChildren(`/${subreddit}/new.json?limit=20&raw_json=1`);
  return [...topChildren, ...recentChildren].map(child => child.data);
}

function buildEnrichedPost(bucket: OpportunityBucket, item: RedditPostData): RawPost | null {
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
  return stableSample(
    QUERY_BUCKETS[bucket],
    QUERY_SAMPLE_COUNT[bucket],
    `${getSelectionSeed()}:queries:${bucket}`
  );
}

function pickBalancedSubreddits(bucket: OpportunityBucket): string[] {
  return stableSample(
    SUBREDDIT_BUCKETS[bucket],
    SUBREDDIT_SAMPLE_COUNT[bucket],
    `${getSelectionSeed()}:subreddits:${bucket}`
  );
}

function matchesFallbackPattern(bucket: OpportunityBucket, item: RedditPostData): boolean {
  const text = `${item.title ?? ''} ${item.selftext ?? ''}`;
  return FALLBACK_BUCKET_PATTERNS[bucket].some(pattern => pattern.test(text));
}

function getQueryKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length >= 4 && !QUERY_STOP_WORDS.has(token));
}

function isRelevantSearchHit(bucket: OpportunityBucket, query: string, item: RedditPostData): boolean {
  const text = `${item.title ?? ''} ${item.selftext ?? ''}`.toLowerCase();

  if (matchesFallbackPattern(bucket, item)) {
    return true;
  }

  const queryKeywords = getQueryKeywords(query);
  if (queryKeywords.length === 0) {
    return false;
  }

  const matchedKeywords = queryKeywords.filter(keyword => text.includes(keyword)).length;
  return matchedKeywords >= Math.min(2, queryKeywords.length);
}

function pushUniquePost(posts: RawPost[], seen: Set<string>, candidate: RawPost | null): boolean {
  if (!candidate) return false;
  if (seen.has(candidate.url)) return false;

  seen.add(candidate.url);
  posts.push(candidate);
  return true;
}

async function backfillBucketFromListings(
  bucket: OpportunityBucket,
  posts: RawPost[],
  seen: Set<string>
): Promise<number> {
  let added = 0;

  for (const subreddit of pickBalancedSubreddits(bucket)) {
    try {
      const listing = await fetchSubredditListing(subreddit);

      for (const item of listing) {
        if (!item.title || !item.permalink) continue;
        if (!matchesFallbackPattern(bucket, item)) continue;

        const enriched = buildEnrichedPost(bucket, item);
        if (pushUniquePost(posts, seen, enriched)) {
          added += 1;
        }

        if (added >= MIN_BUCKET_RESULTS[bucket]) {
          return added;
        }
      }
    } catch (err: any) {
      logger.warn('scout', `Reddit listing fallback failed [${bucket} | ${subreddit}]: ${err?.message ?? err}`);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  return added;
}

export async function fetchRedditIntentSearch(): Promise<RawPost[]> {
  const posts: RawPost[] = [];
  const seen = new Set<string>();
  const bucketPlan: OpportunityBucket[] = ['workflow', 'buying', 'discovery', 'creator'];
  const bucketCounts: Record<OpportunityBucket, number> = {
    workflow: 0,
    buying: 0,
    discovery: 0,
    creator: 0,
  };

  for (const bucket of bucketPlan) {
    const queries = pickBalancedQueries(bucket);
    const subreddits = pickBalancedSubreddits(bucket);

    for (const subreddit of subreddits) {
      for (const query of queries) {
        try {
          const children = await searchReddit(subreddit, query);

          for (const item of children) {
            if (!item.title || !item.permalink) continue;
            if (!isRelevantSearchHit(bucket, query, item)) continue;

            const enriched = buildEnrichedPost(bucket, item);
            if (pushUniquePost(posts, seen, enriched)) {
              bucketCounts[bucket] += 1;
            }

            if (bucketCounts[bucket] >= TARGET_BUCKET_RESULTS[bucket]) {
              break;
            }
          }
        } catch (err: any) {
          logger.warn('scout', `Reddit search failed [${bucket} | ${subreddit} | "${query}"]: ${err?.message ?? err}`);
        }

        if (bucketCounts[bucket] >= TARGET_BUCKET_RESULTS[bucket]) {
          break;
        }

        await sleep(REQUEST_DELAY_MS);
      }

      if (bucketCounts[bucket] >= TARGET_BUCKET_RESULTS[bucket]) {
        break;
      }
    }

    if (bucketCounts[bucket] < MIN_BUCKET_RESULTS[bucket]) {
      const beforeFallback = bucketCounts[bucket];
      const fallbackAdded = await backfillBucketFromListings(bucket, posts, seen);
      bucketCounts[bucket] += fallbackAdded;
      logger.info('scout', `Reddit fallback listing fill [${bucket}]: ${beforeFallback} -> ${bucketCounts[bucket]}`);
    }
  }

  if (posts.length === 0 && !hasAuthenticatedRedditConfig()) {
    logger.warn('scout', 'Reddit returned zero posts and no authenticated Reddit credentials are configured. Set REDDIT_CLIENT_ID and REDDIT_SECRET for CI.');
  }

  posts.sort((a, b) => (b.metadata?.prefilterScore ?? 0) - (a.metadata?.prefilterScore ?? 0));

  logger.info(
    'scout',
    `Reddit intent search: ${posts.length} filtered posts across balanced opportunity buckets`
  );
  logger.info('scout', 'Reddit bucket counts', bucketCounts);

  return posts;
}
