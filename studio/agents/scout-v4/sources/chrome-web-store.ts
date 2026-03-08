import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../../../lib/logger';
import type { RawSignal, StrategyName } from '../types';

interface ExtensionInfo {
  name: string;
  description: string;
  rating: number;
  userCount: number;
  url: string;
}

const CWS_CATEGORIES = [
  'productivity',
  'shopping',
  'developer-tools',
  'search-tools',
  'social-and-communication',
];

/**
 * Fetch Chrome Web Store extensions from a category page.
 * Scraping is fragile — wrapped in try/catch with graceful degradation.
 */
export async function fetchCategoryExtensions(
  category: string
): Promise<ExtensionInfo[]> {
  try {
    const url = `https://chromewebstore.google.com/category/extensions/${category}`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(res.data);
    const extensions: ExtensionInfo[] = [];

    // CWS uses dynamic rendering; scraping may only work partially.
    // Look for structured data or card elements.
    $('a[href*="/detail/"]').each((_i, el) => {
      const $el = $(el);
      const name = $el.find('[class*="name"], [class*="title"]').first().text().trim()
        || $el.text().trim().split('\n')[0]?.trim();
      const href = $el.attr('href') ?? '';

      if (name && href.includes('/detail/')) {
        extensions.push({
          name: name.slice(0, 100),
          description: '',
          rating: 0,
          userCount: 0,
          url: href.startsWith('http') ? href : `https://chromewebstore.google.com${href}`,
        });
      }
    });

    return extensions.slice(0, 30);
  } catch (err: any) {
    logger.warn('scout-v4', `Chrome Web Store scrape failed for "${category}": ${err.message}`);
    return [];
  }
}

/**
 * Get extensions across specified categories, filtered for low-rated ones.
 */
export async function fetchLowRatedExtensions(
  categories: string[],
  strategy: StrategyName
): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];

  for (const cat of categories) {
    try {
      const exts = await fetchCategoryExtensions(cat);

      for (const ext of exts) {
        // Since scraping may not get rating/userCount reliably,
        // we include all found extensions and let the LLM filter
        signals.push({
          title: ext.name,
          body: ext.description || `Chrome extension in ${cat} category`,
          url: ext.url,
          platform: 'chrome_web_store',
          strategy,
          metadata: {
            category: cat,
            rating: ext.rating,
            userCount: ext.userCount,
          },
        });
      }
    } catch {
      // Individual category failure — continue with others
    }
  }

  return signals;
}

export { CWS_CATEGORIES };
