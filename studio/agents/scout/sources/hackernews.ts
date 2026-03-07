import sources from '../../../config/sources.json';
import { enrichRawPost } from '../prefilter';
import type { RawPost } from '../types';
import type { SourceLane, SourcePriority } from '../types';

interface HNItem {
  title: string;
  url: string;
  points: number;
  num_comments: number;
  objectID: string;
}

interface ConfiguredSource {
  name: string;
  type: string;
  url: string;
  enabled?: boolean;
  lane?: SourceLane;
  priority?: SourcePriority;
}

const ASK_HN_KEEP_PATTERNS = [
  /^Ask HN:/i,
  /what do you use for/i,
  /is there a tool for/i,
  /how do you handle/i,
  /looking for/i,
  /alternative(s)? to/i,
  /best way to/i,
  /frustrated with/i,
  /why is there no/i,
];

const SHOW_HN_REJECT_PATTERNS = [
  /^Show HN:/i,
  /LLM|GPT|model release|open source model/i,
  /framework|runtime|database|infra|infrastructure|compiler|kernel/i,
  /SDK|API client|CLI|devtool|developer tool/i,
];

function isAskHNTitle(title: string): boolean {
  return /^Ask HN:/i.test(title.trim());
}

function shouldKeepHNItem(item: HNItem): boolean {
  const title = item.title?.trim() ?? '';
  if (!title) return false;

  const ask = isAskHNTitle(title);

  if (ask) {
    if (item.points <= 8) return false;
    return ASK_HN_KEEP_PATTERNS.some(pattern => pattern.test(title));
  }

  if (SHOW_HN_REJECT_PATTERNS.some(pattern => pattern.test(title))) return false;

  // Non-Ask HN startup ecosystem items are weak evidence and should be kept rarely.
  // Only keep unusually strong titles with higher engagement.
  return item.points > 18 && item.num_comments > 8;
}

export async function fetchHackerNews(): Promise<RawPost[]> {
  const hnSources = (sources.feeds as ConfiguredSource[]).filter(
    source => source.type === 'api' && source.enabled !== false && source.name.startsWith('hacker_news_')
  );

  const results = await Promise.all(
    hnSources.map(async source => {
      const response = await fetch(`${source.url}&hitsPerPage=40`);
      const data = (await response.json()) as { hits: HNItem[] };

      return (data.hits ?? [])
        .filter(item => shouldKeepHNItem(item))
        .map(item =>
          enrichRawPost(
            {
              title: item.title,
              url: `https://news.ycombinator.com/item?id=${item.objectID}`,
              platform: source.name,
              points: item.points,
              comments: item.num_comments,
            },
            {
              sourceLane: source.lane ?? 'startup_ecosystem',
              sourceName: source.name,
              sourcePriority: isAskHNTitle(item.title) ? (source.priority ?? 'secondary') : 'validation',
            }
          )
        )
        .filter((item): item is RawPost => Boolean(item));
    })
  );

  return results.flat();
}
