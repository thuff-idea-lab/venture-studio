// ── Planner V4 Types ──────────────────────────────────────────────────────────

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

export interface EvaluationV4Row {
  id: string;
  idea_id: string;
  score_problem_clarity: number;
  score_target_user: number;
  score_build_feasibility: number;
  score_revenue_path: number;
  score_distribution: number;
  score_timing: number;
  score_raw: number;
  score_final: number;
  validation_modifier: number;
  recommendation: 'BUILD' | 'WATCH' | 'DROP';
  reasoning: string;
  strengths: string[];
  risks: string[];
  created_at: string;
}

/** Combined idea + evaluation data passed to each generator */
export interface PlannerInput {
  idea: IdeasV4Row;
  evaluation: EvaluationV4Row;
  slug: string;
}
