import Parser from 'rss-parser';
import sources from '../../../config/sources.json';
import type { RawPost } from '../types';

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; venture-studio-bot/1.0; +https://github.com/thuff-idea-lab/venture-studio)',
    'Accept': 'application/rss+xml, application/xml, text/xml',
  },
});

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

export async function fetchRSSFeeds(): Promise<RawPost[]> {
  const rssFeeds = sources.feeds.filter(s => s.type === 'rss');
  const posts: RawPost[] = [];

  for (const source of rssFeeds) {
    try {
      const feed = await parser.parseURL(source.url);
      for (const item of feed.items.slice(0, 20)) {
        if (!item.title || !item.link) continue;
        if (isRejected(item.title)) continue;

        posts.push({
          title: item.title,
          body: item.contentSnippet,
          url: item.link,
          platform: source.name,
        });
      }
    } catch {
      // individual feed failures logged by caller
    }
  }

  return posts;
}
