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
		await setupRequirements(requirements);

		await n8n.canvas.clickZoomToFitButton();

		await n8n.workflowComposer.executeWorkflowAndWaitForNotification(
			'Workflow executed successfully',
		);

		await n8n.canvas.openNode('Repro1');

		await expect(n8n.ndv.getParameterExpressionPreviewValue()).toBeVisible();

		await expect(n8n.ndv.getParameterExpressionPreviewValue()).toHaveText('hello there');
	});
});
