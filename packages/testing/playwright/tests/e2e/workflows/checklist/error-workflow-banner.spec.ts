import { test, expect } from '../../../../fixtures/base';
import { nanoid } from 'nanoid';

const SCHEDULE_TRIGGER_NODE_NAME = 'Schedule Trigger';

test.describe(
	'Error Workflow Banner - GHC-7368',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test('should show error workflow as incomplete when not set', async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });

			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();
			await expect(n8n.canvas.getErrorActionItem()).toBeVisible();

			// Verify it shows as incomplete (no checkmark icon)
			const errorAction = n8n.canvas.getErrorActionItem();
			await expect(errorAction.locator('svg[data-icon="circle-check"]')).toBeHidden();
		});

		test('should show error workflow as complete after setting it in workflow settings', async ({
			n8n,
			api,
		}) => {
			// Create and activate an error workflow
			const errorWorkflowName = `Error Handler ${nanoid()}`;
			const errorWorkflow = await api.workflows.createWorkflow({
				name: errorWorkflowName,
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

			// Create main workflow
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			// Verify error workflow action is shown as incomplete
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();
			const errorActionBefore = n8n.canvas.getErrorActionItem();
			await expect(errorActionBefore).toBeVisible();
			await expect(errorActionBefore.locator('svg[data-icon="circle-check"]')).toBeHidden();

			// Set error workflow in settings
			await n8n.workflowSettingsModal.open();
			await expect(n8n.workflowSettingsModal.getModal()).toBeVisible();
			await n8n.workflowSettingsModal.selectErrorWorkflow(errorWorkflowName);
			await n8n.workflowSettingsModal.clickSave();
			await expect(n8n.page.getByTestId('workflow-settings-dialog')).toBeHidden();

			// Re-open the production checklist
			await n8n.canvas.clickProductionChecklistButton();
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			// BUG: Error workflow action should now show as complete with checkmark
			const errorActionAfter = n8n.canvas.getErrorActionItem();
			await expect(errorActionAfter).toBeVisible();
			await expect(errorActionAfter.locator('svg[data-icon="circle-check"]')).toBeVisible();
		});

		test('should update settings counter badge when error workflow is set', async ({
			n8n,
			api,
		}) => {
			// Create and activate an error workflow
			const errorWorkflowName = `Error Handler ${nanoid()}`;
			const errorWorkflow = await api.workflows.createWorkflow({
				name: errorWorkflowName,
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

			// Create main workflow
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			// Close the popover to see the badge
			await n8n.page.locator('body').click({ position: { x: 0, y: 0 } });
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeHidden();

			// Get initial count from badge
			const checklistButton = n8n.canvas.getProductionChecklistButton();
			const countBadgeBefore = checklistButton.getByTestId('suggested-action-count');
			await expect(countBadgeBefore).toBeVisible();
			const initialCount = await countBadgeBefore.textContent();
			const initialCountNum = parseInt(initialCount || '0', 10);

			// Set error workflow in settings
			await n8n.workflowSettingsModal.open();
			await expect(n8n.workflowSettingsModal.getModal()).toBeVisible();
			await n8n.workflowSettingsModal.selectErrorWorkflow(errorWorkflowName);
			await n8n.workflowSettingsModal.clickSave();
			await expect(n8n.page.getByTestId('workflow-settings-dialog')).toBeHidden();

			// BUG: The counter badge should decrease by 1 after setting error workflow
			const countBadgeAfter = checklistButton.getByTestId('suggested-action-count');
			const finalCount = await countBadgeAfter.textContent();
			const finalCountNum = parseInt(finalCount || '0', 10);

			expect(finalCountNum).toBe(initialCountNum - 1);
		});

		test('should persist error workflow setting after page reload', async ({ n8n, api }) => {
			// Create and activate an error workflow
			const errorWorkflowName = `Error Handler ${nanoid()}`;
			const errorWorkflow = await api.workflows.createWorkflow({
				name: errorWorkflowName,
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

			// Create main workflow
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			// Set error workflow in settings
			await n8n.workflowSettingsModal.open();
			await expect(n8n.workflowSettingsModal.getModal()).toBeVisible();
			await n8n.workflowSettingsModal.selectErrorWorkflow(errorWorkflowName);
			await n8n.workflowSettingsModal.clickSave();
			await expect(n8n.page.getByTestId('workflow-settings-dialog')).toBeHidden();

			// Reload the page
			await n8n.page.reload();

			// Re-open the production checklist
			await n8n.canvas.clickProductionChecklistButton();
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			// BUG: Error workflow should still show as complete after reload
			const errorAction = n8n.canvas.getErrorActionItem();
			await expect(errorAction).toBeVisible();
			await expect(errorAction.locator('svg[data-icon="circle-check"]')).toBeVisible();
		});
	},
);
