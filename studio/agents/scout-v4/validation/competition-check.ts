import { checkSERP } from '../sources/serp';
import type { ExtractedIdea, CompetitionSignal } from '../types';

/**
 * Build the search query to check competition for an idea.
 * Generates a short, natural query like what someone would google.
 */
function buildCompetitionQuery(idea: ExtractedIdea): string {
  const shape = idea.product_shape.replace(/_/g, ' ');

  // Extract the core concept from title (first 3 meaningful words)
  const titleWords = idea.title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['for', 'the', 'and', 'tool', 'app'].includes(w));

  const titleCore = titleWords.slice(0, 3).join(' ');

  // Build query: core concept + shape (e.g. "invoice tracker web app")
  if (titleCore) {
    return `${titleCore} ${shape}`;
  }

  return idea.title.toLowerCase();
}

/**
 * Check competition level for an idea via SERP analysis.
 */
export async function checkCompetition(idea: ExtractedIdea): Promise<CompetitionSignal> {
  const query = buildCompetitionQuery(idea);

  try {
    const serp = await checkSERP(query);
    return {
      competition_level: serp.competition_level,
      top_results_summary: serp.top_results.map(r => r.title).slice(0, 5),
    };
  } catch {
    return {
      competition_level: 'UNKNOWN',
      top_results_summary: [],
    };
  }
}
