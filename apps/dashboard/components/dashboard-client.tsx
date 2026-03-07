'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { REVIEW_STATUSES, type IdeaSource, type ReviewQueueRow, type ReviewStatus } from '../lib/dashboard';

interface DashboardClientProps {
  initialRows: ReviewQueueRow[];
  initialStatus: ReviewStatus;
  initialSelectedProjectId: string | null;
  initialSearch: string;
  statusCounts: Record<ReviewStatus, number>;
}

type DashboardAction = 'approve' | 'kill' | 'restore' | 'pause' | 'reprioritize' | 'return_to_planned';

export function DashboardClient({
  initialRows,
  initialStatus,
  initialSelectedProjectId,
  initialSearch,
  statusCounts,
}: DashboardClientProps) {
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState<ReviewStatus>(initialStatus);
  const [search, setSearch] = useState(initialSearch);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialSelectedProjectId);
  const [mobilePane, setMobilePane] = useState<'queue' | 'detail'>(initialSelectedProjectId ? 'detail' : 'queue');
  const [pending, startTransition] = useTransition();
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [priorityDraft, setPriorityDraft] = useState<Record<string, number>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    return initialRows
      .filter((row) => row.status === activeStatus)
      .filter((row) => {
        if (!normalizedQuery) return true;
        const haystack = [
          row.idea_title,
          row.idea_summary,
          row.idea_audience,
          row.project_type,
          row.evaluation_notes ?? '',
        ].join(' ').toLowerCase();
        return haystack.includes(normalizedQuery);
      });
  }, [activeStatus, initialRows, search]);

  const selectedRow = useMemo(() => {
    return filteredRows.find((row) => row.project_id === selectedProjectId) ?? filteredRows[0] ?? null;
  }, [filteredRows, selectedProjectId]);

  function setStatus(status: ReviewStatus) {
    setActiveStatus(status);
    setSelectedProjectId(null);
    setMobilePane('queue');
    syncUrl(status, null, search);
  }

  function selectProject(projectId: string) {
    setSelectedProjectId(projectId);
    setMobilePane('detail');
    syncUrl(activeStatus, projectId, search);
  }

  function syncUrl(status: ReviewStatus, projectId: string | null, query: string) {
    const params = new URLSearchParams();
    params.set('status', status);
    if (projectId) params.set('project', projectId);
    if (query.trim()) params.set('q', query.trim());
    router.replace(`/?${params.toString()}`);
  }

  async function runAction(projectId: string, action: DashboardAction) {
    setErrorMessage(null);
    const priority = priorityDraft[projectId] ?? selectedRow?.priority ?? 3;
    const decisionNotes = notesDraft[projectId] ?? selectedRow?.decision_notes ?? '';

    startTransition(async () => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, priority, decisionNotes }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: 'Action failed' }));
        setErrorMessage(result.error ?? 'Action failed');
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="dashboard">
      <header className="hero">
        <div>
          <p className="eyebrow">Venture Studio</p>
          <h1>Project Review Queue</h1>
          <p className="lede">Review planned ideas, approve what should reach Builder, and keep the queue ordered by priority.</p>
        </div>
        <div className="hero-meta">
          <div>
            <span>Total projects</span>
            <strong>{initialRows.length}</strong>
          </div>
          <div>
            <span>Approved backlog</span>
            <strong>{statusCounts.APPROVED}</strong>
          </div>
          <div>
            <span>Actively building</span>
            <strong>{statusCounts.BUILDING}</strong>
          </div>
        </div>
      </header>

      <div className="toolbar">
        <div className="tab-row">
          {REVIEW_STATUSES.map((status) => (
            <button
              key={status}
              className={status === activeStatus ? 'tab active' : 'tab'}
              onClick={() => setStatus(status)}
              type="button"
            >
              <span>{status}</span>
              <strong>{statusCounts[status]}</strong>
            </button>
          ))}
        </div>

        <label className="search">
          <span>Search</span>
          <input
            value={search}
            onChange={(event) => {
              const value = event.target.value;
              setSearch(value);
              syncUrl(activeStatus, selectedProjectId, value);
            }}
            placeholder="Title, audience, notes"
          />
        </label>
      </div>

      <div className="mobile-pane-toggle" aria-label="Mobile dashboard panels">
        <button
          type="button"
          className={mobilePane === 'queue' ? 'pane-toggle active' : 'pane-toggle'}
          onClick={() => setMobilePane('queue')}
        >
          Queue
          <strong>{filteredRows.length}</strong>
        </button>
        <button
          type="button"
          className={mobilePane === 'detail' ? 'pane-toggle active' : 'pane-toggle'}
          onClick={() => setMobilePane('detail')}
          disabled={!selectedRow}
        >
          Review
          <strong>{selectedRow ? 1 : 0}</strong>
        </button>
      </div>

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      <div className={`content-grid ${mobilePane === 'detail' ? 'show-detail' : 'show-queue'}`}>
        <section className="queue-list">
          <div className="list-header">
            <span>{activeStatus}</span>
            <strong>{filteredRows.length} items</strong>
          </div>

          <div className="queue-table">
            {filteredRows.map((row) => (
              <button
                key={row.project_id}
                type="button"
                className={selectedRow?.project_id === row.project_id ? 'queue-row selected' : 'queue-row'}
                onClick={() => selectProject(row.project_id)}
              >
                <div>
                  <p className="queue-title">{row.idea_title}</p>
                  <p className="queue-pitch">{row.plan?.oneSentencePitch ?? row.idea_summary}</p>
                </div>
                <div className="queue-meta">
                  <span className="pill">P{row.priority}</span>
                  <span className="pill muted">{row.project_type}</span>
                  <span className="score">{row.evaluation_score_total ?? 'n/a'}</span>
                </div>
              </button>
            ))}

            {filteredRows.length === 0 ? <p className="empty-state">No projects match this filter yet.</p> : null}
          </div>
        </section>

        <aside className="detail-pane">
          {selectedRow ? (
            <>
              <div className="detail-header">
                <div className="detail-header-copy">
                  <p className="eyebrow">{selectedRow.status}</p>
                  <h2>{selectedRow.idea_title}</h2>
                  <p className="detail-summary">{selectedRow.plan?.oneSentencePitch ?? selectedRow.idea_summary}</p>
                </div>
                <div className="detail-header-meta">
                  <button className="mobile-back" type="button" onClick={() => setMobilePane('queue')}>
                    Back to queue
                  </button>
                  <div className="detail-score">{selectedRow.evaluation_score_total ?? 'n/a'}</div>
                </div>
              </div>

              <div className="action-bar">
                <label>
                  <span>Priority</span>
                  <select
                    value={priorityDraft[selectedRow.project_id] ?? selectedRow.priority}
                    onChange={(event) => setPriorityDraft((current) => ({
                      ...current,
                      [selectedRow.project_id]: Number(event.target.value),
                    }))}
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>P{value}</option>
                    ))}
                  </select>
                </label>

                <div className="action-buttons">
                  {selectedRow.status === 'PLANNED' ? (
                    <>
                      <button disabled={pending} className="primary" type="button" onClick={() => runAction(selectedRow.project_id, 'approve')}>Approve</button>
                      <button disabled={pending} className="danger" type="button" onClick={() => runAction(selectedRow.project_id, 'kill')}>Kill</button>
                    </>
                  ) : null}

                  {selectedRow.status === 'APPROVED' ? (
                    <>
                      <button disabled={pending} className="secondary" type="button" onClick={() => runAction(selectedRow.project_id, 'reprioritize')}>Save Priority</button>
                      <button disabled={pending} className="ghost" type="button" onClick={() => runAction(selectedRow.project_id, 'return_to_planned')}>Move to Planned</button>
                      <button disabled={pending} className="danger" type="button" onClick={() => runAction(selectedRow.project_id, 'kill')}>Kill</button>
                    </>
                  ) : null}

                  {selectedRow.status === 'BUILDING' ? (
                    <button disabled={pending} className="ghost" type="button" onClick={() => runAction(selectedRow.project_id, 'pause')}>Pause</button>
                  ) : null}

                  {selectedRow.status === 'KILLED' ? (
                    <button disabled={pending} className="ghost" type="button" onClick={() => runAction(selectedRow.project_id, 'restore')}>Restore to Planned</button>
                  ) : null}
                </div>
              </div>

              <label className="notes-block">
                <span>Decision notes</span>
                <textarea
                  rows={4}
                  value={notesDraft[selectedRow.project_id] ?? selectedRow.decision_notes}
                  onChange={(event) => setNotesDraft((current) => ({
                    ...current,
                    [selectedRow.project_id]: event.target.value,
                  }))}
                  placeholder="Why approve, kill, or defer this?"
                />
              </label>

              <div className="detail-sections">
                <DetailSection title="Idea Context">
                  <KeyValue label="Audience" value={selectedRow.idea_audience} />
                  <KeyValue label="Pain" value={selectedRow.idea_pain} />
                  <KeyValue label="Workaround" value={selectedRow.idea_workaround} />
                  <KeyValue label="Frequency" value={selectedRow.idea_frequency} />
                  <KeyValue label="Why now" value={selectedRow.idea_why_now} />
                  <KeyValue label="Summary" value={selectedRow.idea_summary} />
                </DetailSection>

                <DetailSection title="Evaluation">
                  <KeyValue label="Recommendation" value={selectedRow.evaluation_recommendation ?? 'n/a'} />
                  <KeyValue label="Score" value={selectedRow.evaluation_score_total ? String(selectedRow.evaluation_score_total) : 'n/a'} />
                  <KeyValue label="Notes" value={selectedRow.evaluation_notes ?? 'n/a'} />
                </DetailSection>

                <DetailSection title="Sources">
                  <SourceList sources={selectedRow.idea_sources ?? []} sourceExcerpt={selectedRow.idea_source_excerpt} />
                </DetailSection>

                <DetailSection title="Plan Snapshot">
                  <KeyValue label="Project type" value={selectedRow.project_type} />
                  <KeyValue label="Target user" value={selectedRow.plan?.targetUser ?? 'n/a'} />
                  <KeyValue label="Monetization" value={(selectedRow.plan?.primaryMonetization ?? []).join(', ') || 'n/a'} />
                  <KeyValue label="Success metric" value={selectedRow.plan?.mvpDefinition?.successMetric ?? 'n/a'} />
                </DetailSection>

                <DetailSection title="Execution Context">
                  <Bulleted label="Must-have V1" values={selectedRow.plan?.executionContext?.mustHaveV1Features ?? []} />
                  <Bulleted label="Out of scope" values={selectedRow.plan?.executionContext?.outOfScopeForV1 ?? []} />
                  <Bulleted label="Inputs" values={selectedRow.plan?.executionContext?.coreInputs ?? []} />
                  <Bulleted label="Outputs" values={selectedRow.plan?.executionContext?.coreOutputs ?? []} />
                </DetailSection>

                <DetailSection title="Build Plan">
                  <Bulleted label="Steps" values={selectedRow.plan?.buildPlan?.steps ?? []} />
                  <Bulleted label="Tech" values={selectedRow.plan?.buildPlan?.tech ?? []} />
                  <Bulleted label="Risks" values={selectedRow.plan?.buildPlan?.risks ?? []} />
                </DetailSection>

                <DetailSection title="Validation Plan">
                  <Bulleted label="Channels" values={selectedRow.plan?.testPlan?.channels ?? []} />
                  <Bulleted label="Tracking" values={selectedRow.plan?.testPlan?.tracking ?? []} />
                  <Bulleted label="Go/No-Go" values={selectedRow.plan?.testPlan?.goNoGo ?? []} />
                </DetailSection>
              </div>
            </>
          ) : (
            <div className="empty-detail">
              <h2>No project selected</h2>
              <p>Pick a project from the queue to review its idea context, evaluation, sources, and build plan.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="detail-section">
      <h3>{title}</h3>
      <div className="detail-stack">{children}</div>
    </section>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="key-value">
      <span>{label}</span>
      <p>{value || 'n/a'}</p>
    </div>
  );
}

function Bulleted({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="bullet-block">
      <span>{label}</span>
      {values.length > 0 ? (
        <ul>
          {values.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      ) : (
        <p>n/a</p>
      )}
    </div>
  );
}

function SourceList({ sources, sourceExcerpt }: { sources: IdeaSource[]; sourceExcerpt: string }) {
  return (
    <div className="sources">
      {sourceExcerpt ? <p className="source-excerpt">{sourceExcerpt}</p> : null}
      {sources.length > 0 ? (
        <ul>
          {sources.map((source, index) => (
            <li key={`${source.url ?? source.platform ?? 'source'}-${index}`}>
              <span>{source.platform ?? 'Source'}</span>
              {source.context ? <p>{source.context}</p> : null}
              {source.url ? (
                <a href={source.url} target="_blank" rel="noreferrer">{source.url}</a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p>No source URLs were stored for this idea.</p>
      )}
    </div>
  );
}