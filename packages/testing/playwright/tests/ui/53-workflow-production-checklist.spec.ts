import {
	getErrorActionItem,
	getEvaluationsActionItem,
	getIgnoreAllButton,
	getSuggestedActionItem,
	getSuggestedActionsButton,
	getSuggestedActionsPopover,
	getTimeSavedActionItem,
} from '../../composables/ProductionChecklist';
import { closeActivationModal } from '../../composables/WorkflowActivationModal';
import { openWorkflowSettings } from '../../composables/WorkflowSettingsModal';
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
		// Add a schedule trigger node (activatable)
		await n8n.canvas.addNodeAndCloseNDV(SCHEDULE_TRIGGER_NODE_NAME);
		await n8n.canvas.saveWorkflow();

		// Verify suggested actions button is not visible
		await expect(getSuggestedActionsButton(n8n.page)).toBeHidden();

		// Activate the workflow
		await n8n.canvas.activateWorkflow();

		// Activation Modal should be visible since it's first activation
		await closeActivationModal(n8n.page);

		// Verify suggested actions button and popover is visible
		await expect(getSuggestedActionsButton(n8n.page)).toBeVisible();
		await expect(getSuggestedActionsPopover(n8n.page)).toBeVisible();
		await expect(getSuggestedActionItem(n8n.page)).toHaveCount(2);
		await expect(getErrorActionItem(n8n.page)).toBeVisible();
		await expect(getTimeSavedActionItem(n8n.page)).toBeVisible();
	});

	test('should display evaluations action when AI node exists and feature is enabled', async ({
		n8n,
		api,
	}) => {
		// Enable evaluations feature
		await api.enableFeature('evaluation');

		// Add schedule trigger and AI node
		await n8n.canvas.addNodeAndCloseNDV(SCHEDULE_TRIGGER_NODE_NAME);
		await n8n.canvas.addNodeAndCloseNDV('OpenAI', 'Create an assistant');

		await n8n.canvas.nodeDisableButton('Create an assistant').click();

		await n8n.canvas.saveWorkflow();
		await n8n.canvas.activateWorkflow();
		await closeActivationModal(n8n.page);

		// Suggested actions should be open
		await expect(getSuggestedActionsPopover(n8n.page)).toBeVisible();
		await expect(getSuggestedActionItem(n8n.page)).toHaveCount(3);

		// Verify evaluations action is present
		await expect(getEvaluationsActionItem(n8n.page)).toBeVisible();
		await getEvaluationsActionItem(n8n.page).click();

		// Verify navigation to evaluations page
		await expect(n8n.page).toHaveURL(/\/evaluation/);
	});

	test('should open workflow settings modal when error workflow action is clicked', async ({
		n8n,
	}) => {
		// Add schedule trigger
		await n8n.canvas.addNodeAndCloseNDV(SCHEDULE_TRIGGER_NODE_NAME);
		await n8n.canvas.saveWorkflow();
		await n8n.canvas.activateWorkflow();
		await closeActivationModal(n8n.page);

		await expect(getSuggestedActionsPopover(n8n.page)).toBeVisible();

		// Click error workflow action
		const errorAction = getErrorActionItem(n8n.page);
		await expect(errorAction).toBeVisible();
		await errorAction.click();

		// Verify workflow settings modal opens
		await expect(n8n.page.getByTestId('workflow-settings-dialog')).toBeVisible();
		await expect(n8n.page.getByTestId('workflow-settings-error-workflow')).toBeVisible();
	});

	test('should open workflow settings modal when time saved action is clicked', async ({ n8n }) => {
		// Add schedule trigger
		await n8n.canvas.addNodeAndCloseNDV(SCHEDULE_TRIGGER_NODE_NAME);
		await n8n.canvas.saveWorkflow();
		await n8n.canvas.activateWorkflow();
		await closeActivationModal(n8n.page);

		await expect(getSuggestedActionsPopover(n8n.page)).toBeVisible();

		// Click time saved action
		const timeAction = getTimeSavedActionItem(n8n.page);
		await expect(timeAction).toBeVisible();
		await timeAction.click();

		// Verify workflow settings modal opens
		await expect(n8n.page.getByTestId('workflow-settings-dialog')).toBeVisible();
	});

	test('should allow ignoring individual actions', async ({ n8n }) => {
		await n8n.canvas.addNodeAndCloseNDV(SCHEDULE_TRIGGER_NODE_NAME);
		await n8n.canvas.saveWorkflow();
		await n8n.canvas.activateWorkflow();
		await closeActivationModal(n8n.page);

		// Suggested actions popover should be open
		await expect(getSuggestedActionsPopover(n8n.page)).toBeVisible();

		// Verify error workflow action is visible
		await expect(getSuggestedActionItem(n8n.page).first()).toContainText('error');
		await getSuggestedActionItem(n8n.page).first().getByTitle('Ignore').click();
		await n8n.page.waitForTimeout(500); // items disappear after timeout, not arbitrary
		await expect(getErrorActionItem(n8n.page)).toBeHidden();

		// Close and reopen popover
		await n8n.page.locator('body').click({ position: { x: 0, y: 0 } });
		await getSuggestedActionsButton(n8n.page).click();

		// Verify error workflow action is still no longer visible
		await expect(getErrorActionItem(n8n.page)).toBeHidden();
		await expect(getTimeSavedActionItem(n8n.page)).toBeVisible();
	});

	test('should show completed state for configured actions', async ({ n8n }) => {
		// Add schedule trigger and activate workflow
		await n8n.canvas.addNodeAndCloseNDV(SCHEDULE_TRIGGER_NODE_NAME);
		await n8n.canvas.saveWorkflow();
		await n8n.canvas.activateWorkflow();
		await closeActivationModal(n8n.page);

		// Open workflow settings and set error workflow
		await openWorkflowSettings(n8n.page);

		// Set an error workflow (we'll use a dummy value)
		await n8n.page.getByTestId('workflow-settings-error-workflow').click();
		await n8n.page.getByRole('option', { name: 'My workflow' }).first().click();
		await n8n.page.getByRole('button', { name: 'Save' }).click();
		await expect(n8n.page.getByTestId('workflow-settings-dialog')).toBeHidden();

		// Open suggested actions
		await getSuggestedActionsButton(n8n.page).click();
		await expect(getSuggestedActionsPopover(n8n.page)).toBeVisible();

		// Verify error workflow action shows as completed
		await expect(
			getSuggestedActionItem(n8n.page).first().locator('svg[data-icon="circle-check"]'),
		).toBeVisible();
	});

	test('should allow ignoring all actions with confirmation', async ({ n8n }) => {
		// Add schedule trigger
		await n8n.canvas.addNodeAndCloseNDV(SCHEDULE_TRIGGER_NODE_NAME);
		await n8n.canvas.saveWorkflow();
		await n8n.canvas.activateWorkflow();
		await closeActivationModal(n8n.page);

		// Suggested actions should be open
		await expect(getSuggestedActionsPopover(n8n.page)).toBeVisible();

		// Click ignore all button
		await getIgnoreAllButton(n8n.page).click();

		// Confirm in the dialog
		await expect(n8n.page.locator('.el-message-box')).toBeVisible();
		await n8n.page
			.locator('.el-message-box__btns button')
			.filter({ hasText: /ignore for all workflows/i })
			.click();

		// Verify suggested actions button is no longer visible
		await expect(getSuggestedActionsButton(n8n.page)).toBeHidden();
	});
});
