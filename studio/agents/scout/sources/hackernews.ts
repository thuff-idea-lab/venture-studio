import sources from '../../../config/sources.json';
import { logger } from '../../../lib/logger';
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

interface FirebaseHNItem {
  id: number;
  title?: string;
  url?: string;
  score?: number;
  descendants?: number;
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
  /searching for/i,
  /alternative(s)? to/i,
  /best way to/i,
  /best .* for/i,
  /recommend(ation|ations)? for/i,
  /does anyone use/i,
  /what software/i,
  /directory|database|calculator|estimator|compare/i,
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
    if (item.points <= 4) return false;
    return ASK_HN_KEEP_PATTERNS.some(pattern => pattern.test(title));
  }

  if (SHOW_HN_REJECT_PATTERNS.some(pattern => pattern.test(title))) return false;

  // Non-Ask HN startup ecosystem items are weak evidence and should be kept rarely.
  // Only keep unusually strong titles with higher engagement.
  return item.points > 18 && item.num_comments > 8;
}

async function fetchAlgoliaItems(source: ConfiguredSource): Promise<HNItem[]> {
  const response = await fetch(`${source.url}&hitsPerPage=40`);
  if (!response.ok) {
    throw new Error(`Algolia HN request failed with ${response.status}`);
  }

  const data = (await response.json()) as { hits: HNItem[] };
  return data.hits ?? [];
}

async function fetchFirebaseAskHNItems(limit: number): Promise<HNItem[]> {
  const idsResponse = await fetch('https://hacker-news.firebaseio.com/v0/askstories.json');
  if (!idsResponse.ok) {
    throw new Error(`Firebase Ask HN request failed with ${idsResponse.status}`);
  }

  const ids = ((await idsResponse.json()) as number[]).slice(0, limit);
  const items = await Promise.all(
    ids.map(async id => {
      const itemResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      if (!itemResponse.ok) return null;

      const item = (await itemResponse.json()) as FirebaseHNItem;
      if (!item.title) return null;

      return {
        title: item.title,
        url: item.url ?? `https://news.ycombinator.com/item?id=${item.id}`,
        points: item.score ?? 0,
        num_comments: item.descendants ?? 0,
        objectID: String(item.id),
      } satisfies HNItem;
    })
  );

  return items.filter((item): item is HNItem => Boolean(item));
}

export async function fetchHackerNews(): Promise<RawPost[]> {
  const hnSources = (sources.feeds as ConfiguredSource[]).filter(
    source => source.type === 'api' && source.enabled !== false && source.name.startsWith('hacker_news_')
  );

  const results = await Promise.all(
    hnSources.map(async source => {
      let items: HNItem[] = [];

      try {
        items = await fetchAlgoliaItems(source);
      } catch (err: any) {
        logger.warn('scout', `HN Algolia source failed [${source.name}]: ${err?.message ?? err}`);
      }

      if (items.length === 0) {
        try {
          items = await fetchFirebaseAskHNItems(40);
          logger.info('scout', `HN fallback used [${source.name}]: ${items.length} Ask HN items from Firebase`);
        } catch (err: any) {
          logger.warn('scout', `HN Firebase fallback failed [${source.name}]: ${err?.message ?? err}`);
        }
      }

      return items
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
