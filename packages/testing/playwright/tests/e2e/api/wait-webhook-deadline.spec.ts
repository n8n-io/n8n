import flatted from 'flatted';

import { test, expect } from '../../../fixtures/base';

// Manual Trigger -> Wait (resume on webhook call, limit: after 5 seconds) -> After (NoOp)
const WORKFLOW_FILE = 'wait-webhook-deadline.json';
const TRIGGER_NAME = 'Manual';

test.describe(
	'Wait node deadline',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should resume a webhook wait at its time limit without a request @engine:v2', async ({
			api,
		}) => {
			// The legacy wait tracker polls once a minute, so a resume can take that long.
			test.setTimeout(120_000);

			const { workflowId } = await api.workflows.importWorkflowFromFile(WORKFLOW_FILE);

			const { executionId } = await api.workflows.runManually(workflowId, TRIGGER_NAME);
			const execution = await api.workflows.waitForExecutionById(executionId, 100_000);

			expect(execution.status).toBe('success');

			// The wait passes the trigger's item through, so the node after it ran once
			// with one item and nothing was sent to the resume URL.
			const { resultData } = flatted.parse(execution.data);
			expect(resultData.runData.After).toHaveLength(1);
			expect(resultData.runData.After[0].data.main[0]).toHaveLength(1);
		});
	},
);
