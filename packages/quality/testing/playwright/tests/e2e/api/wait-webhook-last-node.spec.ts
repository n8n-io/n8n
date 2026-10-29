import flatted from 'flatted';

import { test, expect } from '../../../fixtures/base';

// Manual -> Capture Resume URL -> Wait (resume on webhook call, respond when the last node finishes) -> After
const WORKFLOW_FILE = 'wait-webhook-last-node.json';

test.describe(
	'Wait node webhook resume',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	() => {
		test('should answer the resume request with the output of the last node @engine:v2-pending', async ({
			api,
		}) => {
			const { workflowId } = await api.workflows.importWorkflowFromFile(WORKFLOW_FILE);
			const { executionId } = await api.workflows.runManually(workflowId, 'Manual');
			await api.workflows.waitForWorkflowStatus(workflowId, 'waiting');

			const { resultData } = flatted.parse((await api.workflows.getExecution(executionId)).data);
			const resumeUrl = new URL(
				resultData.runData['Capture Resume URL'][0].data.main[0][0].json.resumeUrl,
			);

			const response = await api.webhooks.trigger(`${resumeUrl.pathname}${resumeUrl.search}`, {
				maxNotFoundRetries: 0,
			});

			expect(response.status()).toBe(200);
			expect(await response.json()).toEqual({ result: 'resumed' });
			const execution = await api.workflows.waitForExecutionById(executionId);
			expect(execution.status).toBe('success');
		});
	},
);
