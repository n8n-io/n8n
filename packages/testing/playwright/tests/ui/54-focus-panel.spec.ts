import { test, expect } from '../../fixtures/base';
import type { TestRequirements } from '../../Types';

test.describe('Focus panel', () => {
	test.describe('With experimental NDV in focus panel enabled', () => {
		const requirements: TestRequirements = {
			storage: {
				N8N_EXPERIMENT_OVERRIDES: JSON.stringify({ ndv_in_focus_panel: 'variant' }),
			},
		};

		test('should keep showing selected node when canvas is clicked while mapper popover is shown', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements(requirements);
			await n8n.start.fromImportedWorkflow('Test_workflow_3.json');
			await n8n.canvas.clickZoomToFitButton();
			await n8n.canvas.deselectAll();
			await n8n.canvas.toggleFocusPanelButton().click();
			await n8n.canvas.nodeByName('Set').click();
			await expect(n8n.canvas.focusPanel.getHeader()).toHaveText('Set');
			await n8n.canvas.focusPanel.getParameterInputField('assignments.assignments.0.value').focus();
			await expect(n8n.canvas.focusPanel.getMapper()).toBeVisible();

			// Assert that mapper is closed but the Set node is still selected and shown in
			await n8n.canvas.canvasBody().click({ position: { x: 0, y: 0 } });

			await expect(n8n.canvas.focusPanel.getMapper()).not.toBeVisible();
			await expect(n8n.canvas.focusPanel.getHeader()).toHaveText('Set');
			await expect(n8n.canvas.selectedNodes()).toHaveCount(1);

			// Assert that another click on canvas does de-select the Set node
			await n8n.canvas.canvasBody().click({ position: { x: 0, y: 0 } });

			await expect(n8n.canvas.focusPanel.getHeader()).not.toBeVisible();
			await expect(n8n.canvas.selectedNodes()).toHaveCount(0);
		});
	});
});
