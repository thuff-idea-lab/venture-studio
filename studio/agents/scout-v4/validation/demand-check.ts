import { getAutocompletions } from '../sources/google-autocomplete';
import type { ExtractedIdea, DemandSignal } from '../types';

// Words that add no search signal — strip before building queries
const STOP_WORDS = new Set([
  'for', 'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'with', 'by',
  'is', 'it', 'that', 'this', 'at', 'from', 'as', 'who', 'their', 'they',
]);

function stripStopWords(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .join(' ');
}

/**
 * Build 3-4 query variants that match how a real person would search.
 * People search for solutions to their PROBLEM, not for product titles.
 */
function buildDemandQueries(idea: ExtractedIdea): string[] {
  const queries: string[] = [];
  const shape = idea.product_shape.replace(/_/g, ' ');

  // Variant 1: short product-shape query (how people actually search)
  // e.g. "weight loss tracker" not "weight loss progress tracker for individuals"
  const titleCore = stripStopWords(idea.title).split(' ').slice(0, 3).join(' ');
  if (titleCore.length > 3) {
    queries.push(titleCore);
  }

  // Variant 2: core noun + shape (e.g. "invoice template", "scheduling bot")
  const coreNoun = stripStopWords(idea.title).split(' ')[0];
  if (coreNoun && coreNoun.length > 2) {
    queries.push(`${coreNoun} ${shape}`);
  }

  // Variant 3: how someone would google the problem
  // Extract the action from pain text — "track expenses", "manage inventory"
  if (idea.pain) {
    const painCore = stripStopWords(idea.pain).split(' ').slice(0, 3).join(' ');
    if (painCore.length > 5) {
      queries.push(painCore);
    }
  }

  // Variant 4: profession/role + need (e.g. "freelancer quote tracker")
  if (idea.target_user) {
    const userCore = stripStopWords(idea.target_user).split(' ').slice(0, 2).join(' ');
    if (userCore.length > 2 && coreNoun) {
      queries.push(`${userCore} ${coreNoun}`);
    }
  }

  // Deduplicate and filter
  return [...new Set(queries)].filter(q => q.length > 3 && q.split(' ').length <= 5);
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
