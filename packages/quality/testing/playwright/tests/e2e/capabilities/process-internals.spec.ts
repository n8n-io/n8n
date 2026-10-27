import { nanoid } from 'nanoid';
import type { N8NProcessUrl } from 'n8n-containers/stack';

import { test, expect } from '../../../fixtures/base';
import {
	collectProcessGarbage,
	diffProcessInternals,
	probeMissingHeapSnapshot,
	readProcessInternals,
} from '../../../utils/process-internals';

test.use({ capability: { env: { TEST_ISOLATION: 'process-internals' } } });

/** Collections each process role must report, whatever the execution mode. */
const REQUIRED_COLLECTIONS: Record<N8NProcessUrl['role'], string[]> = {
	main: ['activeExecutions.executions', 'triggers.workflows', 'push.connections'],
	webhook: ['activeExecutions.executions', 'scaling.jobResults'],
	worker: ['scaling.runningJobs'],
};

test.describe(
	'Process internals',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should report in-memory state counts for every n8n process', async ({ processUrls }) => {
			const readings = await readProcessInternals(processUrls);

			for (const { role, name, internals } of readings) {
				expect(internals.version, name).toBe(1);
				expect(internals.instanceType, name).toBe(role);
				expect(internals.memory.heapUsed, name).toBeGreaterThan(0);
				expect(Object.keys(internals.collections), name).toEqual(
					expect.arrayContaining(REQUIRED_COLLECTIONS[role]),
				);
			}
		});

		test('should expose garbage collection and heap snapshot routes on every n8n process', async ({
			processUrls,
			n8nContainer,
		}) => {
			// Container stacks start n8n with --expose-gc; a local dev server may not.
			test.skip(!n8nContainer, 'container-only: requires --expose-gc');

			for (const target of processUrls) {
				expect(await collectProcessGarbage(target), target.name).toBe(true);

				// A cheap probe that the snapshot routes are mounted: taking a real
				// snapshot pauses the process and is left to soak and memory suites.
				const missing = await probeMissingHeapSnapshot(target);
				expect(missing.status, target.name).toBe(404);
				expect(missing.body, target.name).toContain('Snapshot not found');
			}
		});

		test('should return in-memory execution state to baseline after webhook executions finish', async ({
			api,
			processUrls,
		}) => {
			const path = `internals-${nanoid()}`;
			const { workflowId, createdWorkflow, webhookPath } =
				await api.workflows.createWorkflowFromDefinition(
					{
						name: `Process internals ${nanoid()}`,
						nodes: [
							{
								id: 'webhook',
								name: 'Webhook',
								type: 'n8n-nodes-base.webhook',
								typeVersion: 2,
								position: [0, 0],
								parameters: { httpMethod: 'POST', path, responseMode: 'lastNode', options: {} },
							},
							{
								id: 'noop',
								name: 'NoOp',
								type: 'n8n-nodes-base.noOp',
								typeVersion: 1,
								position: [200, 0],
								parameters: {},
							},
						],
						connections: { Webhook: { main: [[{ node: 'NoOp', type: 'main', index: 0 }]] } },
					},
					{ webhookPrefix: 'internals' },
				);
			await api.workflows.activate(workflowId, createdWorkflow.versionId!);
			const trigger = async () =>
				await api.webhooks.trigger(`/webhook/${webhookPath}`, {
					method: 'POST',
					data: { hello: 'world' },
					maxNotFoundRetries: 20,
				});
			// Warm up once so that lazily created state is part of the baseline.
			expect((await trigger()).ok()).toBe(true);

			const before = await readProcessInternals(processUrls);
			for (let i = 0; i < 5; i++) {
				expect((await trigger()).ok()).toBe(true);
			}

			// `lastNode` responds when the last node runs, just before cleanup.
			await expect
				.poll(async () => {
					const deltas = diffProcessInternals(before, await readProcessInternals(processUrls));
					return deltas.map(({ name, collections }) => ({
						name,
						executions: collections['activeExecutions.executions'] ?? 0,
						responseModes: collections['activeExecutions.responseModes'] ?? 0,
						jobResults: collections['scaling.jobResults'] ?? 0,
					}));
				})
				.toEqual(
					processUrls.map(({ name }) => ({
						name,
						executions: 0,
						responseModes: 0,
						jobResults: 0,
					})),
				);
		});
	},
);
