// ── Source types ───────────────────────────────────────────────────────────────

export interface RawSignal {
  title: string;
  body?: string;
  url: string;
  platform: string;
  strategy: StrategyName;
  metadata?: Record<string, unknown>;
}

export type StrategyName =
  | 'pain_mining'
  | 'gap_detection'
  | 'clone_hunting'
  | 'trend_surfing'
  | 'platform_gaps'
  | 'review_mining';

// ── LLM extraction output ────────────────────────────────────────────────────

export type ProductShape =
  | 'web_app'
  | 'browser_extension'
  | 'bot'
  | 'api'
  | 'template'
  | 'newsletter'
  | 'data_product'
  | 'widget'
  | 'saas'
  | 'directory'
  | 'calculator'
  | 'automation'
  | 'marketplace'
  | 'community';

export interface ExtractedIdea {
  title: string;
  product_shape: ProductShape;
  target_user: string;
  pain: string;
  frequency: string;
  v1_description: string;
  monetization: string;
  distribution: string;
  why_now: string;
  build_hours_estimate: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

// ── Validation output ─────────────────────────────────────────────────────────

export interface DemandSignal {
  autocomplete_match: boolean;
  related_completions: string[];
}

export interface CompetitionSignal {
  competition_level: 'NONE' | 'WEAK' | 'MODERATE' | 'STRONG' | 'UNKNOWN';
  top_results_summary: string[];
}

export interface TrendSignal {
  trend: 'RISING' | 'STABLE' | 'DECLINING' | 'NO_DATA';
  interest_score?: number;
}

export interface ValidationResult {
  demand: DemandSignal;
  competition: CompetitionSignal;
  trend: TrendSignal;
}

// ── Final Scout output (written to DB) ────────────────────────────────────────

export interface ScoutV4Idea {
  title: string;
  summary: string;
  product_shape: ProductShape;
  target_user: string;
  pain: string;
  frequency: string;
  v1_description: string;
  monetization: string;
  distribution: string;
  why_now: string;
  build_hours_estimate: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  sources: { platform: string; url: string; strategy: StrategyName }[];
  validation: ValidationResult;
  strategy: StrategyName;
  extracted_at: string;
}
