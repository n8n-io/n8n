import { test, expect } from '../../fixtures/base';
import type { TestRequirements } from '../../Types';

const requirements: TestRequirements = {
	workflow: 'Test_workflow_1.json',
	storage: {
		N8N_EXPERIMENT_OVERRIDES: JSON.stringify({ ndv_in_focus_panel: 'variant' }),
	},
};

test.describe('SUG-121 Fields reset after closing NDV', () => {
	test('should preserve changes to parameters after closing NDV when focus panel is open', async ({
		n8n,
		setupRequirements,
	}) => {
		await setupRequirements(requirements);
		await n8n.canvas.clickZoomToFitButton();
		await n8n.canvas.toggleFocusPanelButton().click();
		await n8n.canvas.canvasPane().click();
		await n8n.canvas.nodeByName('Code').dblclick();
		await n8n.ndv.getParameterByLabel('JavaScript').getByRole('textbox').fill('alert(1)');
		await n8n.ndv.close();
		await n8n.canvas.nodeByName('Code').dblclick();
		await expect(n8n.ndv.getParameterByLabel('JavaScript').getByRole('textbox')).toHaveText(
			'alert(1)',
		);
	});
});
