import type { ServiceHelpers } from 'n8n-containers/services/types';

/**
 * Bypasses TypeORM and the n8n execution lifecycle so 100k+ rows seed in seconds.
 * Status mix and 1ms-staggered timestamps mirror production shape so the
 * executions list query's ORDER BY and access-control filter exercise realistic plans.
 */
export async function bulkSeedExecutions(
	services: ServiceHelpers,
	options: { projectId: string; count: number },
): Promise<void> {
	const { projectId, count } = options;
	if (count <= 0) return;
	if (!services.postgres) {
		throw new Error('postgres service not available — bulk seed requires direct PG access');
	}

	const sql = `
		WITH project_workflows AS (
			SELECT w.id, ROW_NUMBER() OVER (ORDER BY w.id) AS wf_idx
			FROM workflow_entity w
			INNER JOIN shared_workflow sw ON sw."workflowId" = w.id
			WHERE sw."projectId" = '${projectId}'
		),
		wf_count AS (SELECT COUNT(*)::int AS n FROM project_workflows)
		INSERT INTO execution_entity
			(finished, mode, status, "createdAt", "startedAt", "stoppedAt", "workflowId", "storedAt")
		SELECT
			true,
			'webhook',
			CASE WHEN s.idx % 20 = 0 THEN 'error' ELSE 'success' END,
			NOW() - (s.idx * interval '1 millisecond'),
			NOW() - (s.idx * interval '1 millisecond'),
			NOW() - (s.idx * interval '1 millisecond') + interval '50 ms',
			pw.id,
			'db'
		FROM generate_series(1, ${count}) s(idx)
		CROSS JOIN wf_count
		JOIN project_workflows pw ON pw.wf_idx = ((s.idx - 1) % wf_count.n) + 1;
	`;

	await services.postgres.exec(sql);
}
