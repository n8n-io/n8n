/**
 * CAT-1437: Execution Save Race Condition Regression Test
 * @see https://linear.app/n8n/issue/CAT-1437
 *
 * The bug manifested when main was under pressure but workers weren't.
 * Workers would complete jobs faster than main could track via job.finished(),
 * causing executions to leak into the database.
 */

import { test, expect } from '../../../fixtures/base';

test.use({
	capability: {
		queueMode: { mains: 1, workers: 3 },
	},
});

test.describe('CAT-1437: Execution Save Race Condition @capability:queue', () => {
	test('should not save executions under load when workflow configured not to save', async ({
		api,
	}) => {
		const { webhookPath, createdWorkflow } = await api.workflows.importWorkflowFromFile(
			'webhook-no-save-executions.json',
		);

		const totalRequests = 500;

		const requests = Array.from({ length: totalRequests }, (_, i) =>
			api.webhooks.trigger(`/webhook/${webhookPath}`, {
				method: 'POST',
				data: { requestId: i },
			}),
		);

		const responses = await Promise.all(requests);
		const successCount = responses.filter((r) => r.ok()).length;

		console.log(`Responses: ${successCount}/${totalRequests} successful`);

		// Wait for all executions to complete
		await new Promise((resolve) => setTimeout(resolve, 30000));

		const allExecutions = await api.workflows.getExecutions();
		const leakedExecutions = allExecutions.filter(
			(exec) => exec.workflowName === createdWorkflow.name,
		);

		const leakRate = ((leakedExecutions.length / totalRequests) * 100).toFixed(2);
		console.log(`Leaked executions: ${leakedExecutions.length}/${totalRequests} (${leakRate}%)`);

		expect(leakedExecutions).toHaveLength(0);
	});
});
