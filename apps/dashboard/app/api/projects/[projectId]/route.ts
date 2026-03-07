import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '../../../../lib/supabase';
import type { ProjectStatus } from '../../../../lib/dashboard';

type DashboardAction = 'approve' | 'kill' | 'restore' | 'pause' | 'reprioritize' | 'return_to_planned';

interface Payload {
  action: DashboardAction;
  priority?: number;
  decisionNotes?: string;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const payload = (await request.json()) as Payload;
  const supabase = createSupabaseAdminClient();

  const { data: existing, error: loadError } = await supabase
    .from('projects')
    .select('id, status, priority, decision_notes')
    .eq('id', projectId)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const now = new Date().toISOString();
  const safePriority = payload.priority ? Math.min(5, Math.max(1, Math.round(payload.priority))) : existing.priority;
  const safeNotes = typeof payload.decisionNotes === 'string' ? payload.decisionNotes.trim() : existing.decision_notes;
  const update: Record<string, unknown> = {
    priority: safePriority,
    decision_notes: safeNotes,
  };

  switch (payload.action) {
    case 'approve':
      update.status = 'APPROVED' satisfies ProjectStatus;
      update.approved_at = now;
      update.killed_at = null;
      update.last_build_error = '';
      break;
    case 'kill':
      update.status = 'KILLED' satisfies ProjectStatus;
      update.killed_at = now;
      break;
    case 'restore':
    case 'return_to_planned':
      update.status = 'PLANNED' satisfies ProjectStatus;
      update.killed_at = null;
      break;
    case 'pause':
      update.status = 'PAUSED' satisfies ProjectStatus;
      break;
    case 'reprioritize':
      break;
    default:
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from('projects')
    .update(update)
    .eq('id', projectId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}