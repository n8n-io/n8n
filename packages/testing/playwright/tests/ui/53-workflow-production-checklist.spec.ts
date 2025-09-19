import { test, expect } from '../../fixtures/base';

const SCHEDULE_TRIGGER_NODE_NAME = 'Schedule Trigger';

test.describe('Workflow Production Checklist', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.goHome();
		await n8n.workflows.clickAddWorkflowButton();
	});

	test('should show suggested actions automatically when workflow is first activated', async ({
		n8n,
	}) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.saveWorkflow();

		await expect(n8n.canvas.getProductionChecklistButton()).toBeHidden();

		await n8n.canvas.activateWorkflow();

		await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
		await n8n.workflowActivationModal.close();

		await expect(n8n.canvas.getProductionChecklistButton()).toBeVisible();
		await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();
		await expect(n8n.canvas.getProductionChecklistActionItem()).toHaveCount(2);
		await expect(n8n.canvas.getErrorActionItem()).toBeVisible();
		await expect(n8n.canvas.getTimeSavedActionItem()).toBeVisible();
	});

	test('should display evaluations action when AI node exists and feature is enabled', async ({
		n8n,
		api,
	}) => {
		await api.enableFeature('evaluation');

		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.addNode('OpenAI', { action: 'Create an assistant', closeNDV: true });

		await n8n.canvas.nodeDisableButton('Create an assistant').click();

		await n8n.canvas.saveWorkflow();
		await n8n.canvas.activateWorkflow();
		await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
		await n8n.workflowActivationModal.close();

		await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();
		await expect(n8n.canvas.getProductionChecklistActionItem()).toHaveCount(3);

		await expect(n8n.canvas.getEvaluationsActionItem()).toBeVisible();
		await n8n.canvas.getEvaluationsActionItem().click();

		await expect(n8n.page).toHaveURL(/\/evaluation/);
	});

	test('should open workflow settings modal when error workflow action is clicked', async ({
		n8n,
	}) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.saveWorkflow();
		await n8n.canvas.activateWorkflow();
		await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
		await n8n.workflowActivationModal.close();

		await expect(n8n.canvas.getProductionChecklistPopover()).toBeVisible();

		const errorAction = n8n.canvas.getErrorActionItem();
		await expect(errorAction).toBeVisible();
		await errorAction.click();

		await expect(n8n.page.getByTestId('workflow-settings-dialog')).toBeVisible();
		await expect(n8n.page.getByTestId('workflow-settings-error-workflow')).toBeVisible();
	});

	test('should open workflow settings modal when time saved action is clicked', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.saveWorkflow();
		await n8n.canvas.activateWorkflow();
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
		await n8n.canvas.saveWorkflow();
		await n8n.canvas.activateWorkflow();
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

	test('should show completed state for configured actions', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.saveWorkflow();
		await n8n.canvas.activateWorkflow();
		await expect(n8n.workflowActivationModal.getModal()).toBeVisible();
		await n8n.workflowActivationModal.close();

		await n8n.workflowSettingsModal.open();
		await expect(n8n.workflowSettingsModal.getModal()).toBeVisible();

		await n8n.workflowSettingsModal.selectErrorWorkflow('My workflow');
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
		await n8n.canvas.saveWorkflow();
		await n8n.canvas.activateWorkflow();
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
});
