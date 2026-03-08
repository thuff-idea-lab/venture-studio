import { getTrendInterest } from '../sources/google-trends';
import type { ExtractedIdea, TrendSignal } from '../types';

/**
 * Extract the most representative keyword from an idea for trend checking.
 */
function extractPrimaryKeyword(idea: ExtractedIdea): string {
  // Use the first few meaningful words of the title
  const words = idea.title
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 4);

  return words.join(' ') || idea.product_shape.replace(/_/g, ' ');
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
