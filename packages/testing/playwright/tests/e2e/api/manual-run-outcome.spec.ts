import { test, expect } from '../../../fixtures/base';

// Manual Trigger -> Set (test = 'a') -> If (test == 'b') -> NoOp | Set (test2 = paired item's test)
const WORKFLOW_FILE = 'Test_Workflow_pairedItem_incomplete_manual_bug.json';
const TRIGGER_NAME = 'When clicking ‘Execute workflow’';

test.describe(
	'Manual run outcome',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('should run a branching workflow and report its output through the executions API @engine:v2', async ({
			api,
		}) => {
			const { workflowId } = await api.workflows.importWorkflowFromFile(WORKFLOW_FILE);

			const { executionId } = await api.workflows.runManually(workflowId, TRIGGER_NAME);
			const execution = await api.workflows.waitForExecutionById(executionId);

			expect(execution.status).toBe('success');
			// The false branch ran, and its Set read the paired item from two nodes upstream.
			expect(execution.data).toContain('"test2"');
			expect(execution.data).toContain('"a"');
		});
	},
);
