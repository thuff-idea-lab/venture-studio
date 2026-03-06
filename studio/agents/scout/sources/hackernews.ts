import type { RawPost } from '../types';

interface HNItem {
  title: string;
  url: string;
  points: number;
  num_comments: number;
  objectID: string;
}

// Hard reject patterns — kill obvious noise before LLM
const REJECT_PATTERNS = [
  /^ask hn: what (are|is) (you|your|the)/i,
  /^ask hn: (do|did|does|have|has) you/i,
  /^ask hn: (who|where|when|why) (are|is|do|did)/i,
  /bugging out/i,
  /outage/i,
  /down for anyone/i,
  /anyone else (seeing|having|experiencing)/i,
  /^ask hn: how (do|did|does) you feel/i,
  /career|job market|hiring|layoff/i,
  /politics|election|government/i,
];

function isRejected(title: string): boolean {
  return REJECT_PATTERNS.some(p => p.test(title));
}

export async function fetchHackerNews(): Promise<RawPost[]> {
  // Fetch show_hn (people launching things) and ask_hn (pain/tool requests) in parallel
  const [showRes, askRes] = await Promise.all([
    fetch('https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&hitsPerPage=30'),
    fetch('https://hn.algolia.com/api/v1/search_by_date?tags=ask_hn&hitsPerPage=30'),
  ]);

  const [showData, askData] = await Promise.all([
    showRes.json() as Promise<{ hits: HNItem[] }>,
    askRes.json() as Promise<{ hits: HNItem[] }>,
  ]);

  const all = [...(showData.hits ?? []), ...(askData.hits ?? [])];

  return all
    .filter(item => item.title && item.points > 3 && !isRejected(item.title))
    .map(item => ({
      title: item.title,
      url: `https://news.ycombinator.com/item?id=${item.objectID}`,
      platform: 'hackernews',
      points: item.points,
      comments: item.num_comments,
    }));
}
