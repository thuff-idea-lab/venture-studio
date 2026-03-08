import { checkDemand } from './demand-check';
import { checkCompetition } from './competition-check';
import { checkTrend } from './trend-check';
import type { ExtractedIdea, ValidationResult } from '../types';

interface ValidateOptions {
  skipSerp?: boolean;
}

/**
 * Run all three validation checks on a candidate idea.
 * Demand and trend checks run in parallel; competition check respects skipSerp.
 */
export async function validateCandidate(
  idea: ExtractedIdea,
  options: ValidateOptions = {}
): Promise<ValidationResult> {
  const { skipSerp = false } = options;

  const [demand, competition, trend] = await Promise.all([
    checkDemand(idea),
    skipSerp
      ? Promise.resolve({ competition_level: 'UNKNOWN' as const, top_results_summary: [] as string[] })
      : checkCompetition(idea),
    checkTrend(idea),
  ]);

  return { demand, competition, trend };
}
