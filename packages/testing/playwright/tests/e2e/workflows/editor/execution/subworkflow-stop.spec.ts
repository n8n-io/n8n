import { test, expect } from '../../../../../fixtures/base';

/**
 * E2E coverage for stopping subworkflow executions in queue mode; see CAT-2662.
 *
 * In queue mode a subworkflow runs inline in the parent's worker process and has no Bull job,
 * so before the fix a stop never reached it: the worker ran the child to completion and the
 * save hook overwrote its `canceled` status back to `success`. The child workflow chains three
 * 5s Code-node sleeps (~15s) so it stays `running` long enough to be stopped mid-run.
 */
test.describe(
	'Subworkflow Stop @mode:queue',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	() => {
		test('should stop a subworkflow execution on the worker and keep it canceled', async ({
			api,
		}) => {
			// Child must be published before the parent that references it (publication flow);
			// both fixtures are `active: true`, so importing them publishes them in order.
			const { workflowId: childWorkflowId } =
				await api.workflows.importWorkflowFromFile('cat-2662-child.json');

			const { workflowId: parentWorkflowId, webhookPath } =
				await api.workflows.importWorkflowFromFile('cat-2662-parent.json', {
					transform: (workflow) => {
						const executeNode = workflow.nodes!.find(
							(n) => n.type === 'n8n-nodes-base.executeWorkflow',
						)!;
						executeNode.parameters.workflowId = { __rl: true, value: childWorkflowId, mode: 'id' };
						return workflow;
					},
				});

			// Trigger via webhook so the parent (and its inline child) run on the worker.
			void api.webhooks.trigger(`/webhook/${webhookPath}`, { method: 'POST' }).catch(() => {});

			// Once the child reports `running`, the worker has registered it in its ActiveExecutions,
			// so the stop broadcast will reach it. Stop immediately, while it is still in Delay 1.
			const child = await api.workflows.waitForWorkflowStatus(childWorkflowId, 'running', 15000);

			const stopped = await api.workflows.stopExecution(child.id);
			expect(stopped.status).toBe('canceled');

			// Wait until the parent finishes on the worker: only once the worker is done with the child
			// could a late save hook have overwritten its status. Before the fix the worker runs the
			// child to completion (~15s) and the parent then succeeds; with the fix the cancel
			// propagates and the parent ends quickly.
			await expect(async () => {
				const executions = await api.workflows.getExecutions(parentWorkflowId);
				const parent = executions.find((e) => e.workflowId === parentWorkflowId);
				expect(parent?.status).not.toBe('running');
			}).toPass({ timeout: 25000, intervals: [500] });

			const final = await api.workflows.getExecution(child.id);

			// canceled persists (not overwritten)...
			expect(final.status).toBe('canceled');
			// ...and the worker actually interrupted the run rather than completing all ~15s of delays.
			const ranForMs = new Date(final.stoppedAt!).getTime() - new Date(final.startedAt!).getTime();
			expect(ranForMs).toBeLessThan(10000);
		});
	},
);
