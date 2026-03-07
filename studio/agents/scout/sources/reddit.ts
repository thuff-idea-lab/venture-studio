import Parser from 'rss-parser';
import axios from 'axios';
import sources from '../../../config/sources.json';
import { logger } from '../../../lib/logger';
import type { RawPost } from '../types';
import type { SourceLane, SourcePriority } from '../types';
import { enrichRawPost } from '../prefilter';

// Use a generic browser UA — Reddit (and some others) 403 on identified bots
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/rss+xml, application/xml, text/xml, */*',
};

const parser = new Parser();

interface ConfiguredSource {
  name: string;
  type: string;
  url: string;
  enabled?: boolean;
  lane?: SourceLane;
  priority?: SourcePriority;
}

function shouldSkipRSSSource(source: ConfiguredSource): boolean {
  const name = source.name.toLowerCase();
  const url = source.url.toLowerCase();

  // Reddit should primarily flow through the dedicated intent-search path,
  // not passive RSS ingestion.
  if (name.includes('reddit') || url.includes('reddit.com')) return true;

  return false;
}

function getFeedItemLimit(source: ConfiguredSource): number {
  const name = source.name.toLowerCase();
  const lane = source.lane ?? 'startup_ecosystem';

  if (lane === 'startup_ecosystem') return 12;
  if (name.includes('product_hunt')) return 10;
  return 20;
}

function getFeedPriority(source: ConfiguredSource): SourcePriority {
  const lane = source.lane ?? 'startup_ecosystem';
  if (lane === 'startup_ecosystem') return 'validation';
  return source.priority ?? 'secondary';
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

export async function fetchRSSFeeds(): Promise<RawPost[]> {
  const rssFeeds = (sources.feeds as ConfiguredSource[]).filter(
    source => source.type === 'rss' && source.enabled !== false && !shouldSkipRSSSource(source)
  );
  const posts: RawPost[] = [];

  for (const source of rssFeeds) {
    try {
      // Fetch via axios so we control headers (rss-parser's built-in fetch gets 403 from Reddit)
      const response = await axios.get<string>(source.url, { headers: FETCH_HEADERS, responseType: 'text', timeout: 10000 });
      const feed = await parser.parseString(response.data);
      for (const item of feed.items.slice(0, getFeedItemLimit(source))) {
        if (!item.title || !item.link) continue;

        const enriched = enrichRawPost({
          title: item.title,
          body: item.contentSnippet || (item.summary ? stripHtml(item.summary).slice(0, 500) : undefined),
          url: item.link,
          platform: source.name,
        }, {
          sourceLane: source.lane ?? 'startup_ecosystem',
          sourceName: source.name,
          sourcePriority: getFeedPriority(source),
        });

        if (enriched) posts.push(enriched);
      }
    } catch (err: any) {
      logger.warn('scout', `RSS feed failed [${source.name}]: ${err?.message ?? err}`);
    }
  }

  return posts;
}
