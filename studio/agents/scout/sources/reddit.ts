import Parser from 'rss-parser';
import sources from '../../../config/sources.json';
import type { IdeaRecord } from '../types';

const parser = new Parser();

export async function fetchRedditRSS(): Promise<IdeaRecord[]> {
  const redditSources = sources.feeds.filter(s => s.name.startsWith('reddit'));
  const ideas: IdeaRecord[] = [];

  for (const source of redditSources) {
    const feed = await parser.parseURL(source.url);

    for (const item of feed.items.slice(0, 10)) {
      if (!item.title || !item.link) continue;

      ideas.push({
        title: item.title,
        summary: item.contentSnippet ?? item.title,
        evidence: [],
        sources: [{ platform: 'reddit', url: item.link, context: item.contentSnippet }],
        keywords: extractKeywords(item.title),
        tags: [],
        assetTypeHint: 'unknown',
      });
    }
  }

  return ideas;
}

function extractKeywords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(' ')
    .filter(w => w.length > 3);
}
