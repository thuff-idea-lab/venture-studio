export interface RawPost {
  title: string;
  body?: string;
  url: string;
  platform: string;
  points?: number;
  comments?: number;
}

export interface IdeaRecord {
  // Structured opportunity brief (LLM-extracted)
  title: string;
  audience: string;
  pain: string;
  workaround: string;
  productPossibilities: string[];
  monetization: string[];
  confidence: 'low' | 'medium' | 'high';
  // Signal strength
  signalCount: number;
  sourceCluster: Array<{ platform: string; url: string; context?: string }>;
  // Metadata
  summary: string;
  evidence: Array<{ type: 'link' | 'metric' | 'quote'; value: string }>;
  sources: Array<{ platform: string; url: string; context?: string }>;
  keywords: string[];
  tags: string[];
  assetTypeHint: 'website' | 'directory' | 'saas' | 'youtube' | 'newsletter' | 'bot' | 'data' | 'unknown';
}
