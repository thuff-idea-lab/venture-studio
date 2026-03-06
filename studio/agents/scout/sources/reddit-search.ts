import axios from 'axios';
import { logger } from '../../../lib/logger';
import type { RawPost } from '../types';

// Pain-signal query patterns — pre-filter for opportunity signal before LLM
const INTENT_QUERIES = [
  'I wish there was a tool for',
  'how do you handle',
  'what do you use for',
  'takes too long',
  'I do this manually',
  'looking for a better way to',
  'is there a tool for',
  'too expensive too complicated',
  'hate using',
  'does anyone know a tool that',
  'how do you track',
  'need to automate',
  'spreadsheet manually',
  'best software for',
  'I do this in a spreadsheet',
];

// High-signal subreddits for business/workflow pain
const SUBREDDITS = [
  'r/entrepreneur',
  'r/smallbusiness',
  'r/freelance',
  'r/SaaS',
  'r/microsaas',
  'r/consulting',
  'r/realestateinvesting',
  'r/ecommerce',
  'r/WorkOnline',
  'r/Bookkeeping',
];

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

// Hard reject patterns — kill clear noise before LLM
const REJECT_PATTERNS = [
  /outage|down for anyone|not working/i,
  /politics|election|government/i,
  /^introducing myself|new (here|member)/i,
  /just venting/i,
];

function isRejected(title: string): boolean {
  return REJECT_PATTERNS.some(p => p.test(title));
}

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

export async function fetchRedditIntentSearch(): Promise<RawPost[]> {
  const posts: RawPost[] = [];
  const seen = new Set<string>(); // deduplicate by URL

  // Sample a subset each run to stay within quota — rotate through all combos over time
  // 5 queries × 5 subreddits = 25 searches, ~5 posts each = ~125 targeted posts
  const querySlice = INTENT_QUERIES.sort(() => Math.random() - 0.5).slice(0, 5);
  const subSlice = SUBREDDITS.sort(() => Math.random() - 0.5).slice(0, 5);

  for (const subreddit of subSlice) {
    for (const query of querySlice) {
      try {
        const url = `https://www.reddit.com/${subreddit}/search.json?q=${encodeURIComponent(query)}&sort=new&restrict_sr=1&limit=10&t=month`;
        const response = await axios.get<{ data: { children: RedditSearchItem[] } }>(
          url,
          { headers: FETCH_HEADERS, timeout: 10000 }
        );

        const children = response.data?.data?.children ?? [];
        for (const child of children) {
          const item = child.data;
          if (!item.title || !item.permalink) continue;
          if (isRejected(item.title)) continue;

          const postUrl = `https://www.reddit.com${item.permalink}`;
          if (seen.has(postUrl)) continue;
          seen.add(postUrl);

          posts.push({
            title: item.title,
            body: item.selftext ? item.selftext.slice(0, 500) : undefined,
            url: postUrl,
            platform: item.subreddit_name_prefixed,
            points: item.score,
          });
        }
      } catch (err: any) {
        logger.warn('scout', `Reddit search failed [${subreddit} / "${query}"]: ${err?.message ?? err}`);
      }

      // Brief pause to avoid Reddit rate limiting
      await new Promise(r => setTimeout(r, 500));
    }
  }

  logger.info('scout', `Reddit intent search: ${posts.length} targeted posts from ${subSlice.length} subreddits × ${querySlice.length} queries`);
  return posts;
}
