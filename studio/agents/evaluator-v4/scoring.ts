import type {
  DimensionScores,
  ValidationData,
  ScoringWeights,
  Recommendation,
  EvaluationResult,
  LLMEvaluation,
  WEIGHTS,
  THRESHOLDS,
} from './types';

export { WEIGHTS, THRESHOLDS } from './types';

/**
 * Compute weighted raw score from LLM dimension scores.
 * Returns 0-100 scale.
 */
export function computeRawScore(scores: DimensionScores, weights: ScoringWeights): number {
  const weighted =
    scores.problem_clarity * weights.problem_clarity +
    scores.target_user * weights.target_user +
    scores.build_feasibility * weights.build_feasibility +
    scores.revenue_path * weights.revenue_path +
    scores.distribution * weights.distribution +
    scores.timing * weights.timing;

  // scores are 1-10, weighted sum gives 1-10 range → multiply by 10 for 0-100
  return Math.round(weighted * 10 * 100) / 100;
}

/**
 * Compute validation modifier based on external validation data.
 * Returns a bonus/penalty value to add to the raw score.
 */
export function computeValidationModifier(validation: ValidationData): number {
  let modifier = 0;

  // Demand signals
  if (validation.demand?.autocomplete_match) {
    modifier += 5; // Real search demand confirmed
  }
  if ((validation.demand?.related_completions?.length ?? 0) >= 5) {
    modifier += 2; // Rich search ecosystem around this topic
  }

  // Competition signals
  const competition = validation.competition?.competition_level;
  if (competition === 'NONE') {
    modifier += 5; // Wide open market
  } else if (competition === 'WEAK') {
    modifier += 3; // Bloated incumbents only
  } else if (competition === 'STRONG') {
    modifier -= 8; // Crowded market — significant headwind
  }
  // MODERATE and UNKNOWN: no modifier

  // Trend signals
  const trend = validation.trend?.trend;
  if (trend === 'RISING') {
    modifier += 4; // Growing demand
  } else if (trend === 'DECLINING') {
    modifier -= 5; // Shrinking market
  }
  // STABLE and NO_DATA: no modifier (NO_DATA is common for niche queries)

  return modifier;
}

/**
 * Apply hard gates — forced outcomes regardless of score.
 * Returns null if no hard gate applies, or the forced recommendation.
 */
export function checkHardGates(
  validation: ValidationData,
  rawScore: number
): { recommendation: Recommendation; reason: string } | null {
  const competition = validation.competition?.competition_level;
  const hasDemand = validation.demand?.autocomplete_match;
  const trend = validation.trend?.trend;

  // Hard DROP: STRONG competition + no demand signal
  if (competition === 'STRONG' && !hasDemand) {
    return {
      recommendation: 'DROP',
      reason: 'Hard gate: strong competition with no demand signal',
    };
  }

  // Floor at WATCH: no competition + real demand + not declining
  if (competition === 'NONE' && hasDemand && trend !== 'DECLINING') {
    if (rawScore < 55) {
      return {
        recommendation: 'WATCH',
        reason: 'Hard gate: real demand + no competition — minimum WATCH despite low score',
      };
    }
  }

  return null;
}

/**
 * Determine recommendation from final score.
 */
export function scoreToRecommendation(score: number): Recommendation {
  if (score >= 70) return 'BUILD';
  if (score >= 50) return 'WATCH';
  return 'DROP';
}

/**
 * Assemble the final evaluation result.
 */
export function buildEvaluationResult(
  ideaId: string,
  llmEval: LLMEvaluation,
  validation: ValidationData,
  weights: ScoringWeights
): EvaluationResult {
  const rawScore = computeRawScore(llmEval.scores, weights);
  const validationModifier = computeValidationModifier(validation);
  const finalScore = Math.max(0, Math.min(100, rawScore + validationModifier));

  // Check hard gates
  const hardGate = checkHardGates(validation, rawScore);

  let recommendation: Recommendation;
  let reasoning = llmEval.reasoning;

  if (hardGate) {
    recommendation = hardGate.recommendation;
    reasoning = `${hardGate.reason}. ${reasoning}`;
  } else {
    recommendation = scoreToRecommendation(finalScore);
  }

  return {
    idea_id: ideaId,
    scores: llmEval.scores,
    score_raw: rawScore,
    validation_modifier: validationModifier,
    score_final: finalScore,
    recommendation,
    reasoning,
    strengths: llmEval.strengths,
    risks: llmEval.risks,
  };
}
