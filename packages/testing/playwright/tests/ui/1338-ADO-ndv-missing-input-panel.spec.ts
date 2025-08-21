import { test, expect } from '../../fixtures/base';
import type { TestRequirements } from '../../Types';

const requirements: TestRequirements = {
	workflow: {
		'Test_ado_1338.json': 'Test Workflow ADO-1338',
	},
};

test.describe('ADO-1338-ndv-missing-input-panel', () => {
	test('should show the input and output panels when node is missing input and output data', async ({
		n8n,
		setupRequirements,
	}) => {
		await setupRequirements(requirements);
		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
			'Workflow successfully executed',
		);

		await n8n.canvas.openNode('Discourse1');
		await expect(n8n.ndv.getInputPanel()).toBeVisible();
		await expect(n8n.ndv.getOutputPanel()).toBeVisible();
	});
});
