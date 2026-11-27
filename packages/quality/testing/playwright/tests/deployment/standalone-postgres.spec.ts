import { expect, test } from '@playwright/test';

import { assertN8nImage, runDeploymentCell } from './probe';

test(
	'Standalone PostgreSQL',
	{
		tag: '@cell:LAY-02',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		await runDeploymentCell({
			stack: { postgres: true },
			probe: async ({ probe }) => {
				const webhook = await probe.runWebhook();
				const execution = await probe.readExecution(webhook.workflowId);
				return { webhook, execution };
			},
			check: async ({ stack, probeOutput }) => {
				assertN8nImage(stack);

				expect(
					stack.serviceResults.postgres,
					'Expected a PostgreSQL container in the stack',
				).toBeDefined();

				const { workflowId } = probeOutput.webhook;
				const { executionId } = probeOutput.execution;
				expect(workflowId, `Unexpected workflowId: ${workflowId}`).toMatch(/^[A-Za-z0-9_-]+$/);
				expect(executionId, `Unexpected executionId: ${executionId}`).toMatch(/^[A-Za-z0-9_-]+$/);

				const migrationsRaw = (
					await stack.services.postgres.exec('SELECT COUNT(*)::int FROM migrations;')
				).trim();
				expect(
					migrationsRaw,
					`Expected PostgreSQL migrations table to return a row count, got: ${migrationsRaw}`,
				).toMatch(/^\d+$/);
				expect(
					Number.parseInt(migrationsRaw, 10),
					'Expected n8n to run migrations in PostgreSQL',
				).toBeGreaterThan(0);

				const executionStatus = (
					await stack.services.postgres.exec(
						`SELECT status FROM execution_entity WHERE id::text = '${executionId}' AND "workflowId" = '${workflowId}' AND finished = true;`,
					)
				).trim();
				expect(
					executionStatus,
					`Expected finished execution ${executionId} for workflow ${workflowId} in PostgreSQL`,
				).toBe('success');
			},
		});
	},
);
