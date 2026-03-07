// NOTE:
// `buying` is the scout's current bucket name, but it should be interpreted broadly as
// decision-support / comparison / selection / "what should I choose" opportunities.
// We are keeping the literal value as `buying` for compatibility with the current scout pipeline.
export type OpportunityBucket = 'workflow' | 'buying' | 'discovery' | 'creator';

export type PostIntent =
  | 'workflow_pain'
  | 'buying_confusion'
  | 'discovery_gap'
  | 'creator_task'
  | 'tool_complaint'
  | 'generic_chatter';

export type SourceLane =
  | 'pain_communities'
  | 'complaint_ecosystems'
  | 'buying_confusion'
  | 'discovery_data_gaps'
  | 'startup_ecosystem';
export type SourcePriority = 'primary' | 'secondary' | 'validation';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface SourceRef {
  platform: string;
  url: string;
  context?: string;
}

export interface EvidenceRef {
  type: 'link' | 'metric' | 'quote';
  value: string;
}

export interface RawPost {
  title: string;
  body?: string;
  url: string;
  platform: string;
  points?: number;
  comments?: number;
  metadata?: {
    bucket?: OpportunityBucket;
    intent?: PostIntent;
    easyBuildScore?: number;
    hardBuildPenalty?: number;
    prefilterScore?: number;
    sourceLane?: SourceLane;
    sourceName?: string;
    sourcePriority?: SourcePriority;
  };
}

export interface IdeaRecord {
  // Core opportunity brief (LLM-extracted by Scout V3)
  title: string;
  audience: string;
  pain: string;
  workaround: string;
  frequency: string;
  mvpIdea: string;
  productPossibilities: string[];
  monetization: string[];
  distributionPaths: string[];
  founderFitReason: string[];
  expansionPaths: string[];
  sourceExcerpt: string;

  // Confidence signals
  // `confidence` is kept for backward compatibility with existing code.
  // Prefer `opportunityConfidence` and `evidenceConfidence` in newer logic.
  confidence: ConfidenceLevel;
  opportunityConfidence?: ConfidenceLevel;
  evidenceConfidence?: ConfidenceLevel;

  whyNow: string;
  founderFitScore: number; // 1-10, LLM self-assessed hint only; do not overweight downstream.

  // Signal strength
  signalCount: number;
  sourceTypeCount?: number;
  sourceLaneCount?: number;
  sourceCluster: SourceRef[];

  // Metadata
  summary: string;
  evidence: EvidenceRef[];
  sources: SourceRef[];
  keywords: string[];

  // `tags` remains flexible for backward compatibility.
  // `canonicalTags` can be used by newer code for normalized filtering.
  tags: string[];
  canonicalTags?: string[];

  // Keep the broader venture-studio taxonomy for now.
  // Scout may currently emit only a narrower subset, but the studio can still support these shapes.
  assetTypeHint:
    | 'website'
    | 'directory'
    | 'saas'
    | 'youtube'
    | 'newsletter'
    | 'bot'
    | 'data'
    | 'calculator'
    | 'comparison'
    | 'dashboard'
    | 'unknown';
}
