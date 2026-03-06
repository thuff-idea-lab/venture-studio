import type { IdeaRecord } from '../types';

interface HNItem {
  title: string;
  url: string;
  points: number;
  num_comments: number;
  objectID: string;
}

export async function fetchHackerNews(): Promise<IdeaRecord[]> {
  const res = await fetch('https://hn.algolia.com/api/v1/search_by_date?tags=ask_hn&hitsPerPage=20');
  const data = await res.json() as { hits: HNItem[] };

  return data.hits
    .filter(item => item.title && item.points > 5)
    .map(item => ({
      title: item.title,
      summary: `HN post with ${item.points} points and ${item.num_comments} comments`,
      evidence: [
        { type: 'metric' as const, value: `${item.points} upvotes` },
        { type: 'metric' as const, value: `${item.num_comments} comments` },
      ],
      sources: [{
        platform: 'hackernews',
        url: `https://news.ycombinator.com/item?id=${item.objectID}`,
        context: item.title,
      }],
      keywords: item.title.toLowerCase().split(' ').filter(w => w.length > 3),
      tags: [],
      assetTypeHint: 'unknown' as const,
    }));
}
