import axios from 'axios';
import { logger } from '../../../lib/logger';

const DELAY_MS = 200;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Query Google's autocomplete/suggest endpoint.
 * Returns up to 10 completions per query. No auth required.
 */
export async function getAutocompletions(query: string): Promise<string[]> {
  try {
    const url = 'https://suggestqueries.google.com/complete/search';
    const res = await axios.get(url, {
      params: { client: 'firefox', q: query },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 8000,
    });

    // Response is a JSON array: [query, [completions]]
    const data = res.data;
    if (Array.isArray(data) && Array.isArray(data[1])) {
      return data[1].filter((s: unknown): s is string => typeof s === 'string');
    }
    return [];
  } catch (err: any) {
    logger.warn('scout-v4', `Autocomplete failed for "${query}": ${err.message}`);
    return [];
  }
}

/**
 * Batch query with delay between requests to be polite.
 */
export async function batchAutocompletions(
  queries: string[]
): Promise<Map<string, string[]>> {
  const results = new Map<string, string[]>();
  for (const q of queries) {
    const completions = await getAutocompletions(q);
    results.set(q, completions);
    if (queries.indexOf(q) < queries.length - 1) {
      await sleep(DELAY_MS);
    }
  }
  return results;
}
