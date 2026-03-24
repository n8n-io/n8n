import { test, expect } from '../../../../fixtures/base';

const SCHEDULE_TRIGGER_NODE_NAME = 'Schedule Trigger';

test.describe(
	'Workflow Production Checklist',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
		});

		test('should show suggested actions automatically when workflow is first published', async ({
			n8n,
		}) => {
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });

			await expect(n8n.canvas.getProductionChecklistButton()).toBeHidden();

			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			await expect(n8n.canvas.getProductionChecklistButton()).toBeVisible();
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();
			await expect(n8n.canvas.getErrorActionItem()).toBeVisible();
			await expect(n8n.canvas.getTimeSavedActionItem()).toBeVisible();
		});

		test('should display evaluations action when AI node exists and feature is enabled', async ({
			n8n,
		}) => {
			await n8n.api.enableFeature('evaluation');

			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.addNode('OpenAI', { action: 'Message a model', closeNDV: true });

			await n8n.canvas.nodeDisableButton('Message a model').click();

			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			await expect(n8n.canvas.getEvaluationsActionItem()).toBeVisible();
			await n8n.canvas.getEvaluationsActionItem().click();

			await expect(n8n.page).toHaveURL(/\/evaluation/);
		});

		test('should open workflow settings modal when error workflow action is clicked', async ({
			n8n,
		}) => {
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			const errorAction = n8n.canvas.getErrorActionItem();
			await expect(errorAction).toBeVisible();
			await errorAction.click();

			await expect(n8n.page.getByTestId('workflow-settings-dialog')).toBeVisible();
			await expect(n8n.page.getByTestId('workflow-settings-error-workflow')).toBeVisible();
		});

		test('should open workflow settings modal when time saved action is clicked', async ({
			n8n,
		}) => {
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			const timeAction = n8n.canvas.getTimeSavedActionItem();
			await expect(timeAction).toBeVisible();
			await timeAction.click();

			await expect(n8n.page.getByTestId('workflow-settings-dialog')).toBeVisible();
		});

		test('should allow ignoring individual actions', async ({ n8n }) => {
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			await expect(n8n.canvas.getProductionChecklistActionItem().first()).toContainText('error');
			await n8n.canvas.getProductionChecklistActionItem().first().getByTitle('Ignore').click();
			await expect(n8n.canvas.getErrorActionItem()).toBeHidden();

			await n8n.page.locator('body').click({ position: { x: 0, y: 0 } });
			await n8n.canvas.clickProductionChecklistButton();

			await expect(n8n.canvas.getErrorActionItem()).toBeHidden();
			await expect(n8n.canvas.getTimeSavedActionItem()).toBeVisible();
		});

		// Flaky in multi-main mode
		test.fixme('should show completed state for configured actions', async ({ n8n, api }) => {
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

			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			await n8n.workflowSettingsModal.open();
			await expect(n8n.workflowSettingsModal.getModal()).toBeVisible();

			await n8n.workflowSettingsModal.selectErrorWorkflow('Error Handler');
			await n8n.workflowSettingsModal.clickSave();
			await expect(n8n.page.getByTestId('workflow-settings-dialog')).toBeHidden();

			await n8n.canvas.clickProductionChecklistButton();
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			await expect(
				n8n.canvas
					.getProductionChecklistActionItem()
					.first()
					.locator('svg[data-icon="circle-check"]'),
			).toBeVisible();
		});

		test('should allow ignoring all actions with confirmation', async ({ n8n }) => {
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			await n8n.canvas.clickProductionChecklistIgnoreAll();

			await expect(n8n.page.locator('.el-message-box')).toBeVisible();
			await n8n.page
				.locator('.el-message-box__btns button')
				.filter({ hasText: /ignore for all workflows/i })
				.click();

			await expect(n8n.canvas.getProductionChecklistButton()).toBeHidden();
		});

		test('should update checklist when error workflow is configured (GHC-7379)', async ({
			n8n,
			api,
		}) => {
			// Create and activate an error handler workflow
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

			// Create and activate main workflow
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			// Verify production checklist shows incomplete error workflow action
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();
			const errorAction = n8n.canvas.getErrorActionItem();
			await expect(errorAction).toBeVisible();

			// Verify action is NOT completed (no check icon)
			await expect(errorAction.locator('svg[data-icon="circle-check"]')).toBeHidden();

			// Close the popover
			await n8n.page.locator('body').click({ position: { x: 0, y: 0 } });
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeHidden();

			// Open workflow settings and configure error workflow
			await n8n.workflowSettingsModal.open();
			await expect(n8n.workflowSettingsModal.getModal()).toBeVisible();
			await n8n.workflowSettingsModal.selectErrorWorkflow('Error Handler');
			await n8n.workflowSettingsModal.clickSave();

			// Wait for settings to be saved
			await expect(n8n.page.getByTestId('workflow-settings-dialog')).toBeHidden();

			// Re-open the production checklist
			await n8n.canvas.clickProductionChecklistButton();
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			// Bug: The error workflow action should now show as completed with a check icon
			// but it doesn't update after saving the workflow settings
			const updatedErrorAction = n8n.canvas.getErrorActionItem();
			await expect(updatedErrorAction).toBeVisible();
			await expect(updatedErrorAction.locator('svg[data-icon="circle-check"]')).toBeVisible();
		});

		test('should update checklist when time saved is configured (GHC-7379)', async ({ n8n }) => {
			// Create and activate workflow
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			// Verify production checklist shows incomplete time saved action
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();
			const timeSavedAction = n8n.canvas.getTimeSavedActionItem();
			await expect(timeSavedAction).toBeVisible();

			// Verify action is NOT completed (no check icon)
			await expect(timeSavedAction.locator('svg[data-icon="circle-check"]')).toBeHidden();

			// Close the popover
			await n8n.page.locator('body').click({ position: { x: 0, y: 0 } });
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeHidden();

			// Open workflow settings and configure time saved
			await n8n.workflowSettingsModal.open();
			await expect(n8n.workflowSettingsModal.getModal()).toBeVisible();

			// Configure time saved (5 minutes)
			const timeSavedInput = n8n.page.getByTestId('workflow-settings-time-saved-input');
			await timeSavedInput.fill('5');

			await n8n.workflowSettingsModal.clickSave();

			// Wait for settings to be saved
			await expect(n8n.page.getByTestId('workflow-settings-dialog')).toBeHidden();

			// Re-open the production checklist
			await n8n.canvas.clickProductionChecklistButton();
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			// Bug: The time saved action should now show as completed with a check icon
			// but it doesn't update after saving the workflow settings
			const updatedTimeSavedAction = n8n.canvas.getTimeSavedActionItem();
			await expect(updatedTimeSavedAction).toBeVisible();
			await expect(updatedTimeSavedAction.locator('svg[data-icon="circle-check"]')).toBeVisible();
		});
	},
);
