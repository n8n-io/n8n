import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';

const requirements: TestRequirements = {
	workflow: {
		'Test_ado_1338.json': 'Test Workflow ADO-1338',
	},
};

test.describe(
	'ADO-1338-ndv-missing-input-panel',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		// TODO(CET-1208): engine v2 turns the body of the disabled loop into a cycle and refuses it.
		test('should show the input and output panels when node is missing input and output data @engine:v2-pending', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(requirements);
			await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);

			await n8n.canvas.openNode('Discourse1');
			await expect(n8n.ndv.inputPanel.get()).toBeVisible();
			await expect(n8n.ndv.outputPanel.get()).toBeVisible();
		});
	},
);
