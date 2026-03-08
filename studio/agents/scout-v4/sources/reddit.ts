import axios from 'axios';
import { logger } from '../../../lib/logger';
import type { RawSignal, StrategyName } from '../types';

// ── Dual-mode Reddit source ──────────────────────────────────────────────────
// Mode 1: OAuth (if REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET are set)
// Mode 2: Public JSON endpoints (default fallback)

interface RedditAccessToken {
  token: string;
  expiresAt: number;
}

interface RedditListingChild {
  data: {
    title: string;
    selftext?: string;
    permalink: string;
    subreddit_name_prefixed: string;
    score: number;
    num_comments: number;
    stickied?: boolean;
    link_flair_text?: string;
  };
}

const REDDIT_HOSTS = [
  'https://www.reddit.com',
];

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

const OAUTH_DELAY_MS = 1000;
const PUBLIC_DELAY_MS = 1800;
const THROTTLE_PAUSE_MS = 60000;
const RETRY_WAIT_MS = 10000;

let accessToken: RedditAccessToken | null = null;
let consecutiveFailures = 0;
let hostIndex = 0;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function hasOAuthConfig(): boolean {
  return Boolean(
    process.env.REDDIT_CLIENT_ID?.trim() &&
    process.env.REDDIT_CLIENT_SECRET?.trim()
  );
}

async function getOAuthToken(): Promise<string | null> {
  if (!hasOAuthConfig()) return null;

  const now = Date.now();
  if (accessToken && accessToken.expiresAt > now + 60_000) {
    return accessToken.token;
  }

  const clientId = process.env.REDDIT_CLIENT_ID!.trim();
  const clientSecret = process.env.REDDIT_CLIENT_SECRET!.trim();

  const res = await axios.post(
    'https://www.reddit.com/api/v1/access_token',
    new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
    {
      auth: { username: clientId, password: clientSecret },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'scout-v4/1.0',
      },
      timeout: 10000,
    }
  );

  accessToken = {
    token: res.data.access_token,
    expiresAt: now + res.data.expires_in * 1000,
  };

  return accessToken.token;
}

async function fetchRedditListing(path: string): Promise<RedditListingChild[]> {
  // If we've had too many consecutive failures, pause
  if (consecutiveFailures >= 3) {
    logger.warn('scout-v4', `Reddit throttled — pausing ${THROTTLE_PAUSE_MS / 1000}s`);
    await sleep(THROTTLE_PAUSE_MS);
    consecutiveFailures = 0;
  }

  // Try OAuth first
  try {
    const token = await getOAuthToken();
    if (token) {
      const res = await axios.get(`https://oauth.reddit.com${path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'scout-v4/1.0',
          Accept: 'application/json',
        },
        timeout: 10000,
      });
      consecutiveFailures = 0;
      await sleep(OAUTH_DELAY_MS);
      return res.data?.data?.children ?? [];
    }
  } catch (err: any) {
    logger.warn('scout-v4', `OAuth Reddit failed: ${err.message}`);
  }

  // Fallback: public JSON with host rotation
  for (let attempt = 0; attempt < REDDIT_HOSTS.length; attempt++) {
    const host = REDDIT_HOSTS[hostIndex % REDDIT_HOSTS.length];
    hostIndex++;

    try {
      const res = await axios.get(`${host}${path}`, {
        headers: FETCH_HEADERS,
        timeout: 10000,
      });

      // Reddit sometimes returns HTML instead of JSON
      if (typeof res.data === 'string') {
        throw new Error('Got HTML response instead of JSON');
      }

      consecutiveFailures = 0;
      await sleep(PUBLIC_DELAY_MS);
      return res.data?.data?.children ?? [];
    } catch (err: any) {
      consecutiveFailures++;

      // On 429 or HTML, retry once after wait
      if (attempt === 0) {
        logger.warn('scout-v4', `Reddit ${host} failed (${err.message}), retrying in ${RETRY_WAIT_MS / 1000}s`);
        await sleep(RETRY_WAIT_MS);
      }
    }
  }

  logger.warn('scout-v4', `Reddit request failed for ${path} — skipping`);
  return [];
}

function isSpamOrMeta(child: RedditListingChild): boolean {
  const d = child.data;
  if (d.stickied) return true;
  const flair = (d.link_flair_text ?? '').toLowerCase();
  if (/weekly|monthly|megathread|announcement|rules|mod post/i.test(flair)) return true;
  if (/\b(check out my|i made this|download|promo|affiliate)\b/i.test(d.title)) return true;
  return false;
}

function childToSignal(
  child: RedditListingChild,
  strategy: StrategyName
): RawSignal | null {
  const d = child.data;

  // Minimum quality filters
  if (d.score < 2) return null;
  const textLength = (d.title?.length ?? 0) + (d.selftext?.length ?? 0);
  if (textLength < 50) return null;
  if (isSpamOrMeta(child)) return null;

  return {
    title: d.title,
    body: d.selftext ? d.selftext.slice(0, 800) : undefined,
    url: `https://www.reddit.com${d.permalink}`,
    platform: 'reddit',
    strategy,
    metadata: {
      subreddit: d.subreddit_name_prefixed,
      score: d.score,
      comments: d.num_comments,
    },
  };
}

/**
 * Search Reddit for posts matching a query, optionally within a subreddit.
 */
export async function searchReddit(params: {
  query: string;
  subreddit?: string;
  sort?: 'relevance' | 'new' | 'top';
  time?: 'day' | 'week' | 'month' | 'year';
  limit?: number;
  strategy: StrategyName;
}): Promise<RawSignal[]> {
  const { query, subreddit, sort = 'new', time = 'year', limit = 25, strategy } = params;
  const sub = subreddit ? `/${subreddit}` : '';
  const path = `${sub}/search.json?q=${encodeURIComponent(query)}&sort=${sort}&restrict_sr=${subreddit ? '1' : '0'}&limit=${limit}&t=${time}&raw_json=1`;

  const children = await fetchRedditListing(path);
  return children
    .map(c => childToSignal(c, strategy))
    .filter((s): s is RawSignal => s !== null);
}

/**
 * List posts from a subreddit (top + new).
 */
export async function listSubreddit(params: {
  subreddit: string;
  sort?: 'hot' | 'new' | 'top';
  time?: 'day' | 'week' | 'year';
  limit?: number;
  strategy: StrategyName;
}): Promise<RawSignal[]> {
  const { subreddit, sort = 'top', time = 'year', limit = 25, strategy } = params;
  const path = `/${subreddit}/${sort}.json?limit=${limit}&t=${time}&raw_json=1`;

  const children = await fetchRedditListing(path);
  return children
    .map(c => childToSignal(c, strategy))
    .filter((s): s is RawSignal => s !== null);
}
