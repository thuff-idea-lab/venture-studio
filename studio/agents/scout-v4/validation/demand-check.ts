import { getAutocompletions } from '../sources/google-autocomplete';
import type { ExtractedIdea, DemandSignal } from '../types';

/**
 * Build 2-3 query variants from an idea to test demand via autocomplete.
 */
function buildDemandQueries(idea: ExtractedIdea): string[] {
  const queries: string[] = [];

  // Variant 1: idea title (most specific)
  queries.push(idea.title.toLowerCase().replace(/[^\w\s]/g, '').trim());

  // Variant 2: target_user + product_shape
  if (idea.target_user && idea.product_shape) {
    queries.push(`${idea.target_user} ${idea.product_shape.replace(/_/g, ' ')}`);
  }

  // Variant 3: pain keyword
  if (idea.pain) {
    const painWords = idea.pain.split(/\s+/).slice(0, 5).join(' ');
    queries.push(painWords);
  }

  return queries.filter(q => q.length > 3);
}

/**
 * Check if there's real search demand for an idea via Google Autocomplete.
 */
export async function checkDemand(idea: ExtractedIdea): Promise<DemandSignal> {
  const queries = buildDemandQueries(idea);

  let autocomplete_match = false;
  const related_completions: string[] = [];

  for (const query of queries) {
    try {
      const completions = await getAutocompletions(query);
      if (completions.length > 0) {
        autocomplete_match = true;
        related_completions.push(...completions.slice(0, 3));
      }
    } catch {
      // Individual query failure is fine — continue with others
    }
  }

  return {
    autocomplete_match,
    related_completions: [...new Set(related_completions)].slice(0, 10),
  };
}
