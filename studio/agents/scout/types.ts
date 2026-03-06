import type { IdeaRecord } from './types';

export interface IdeaRecord {
  title: string;
  summary: string;
  evidence: Array<{ type: 'link' | 'metric' | 'quote'; value: string }>;
  sources: Array<{ platform: string; url: string; context?: string }>;
  keywords: string[];
  tags: string[];
  assetTypeHint: 'website' | 'directory' | 'saas' | 'youtube' | 'newsletter' | 'bot' | 'data' | 'unknown';
}
