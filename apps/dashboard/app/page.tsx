import { DashboardClient } from '../components/dashboard-client';
import { fetchReviewQueue, getStatusCounts, isReviewStatus, type ReviewStatus } from '../lib/dashboard';

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const statusParam = Array.isArray(params.status) ? params.status[0] : params.status;
  const selectedStatus: ReviewStatus = isReviewStatus(statusParam) ? statusParam : 'PLANNED';
  const selectedProjectId = Array.isArray(params.project) ? params.project[0] : params.project;
  const search = Array.isArray(params.q) ? params.q[0] : params.q ?? '';

  const rows = await fetchReviewQueue();
  const counts = getStatusCounts(rows);

  return (
    <main className="shell">
      <DashboardClient
        initialRows={rows}
        initialStatus={selectedStatus}
        initialSelectedProjectId={selectedProjectId ?? null}
        initialSearch={search}
        statusCounts={counts}
      />
    </main>
  );
}