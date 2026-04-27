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
	},
);

test.describe(
	'Production Checklist Badge Count (GHC-7843)',
	{
		annotation: [{ type: 'issue', description: 'GHC-7843' }],
	},
	() => {
		test('should show correct badge count when error workflow and time saved are configured', async ({
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

			// Start with a new workflow
			await n8n.start.fromBlankCanvas();
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });

			// Publish the workflow
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			// Get initial badge count - should show 0 completed
			const badge = n8n.canvas.getProductionChecklistButton();
			await expect(badge).toBeVisible();
			await expect(badge).toHaveText('0 / 2'); // 0 completed out of 2 actions (error workflow + time saved)

			// Configure error workflow
			await n8n.workflowSettingsModal.open();
			await expect(n8n.workflowSettingsModal.getModal()).toBeVisible();
			await n8n.workflowSettingsModal.selectErrorWorkflow('Error Handler');

			// Configure time saved (set to fixed mode with 10 minutes)
			await n8n.page.getByTestId('workflow-settings-time-saved-mode').click();
			await n8n.page.getByRole('option', { name: /fixed/i }).click();
			await n8n.page.getByTestId('workflow-settings-time-saved-per-execution').fill('10');

			// Save settings
			await n8n.workflowSettingsModal.clickSave();
			await expect(n8n.page.getByTestId('workflow-settings-dialog')).toBeHidden();

			// Badge should now show 2 completed out of 2
			await expect(badge).toHaveText('2 / 2');

			// Click the badge to open checklist
			await n8n.canvas.clickProductionChecklistButton();
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			// Both actions should show as completed (with checkmarks)
			const errorAction = n8n.canvas.getErrorActionItem();
			const timeSavedAction = n8n.canvas.getTimeSavedActionItem();

			await expect(errorAction.locator('svg[data-icon="circle-check"]')).toBeVisible();
			await expect(timeSavedAction.locator('svg[data-icon="circle-check"]')).toBeVisible();
		});

		test('should persist correct badge count after page reload', async ({ n8n, api, page }) => {
			// Create and activate an error workflow
			const errorWorkflow = await api.workflows.createWorkflow({
				name: 'Error Handler Reload',
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

			// Create a workflow via API with settings already configured
			const mainWorkflow = await api.workflows.createWorkflow({
				name: 'Main Workflow with Settings',
				nodes: [
					{
						id: 'schedule-trigger',
						name: SCHEDULE_TRIGGER_NODE_NAME,
						type: 'n8n-nodes-base.scheduleTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
				settings: {
					errorWorkflow: errorWorkflow.id,
					timeSavedPerExecution: 15,
					timeSavedMode: 'fixed',
				},
				active: false,
			});

			// Activate the workflow
			await api.workflows.activate(mainWorkflow.id, mainWorkflow.versionId);

			// Navigate to the workflow
			await n8n.navigate.toWorkflow(mainWorkflow.id);

			// Wait for page to load
			await expect(n8n.canvas.getNode(SCHEDULE_TRIGGER_NODE_NAME)).toBeVisible();

			// Badge should show 2 completed out of 2
			const badge = n8n.canvas.getProductionChecklistButton();
			await expect(badge).toBeVisible();
			await expect(badge).toHaveText('2 / 2');

			// Reload the page
			await page.reload();
			await expect(n8n.canvas.getNode(SCHEDULE_TRIGGER_NODE_NAME)).toBeVisible();

			// Badge should still show 2 completed out of 2 (this is where the bug likely occurs)
			await expect(badge).toBeVisible();
			await expect(badge).toHaveText('2 / 2');

			// Open checklist to verify completion states
			await n8n.canvas.clickProductionChecklistButton();
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			// Both actions should still show as completed
			const errorAction = n8n.canvas.getErrorActionItem();
			const timeSavedAction = n8n.canvas.getTimeSavedActionItem();

			await expect(errorAction.locator('svg[data-icon="circle-check"]')).toBeVisible();
			await expect(timeSavedAction.locator('svg[data-icon="circle-check"]')).toBeVisible();
		});

		test('should show correct count when viewing workflow from workflows list', async ({
			n8n,
			api,
		}) => {
			// Create and activate an error workflow
			const errorWorkflow = await api.workflows.createWorkflow({
				name: 'Error Handler List',
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

			// Create a workflow with settings via API
			const mainWorkflow = await api.workflows.createWorkflow({
				name: 'Workflow from List',
				nodes: [
					{
						id: 'schedule-trigger',
						name: SCHEDULE_TRIGGER_NODE_NAME,
						type: 'n8n-nodes-base.scheduleTrigger',
						parameters: {},
						typeVersion: 1,
						position: [0, 0],
					},
				],
				connections: {},
				settings: {
					errorWorkflow: errorWorkflow.id,
					timeSavedPerExecution: 20,
					timeSavedMode: 'fixed',
				},
				active: false,
			});
			await api.workflows.activate(mainWorkflow.id, mainWorkflow.versionId);

			// Navigate to workflows list first
			await n8n.navigate.toWorkflows();

			// Then navigate to the specific workflow
			await n8n.navigate.toWorkflow(mainWorkflow.id);
			await expect(n8n.canvas.getNode(SCHEDULE_TRIGGER_NODE_NAME)).toBeVisible();

			// Badge should show correct count even when coming from list
			const badge = n8n.canvas.getProductionChecklistButton();
			await expect(badge).toBeVisible();
			await expect(badge).toHaveText('2 / 2');

			// Verify completion states
			await n8n.canvas.clickProductionChecklistButton();
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			const errorAction = n8n.canvas.getErrorActionItem();
			const timeSavedAction = n8n.canvas.getTimeSavedActionItem();

			await expect(errorAction.locator('svg[data-icon="circle-check"]')).toBeVisible();
			await expect(timeSavedAction.locator('svg[data-icon="circle-check"]')).toBeVisible();
		});
	},
);
