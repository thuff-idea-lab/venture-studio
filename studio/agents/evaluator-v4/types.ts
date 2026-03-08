// ── Evaluator V4 Types ─────────────────────────────────────────────────────────

export interface IdeasV4Row {
  id: string;
  title: string;
  summary: string;
  target_user: string;
  pain: string;
  v1_description: string;
  frequency: string;
  monetization: string;
  distribution: string;
  why_now: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  product_shape: string;
  build_hours_estimate: number;
  sources: { platform: string; url: string; strategy: string }[];
  validation_data: ValidationData;
  strategy: string;
  created_at: string;
  evaluated_at: string | null;
}

export interface ValidationData {
  demand?: {
    autocomplete_match: boolean;
    related_completions: string[];
  };
  competition?: {
    competition_level: 'NONE' | 'WEAK' | 'MODERATE' | 'STRONG' | 'UNKNOWN';
    top_results_summary: string[];
  };
  trend?: {
    trend: 'RISING' | 'STABLE' | 'DECLINING' | 'NO_DATA';
    interest_score?: number;
  };
}

// ── LLM Scoring Output ────────────────────────────────────────────────────────

export interface DimensionScores {
  problem_clarity: number;      // 1-10
  target_user: number;          // 1-10
  build_feasibility: number;    // 1-10
  revenue_path: number;         // 1-10
  distribution: number;         // 1-10
  timing: number;               // 1-10
}

export interface LLMEvaluation {
  scores: DimensionScores;
  strengths: string[];          // 2-4 bullet points
  risks: string[];              // 2-4 bullet points
  reasoning: string;            // 2-3 sentence summary
}

// ── Final Evaluation Output ───────────────────────────────────────────────────

export type Recommendation = 'BUILD' | 'WATCH' | 'DROP';

export interface EvaluationResult {
  idea_id: string;
  scores: DimensionScores;
  score_raw: number;            // weighted average before modifiers
  validation_modifier: number;  // bonus/penalty from validation data
  score_final: number;          // score_raw + validation_modifier
  recommendation: Recommendation;
  reasoning: string;
  strengths: string[];
  risks: string[];
}

// ── Scoring Config ────────────────────────────────────────────────────────────

export interface ScoringWeights {
  problem_clarity: number;
  target_user: number;
  build_feasibility: number;
  revenue_path: number;
  distribution: number;
  timing: number;
}

export const WEIGHTS: ScoringWeights = {
  problem_clarity: 0.20,
  target_user: 0.15,
  build_feasibility: 0.20,
  revenue_path: 0.15,
  distribution: 0.15,
  timing: 0.15,
};

export const THRESHOLDS = {
  BUILD: 70,
  WATCH: 50,
};
