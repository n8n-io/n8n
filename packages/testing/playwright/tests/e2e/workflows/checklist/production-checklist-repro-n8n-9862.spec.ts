import { test, expect } from '../../../../fixtures/base';

const SCHEDULE_TRIGGER_NODE_NAME = 'Schedule Trigger';

/**
 * Reproduction test for N8N-9862: Production checklist not updated when user adds an error workflow
 *
 * Expected behavior:
 * - When a user adds an error workflow via settings, the checklist should immediately update
 * - The count should increment (e.g., from "0 / 3" to "1 / 3")
 * - The error workflow action should show as completed (with a checkmark icon)
 *
 * Actual behavior:
 * - The checklist does not update until the page is refreshed
 * - The count remains unchanged
 * - The error workflow action still shows as incomplete
 */
test.describe(
	'Production Checklist - Error Workflow Update (N8N-9862)',
	{
		annotation: [{ type: 'issue', description: 'N8N-9862' }],
	},
	() => {
		// Marked as fixme due to workflow settings save button flakiness in tests
		// This is the same issue affecting the test at production-checklist.spec.ts:109
		test.fixme('should update checklist immediately when user adds error workflow', async ({
			n8n,
			api,
		}) => {
			// Create and activate an error workflow
			const errorWorkflow = await api.workflows.createWorkflow({
				name: 'Error Handler',
				nodes: [
					{
						id: 'error-trigger',
						name: 'Error Trigger',
						type: 'n8n-nodes-base.errorTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
				settings: {},
				active: false,
			});
			await api.workflows.activate(errorWorkflow.id, errorWorkflow.versionId);

			// Create a new workflow and publish it
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			// Verify initial state: checklist is open with error workflow action incomplete
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();
			const errorActionBefore = n8n.canvas.getErrorActionItem();
			await expect(errorActionBefore).toBeVisible();
			await expect(errorActionBefore.locator('svg[data-icon="circle-check"]')).toBeHidden();

			// Get initial count (should be "0 / N")
			const initialCount = await n8n.canvas.getProductionChecklistButton().textContent();
			expect(initialCount).toMatch(/0\s*\/\s*\d+/);

			// Add error workflow via workflow settings
			await n8n.workflowSettingsModal.open();
			await expect(n8n.workflowSettingsModal.getModal()).toBeVisible();
			await n8n.workflowSettingsModal.selectErrorWorkflow('Error Handler');
			await n8n.workflowSettingsModal.clickSave();
			await expect(n8n.workflowSettingsModal.getModal()).toBeHidden();

			// BUG REPRODUCTION: The checklist should now show the error workflow action as complete
			// and the count should increment, but it doesn't until page refresh

			// Re-open the checklist popover
			await n8n.canvas.clickProductionChecklistButton();
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			// EXPECTED: Error workflow action should now show the completed checkmark
			const errorActionAfter = n8n.canvas.getErrorActionItem();
			await expect(errorActionAfter).toBeVisible();
			await expect(errorActionAfter.locator('svg[data-icon="circle-check"]')).toBeVisible();

			// EXPECTED: Count should have incremented (e.g., from "0 / 3" to "1 / 3")
			const updatedCount = await n8n.canvas.getProductionChecklistButton().textContent();
			expect(updatedCount).toMatch(/1\s*\/\s*\d+/);
		});
	},
);
