import { getTrendInterest } from '../sources/google-trends';
import type { ExtractedIdea, TrendSignal } from '../types';

/**
 * Extract the most representative keyword from an idea for trend checking.
 * Google Trends works best with 1-3 word queries (broad category terms).
 */
function extractPrimaryKeyword(idea: ExtractedIdea): string {
  // Strip generic words that dilute the trend signal
  const skipWords = new Set(['for', 'the', 'and', 'tool', 'app', 'bot', 'tracker', 'generator', 'calculator', 'comparison', 'directory', 'template', 'assistant', 'manager', 'planner', 'checker', 'reminder']);

  const words = idea.title
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !skipWords.has(w.toLowerCase()));

  // Take 2-3 core concept words (not product-shape words)
  const core = words.slice(0, 3).join(' ');
  if (core.length >= 4) return core;

  // Fallback: use product shape as broad category
  return idea.product_shape.replace(/_/g, ' ');
}

/**
 * Check Google Trends for an idea's topic.
 * Many niche queries return NO_DATA — this is expected and neutral.
 */
export async function checkTrend(idea: ExtractedIdea): Promise<TrendSignal> {
  const keyword = extractPrimaryKeyword(idea);

  try {
    const { interest, trend } = await getTrendInterest(keyword);
    return { trend, interest_score: interest };
  } catch {
    return { trend: 'NO_DATA' };
  }
}
