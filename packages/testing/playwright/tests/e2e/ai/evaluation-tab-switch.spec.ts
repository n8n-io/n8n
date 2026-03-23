import { expect, test } from '../../../fixtures/base';
import { MANUAL_TRIGGER_NODE_DISPLAY_NAME } from '../../../config/constants';

test.describe(
	'Evaluation tab switching',
	{
		annotation: [{ type: 'owner', description: 'AI' }],
	},
	() => {
		test('should preserve nodes when switching to Evaluations tab and back after deleting evaluation trigger', async ({
			n8n,
		}) => {
			// Step 1: Create a workflow with some nodes
			await n8n.start.fromBlankCanvas();

			// Step 2: Add regular nodes to the workflow
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Code', { action: 'Code in JavaScript', closeNDV: true });

			// Verify nodes are added
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);

			// Save workflow to mark it as clean state
			await n8n.page.keyboard.press('Control+s');
			await n8n.notifications.waitForNotificationAndClose('Saved');

			// Step 3: Add Evaluation trigger
			await n8n.canvas.addNode('Evaluation Trigger', { closeNDV: true });

			// Verify evaluation trigger is added
			await expect(n8n.canvas.nodeByName('Evaluation Trigger')).toBeVisible();
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(3);

			// Step 4: Delete Evaluation trigger again
			await n8n.canvas.nodeByName('Evaluation Trigger').click();
			await n8n.page.keyboard.press('Delete');

			// Verify evaluation trigger is deleted
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);

			// Step 5: Click "Evaluations" tab - should trigger save confirmation modal
			const evaluationsTab = n8n.page.getByTestId('main-header-tabs').getByText('Tests');
			await evaluationsTab.click();

			// Step 6: Click "Save" in confirmation modal
			const confirmButton = n8n.page.getByRole('button', { name: 'Save' });
			await expect(confirmButton).toBeVisible({ timeout: 2000 });
			await confirmButton.click();

			// Wait for save to complete and navigation to Evaluations tab
			await expect(n8n.page).toHaveURL(/.*\/workflow\/.*\/evaluations$/);

			// Step 7: Go back to workflow tab
			const workflowTab = n8n.page.getByTestId('main-header-tabs').getByText('Editor');
			await workflowTab.click();

			// Wait for navigation back to workflow editor
			await expect(n8n.page).toHaveURL(/.*\/workflow\/.*$/);
			await expect(n8n.page).not.toHaveURL(/.*\/evaluations$/);

			// Step 8: Verify all nodes are still present - THIS IS THE BUG
			await expect(n8n.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME)).toBeVisible();
			await expect(n8n.canvas.nodeByName('Code')).toBeVisible();

			// Also verify the workflow has the expected number of nodes
			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
		});

		test('should preserve nodes when switching tabs multiple times', async ({ n8n }) => {
			// Create a workflow
			await n8n.start.fromBlankCanvas();

			// Add nodes
			await n8n.canvas.addNode('Manual Trigger');
			await n8n.canvas.addNode('Set', { action: 'Set values on items manually', closeNDV: true });

			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);

			// Save workflow
			await n8n.page.keyboard.press('Control+s');
			await n8n.notifications.waitForNotificationAndClose('Saved');

			// Switch to Evaluations tab without any evaluation trigger
			const evaluationsTab = n8n.page.getByTestId('main-header-tabs').getByText('Tests');
			await evaluationsTab.click();

			await expect(n8n.page).toHaveURL(/.*\/evaluations$/);

			// Switch back to workflow
			const workflowTab = n8n.page.getByTestId('main-header-tabs').getByText('Editor');
			await workflowTab.click();

			await expect(n8n.page).toHaveURL(/.*\/workflow\/.*$/);
			await expect(n8n.page).not.toHaveURL(/.*\/evaluations$/);

			// Verify nodes are still there
			await expect(n8n.canvas.nodeByName(MANUAL_TRIGGER_NODE_DISPLAY_NAME)).toBeVisible();
			await expect(n8n.canvas.nodeByName('Set')).toBeVisible();

			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(2);
		});
	},
);
