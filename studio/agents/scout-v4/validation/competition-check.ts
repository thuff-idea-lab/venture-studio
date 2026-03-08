import { checkSERP } from '../sources/serp';
import type { ExtractedIdea, CompetitionSignal } from '../types';

/**
 * Build the search query to check competition for an idea.
 */
function buildCompetitionQuery(idea: ExtractedIdea): string {
  // Combine target user + product shape for a natural competition query
  const shape = idea.product_shape.replace(/_/g, ' ');

  if (idea.target_user) {
    return `${idea.target_user} ${shape}`;
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
