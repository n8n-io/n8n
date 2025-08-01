import { test, expect } from '../../fixtures/base';
import type { TestRequirements } from '../../Types';

const requirements: TestRequirements = {
	workflow: {
		'Test_9999_SUG_38.json': 'SUG_38_Test_Workflow',
	},
};

test.describe('SUG-38 Inline expression previews are not displayed in NDV', () => {
	test("should show resolved inline expression preview in NDV if the node's input data is populated", async ({
		n8n,
		setupRequirements,
	}) => {
		// Setup requirements - imports workflow and navigates to canvas
		await setupRequirements(requirements);

		// Click zoom to fit
		await n8n.canvas.clickZoomToFitButton();

		// Execute workflow and wait for completion
		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
			'Workflow executed successfully',
		);

		// Open the 'Repro1' node
		await n8n.canvas.openNode('Repro1');

		// Assert inline expression is valid
		await n8n.ndv.assertInlineExpressionValid();

		// Verify parameter expression preview value shows 'hello there'
		await expect(n8n.ndv.getParameterExpressionPreviewValue()).toHaveText('hello there');
	});
});
