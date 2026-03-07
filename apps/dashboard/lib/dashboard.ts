import { createSupabaseAdminClient } from './supabase';

export const REVIEW_STATUSES = ['PLANNED', 'APPROVED', 'BUILDING', 'KILLED'] as const;
export type ReviewStatus = typeof REVIEW_STATUSES[number];

export type ProjectStatus = ReviewStatus | 'LIVE' | 'PAUSED' | 'ARCHIVED';

export interface IdeaSource {
  platform?: string;
  url?: string;
  context?: string;
}

export interface ReviewQueueRow {
  project_id: string;
  idea_id: string;
  slug: string;
  project_type: string;
  status: ProjectStatus;
  priority: number;
  decision_notes: string;
  approved_at: string | null;
  killed_at: string | null;
  build_started_at: string | null;
  build_finished_at: string | null;
  last_build_error: string;
  plan: Record<string, any>;
  project_created_at: string;
  idea_title: string;
  idea_summary: string;
  idea_audience: string;
  idea_pain: string;
  idea_workaround: string;
  idea_frequency: string;
  idea_why_now: string;
  idea_source_excerpt: string;
  idea_sources: IdeaSource[] | null;
  asset_type_hint: string;
  evaluation_id: string | null;
  evaluation_score_total: number | null;
  evaluation_recommendation: string | null;
  evaluation_notes: string | null;
  evaluation_created_at: string | null;
}

export async function fetchReviewQueue(): Promise<ReviewQueueRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('project_review_queue')
    .select('*')
    .order('priority', { ascending: true })
    .order('project_created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load dashboard queue: ${error.message}`);
  }

  return (data ?? []) as ReviewQueueRow[];
}

export function isReviewStatus(value: string | undefined): value is ReviewStatus {
  return REVIEW_STATUSES.includes((value ?? '') as ReviewStatus);
}

export function getStatusCounts(rows: ReviewQueueRow[]): Record<ReviewStatus, number> {
  return REVIEW_STATUSES.reduce((acc, status) => {
    acc[status] = rows.filter((row) => row.status === status).length;
    return acc;
  }, {} as Record<ReviewStatus, number>);
}