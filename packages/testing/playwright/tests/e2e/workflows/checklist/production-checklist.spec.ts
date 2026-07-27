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

			await expect(n8n.workflowSettingsModal.getModal()).toBeVisible();
			await expect(n8n.workflowSettingsModal.getErrorWorkflowField()).toBeVisible();
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

			await expect(n8n.workflowSettingsModal.getModal()).toBeVisible();
		});

		test('should allow ignoring individual actions', async ({ n8n }) => {
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			await expect(n8n.canvas.getProductionChecklistActionItem().first()).toContainText('error');
			await n8n.canvas.ignoreProductionChecklistAction();
			await expect(n8n.canvas.getErrorActionItem()).toBeHidden();

			await n8n.canvas.clickOutsideModal();
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
			await expect(n8n.workflowSettingsModal.getModal()).toBeHidden();

			await n8n.canvas.clickProductionChecklistButton();
			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			await expect(n8n.canvas.getProductionChecklistActionCompletedIcon()).toBeVisible();
		});

		test('should allow ignoring all actions with confirmation', async ({ n8n }) => {
			await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
			await n8n.canvas.publishWorkflow();
			await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
			await n8n.workflowActivationModal.close();

			await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

			await n8n.canvas.clickProductionChecklistIgnoreAll();

			await n8n.canvas.confirmIgnoreAllForAllWorkflows();

			await expect(n8n.canvas.getProductionChecklistButton()).toBeHidden();
		});
	},
);
