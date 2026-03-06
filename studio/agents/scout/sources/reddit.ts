import Parser from 'rss-parser';
import axios from 'axios';
import sources from '../../../config/sources.json';
import { logger } from '../../../lib/logger';
import type { RawPost } from '../types';

// Use a generic browser UA — Reddit (and some others) 403 on identified bots
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/rss+xml, application/xml, text/xml, */*',
};

const parser = new Parser();

// Hard reject patterns — kill obvious noise before LLM
const REJECT_PATTERNS = [
  /outage|down for anyone|not working|bugging out/i,
  /politics|election|government/i,
  /^introducing myself|new (here|member)/i,
  /just venting|rant:/i,
];

function isRejected(title: string): boolean {
  return REJECT_PATTERNS.some(p => p.test(title));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

export async function fetchRSSFeeds(): Promise<RawPost[]> {
  const rssFeeds = sources.feeds.filter(s => s.type === 'rss');
  const posts: RawPost[] = [];

  for (const source of rssFeeds) {
    try {
      // Fetch via axios so we control headers (rss-parser's built-in fetch gets 403 from Reddit)
      const response = await axios.get<string>(source.url, { headers: FETCH_HEADERS, responseType: 'text', timeout: 10000 });
      const feed = await parser.parseString(response.data);
      for (const item of feed.items.slice(0, 20)) {
        if (!item.title || !item.link) continue;
        if (isRejected(item.title)) continue;

        posts.push({
          title: item.title,
          // contentSnippet = from <content:encoded> (most RSS); summary = from <description> (Reddit RSS)
          body: item.contentSnippet || (item.summary ? stripHtml(item.summary).slice(0, 500) : undefined),
          url: item.link,
          platform: source.name,
        });
      }
    } catch (err: any) {
      logger.warn('scout', `RSS feed failed [${source.name}]: ${err?.message ?? err}`);
    }
  }

  return posts;
}
