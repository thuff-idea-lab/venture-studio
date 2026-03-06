export interface RawPost {
  title: string;
  body?: string;
  url: string;
  platform: string;
  points?: number;
  comments?: number;
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
  confidence: 'low' | 'medium' | 'high';
  whyNow: string;
  founderFitScore: number; // 1-10, LLM self-assessed
  // Signal strength
  signalCount: number;
  sourceCluster: Array<{ platform: string; url: string; context?: string }>;
  // Metadata
  summary: string;
  evidence: Array<{ type: 'link' | 'metric' | 'quote'; value: string }>;
  sources: Array<{ platform: string; url: string; context?: string }>;
  keywords: string[];
  tags: string[];
  assetTypeHint: 'website' | 'directory' | 'saas' | 'youtube' | 'newsletter' | 'bot' | 'data' | 'calculator' | 'comparison' | 'dashboard' | 'unknown';
}
