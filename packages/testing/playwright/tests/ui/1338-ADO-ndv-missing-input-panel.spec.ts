import { test, expect } from '../../fixtures/base';
import type { TestRequirements } from '../../Types';

const requirements: TestRequirements = {
	entry: {
		type: 'imported-workflow',
		workflow: 'Test_ado_1338.json',
	},
};

test.describe('ADO-1338-ndv-missing-input-panel', () => {
	test('should show the input and output panels when node is missing input and output data', async ({
		n8n,
		setupRequirements,
	}) => {
		await setupRequirements(requirements);
		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
			'Workflow executed successfully',
		);

		await n8n.canvas.openNode('Discourse1');
		await expect(n8n.ndv.getInputPanel()).toBeVisible();
		await expect(n8n.ndv.getOutputPanel()).toBeVisible();
	});
});
