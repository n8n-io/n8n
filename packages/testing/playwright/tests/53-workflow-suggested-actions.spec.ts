import type { Page } from '@playwright/test';

import { test, expect } from '../fixtures/base';

const SCHEDULE_TRIGGER_NODE_NAME = 'Schedule Trigger';

test.describe('Workflow Suggested Actions', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.goHome();
		await n8n.workflows.clickAddWorkflowButton();
	});

	// Helper functions for suggested actions UI
	const getSuggestedActionsButton = (page: Page) => page.getByTestId('suggested-action-count');
	const getSuggestedActionItem = (page: Page, text?: string) => {
		const items = page.getByTestId('suggested-action-item');
		if (text) {
			return items.getByText(text);
		}
		return items;
	};
	const getSuggestedActionsPopover = (page: Page) =>
		page.locator('[data-reka-popper-content-wrapper=""]').filter({ hasText: /./ });
	const getActionItemByActionId = (page: Page, id: string) =>
		page.getByTestId('suggested-action-item').filter({ hasText: new RegExp(id, 'i') });
	const getActionIgnoreButton = (page: Page, actionId: string) =>
		getActionItemByActionId(page, actionId).getByTestId('suggested-action-ignore');
	const getIgnoreAllButton = (page: Page) => page.getByTestId('suggested-action-ignore-all');
	const getActionCompletedIcon = (page: Page, actionId: string) =>
		getActionItemByActionId(page, actionId).locator('[data-icon="circle-check"]');

	const getActivationModal = (page: Page) => page.getByTestId('activation-modal');
	const getErrorActionItem = (page: Page) =>
		getSuggestedActionItem(page, 'Set up error notifications');
	const getTimeSavedActionItem = (page: Page) => getSuggestedActionItem(page, 'Track time saved');
	const getEvaluationsActionItem = (page: Page) =>
		getSuggestedActionItem(page, 'Test reliability of AI steps');

	const closeActivationModal = async (page: Page) => {
		await expect(getActivationModal(page)).toBeVisible();

		// click checkbox so it does not show again
		await getActivationModal(page).getByText("Don't show again").click();

		// confirm modal
		await getActivationModal(page).getByRole('button', { name: 'Got it' }).click();
	};

	// Helper to activate workflow
	const activateWorkflow = async (page: Page) => {
		const responsePromise = page.waitForResponse(
			(response) =>
				response.url().includes('/rest/workflows/') && response.request().method() === 'PATCH',
		);
		await page.getByTestId('workflow-activate-switch').click();
		await responsePromise;
	};

	// Helper to open workflow settings modal
	const openWorkflowSettings = async (page: Page) => {
		await page.getByTestId('workflow-menu').click();
		await page.getByTestId('workflow-menu-item-settings').click();
		await expect(page.getByTestId('workflow-settings-dialog')).toBeVisible();
	};

	test('should show suggested actions automatically when workflow is first activated', async ({
		n8n,
	}) => {
		// Add a schedule trigger node (activatable)
		await n8n.canvas.addNodeAndCloseNDV(SCHEDULE_TRIGGER_NODE_NAME);
		await n8n.canvas.saveWorkflow();

		// Verify suggested actions button is not visible
		await expect(getSuggestedActionsButton(n8n.page)).toBeHidden();

		// Activate the workflow
		await activateWorkflow(n8n.page);

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
		await activateWorkflow(n8n.page);
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
		await activateWorkflow(n8n.page);
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
		await activateWorkflow(n8n.page);
		await closeActivationModal(n8n.page);

		await expect(getSuggestedActionsPopover(n8n.page)).toBeVisible();

		// Click time saved action
		const timeAction = getTimeSavedActionItem(n8n.page);
		await expect(timeAction).toBeVisible();
		await timeAction.click();

		// Verify workflow settings modal opens
		await expect(n8n.page.getByTestId('workflow-settings-dialog')).toBeVisible();
	});

	// test('should allow ignoring individual actions', async ({ n8n }) => {
	// 	// Add schedule trigger
	// 	await n8n.canvas.addNodeAndCloseNDV(SCHEDULE_TRIGGER_NODE_NAME);
	// 	await n8n.canvas.saveWorkflow();
	// 	await activateWorkflow(n8n.page);
	// 	await closeActivationModal(n8n.page);

	// 	// Suggested actions popover should be open
	// 	await expect(getSuggestedActionsPopover(n8n.page)).toBeVisible();

	// 	// Verify error workflow action is visible
	// 	await expect(getActionItemByActionId(n8n.page, 'errorWorkflow')).toBeVisible();

	// 	// Click ignore button for error workflow
	// 	await getActionIgnoreButton(n8n.page, 'errorWorkflow').click();

	// 	// Close and reopen popover
	// 	await n8n.page.locator('body').click({ position: { x: 0, y: 0 } });
	// 	await getSuggestedActionsButton(n8n.page).click();

	// 	// Verify error workflow action is no longer visible
	// 	await expect(
	// 		n8n.page.getByTestId('suggested-action-item').filter({ hasText: /errorWorkflow/i }),
	// 	).toBeHidden();
	// 	// But time saved should still be visible
	// 	await expect(
	// 		n8n.page.getByTestId('suggested-action-item').filter({ hasText: /time/i }),
	// 	).toBeVisible();
	// });

	// test('should show completed state for configured actions', async ({ n8n }) => {
	// 	// Add schedule trigger
	// 	await n8n.canvas.addNodeAndCloseNDV(SCHEDULE_TRIGGER_NODE_NAME);
	// 	await n8n.canvas.saveWorkflow();
	// 	await activateWorkflow(n8n.page);
	// 	await closeActivationModal(n8n.page);

	// 	// Open workflow settings and set error workflow
	// 	await openWorkflowSettings(n8n.page);

	// 	// Set an error workflow (we'll use a dummy value)
	// 	await n8n.page.getByTestId('workflow-settings-error-workflow').click();
	// 	const selectOptions = n8n.page.locator('.el-select-dropdown__item').filter({ hasText: /./ });
	// 	if ((await selectOptions.count()) > 1) {
	// 		await selectOptions.nth(1).click();
	// 	}

	// 	// Save settings
	// 	await n8n.page.getByTestId('workflow-settings-save-button').click();
	// 	await expect(n8n.page.getByTestId('workflow-settings-dialog')).toBeHidden();

	// 	// Open suggested actions
	// 	await getSuggestedActionsButton(n8n.page).click();
	// 	await expect(getSuggestedActionsPopover(n8n.page)).toBeVisible();

	// 	// Verify error workflow action shows as completed
	// 	await expect(getActionCompletedIcon(n8n.page, 'errorWorkflow')).toBeVisible();
	// });

	// test('should not show evaluations action without AI nodes', async ({ n8n, api }) => {
	// 	// Enable evaluations feature
	// 	await api.enableFeature('evaluation');

	// 	// Add schedule trigger (no AI nodes)
	// 	await n8n.canvas.addNodeAndCloseNDV(SCHEDULE_TRIGGER_NODE_NAME);
	// 	await n8n.canvas.saveWorkflow();
	// 	await activateWorkflow(n8n.page);

	// 	// Open suggested actions
	// 	await getSuggestedActionsButton(n8n.page).click();
	// 	await expect(getSuggestedActionsPopover(n8n.page)).toBeVisible();

	// 	// Verify evaluations action is not present
	// 	await expect(
	// 		n8n.page.getByTestId('suggested-action-item').filter({ hasText: /evaluation/i }),
	// 	).toBeHidden();
	// 	// But other actions should be visible
	// 	await expect(
	// 		n8n.page.getByTestId('suggested-action-item').filter({ hasText: /error/i }),
	// 	).toBeVisible();
	// 	await expect(
	// 		n8n.page.getByTestId('suggested-action-item').filter({ hasText: /time/i }),
	// 	).toBeVisible();
	// });

	// test('should allow ignoring all actions with confirmation', async ({ n8n }) => {
	// 	// Add schedule trigger
	// 	await n8n.canvas.addNodeAndCloseNDV(SCHEDULE_TRIGGER_NODE_NAME);
	// 	await n8n.canvas.saveWorkflow();
	// 	await activateWorkflow(n8n.page);
	// 	await closeActivationModal(n8n.page);

	// 	// Open suggested actions
	// 	await getSuggestedActionsButton(n8n.page).click();
	// 	await expect(getSuggestedActionsPopover(n8n.page)).toBeVisible();

	// 	// Click ignore all button
	// 	await getIgnoreAllButton(n8n.page).click();

	// 	// Confirm in the dialog
	// 	await expect(n8n.page.locator('.el-message-box')).toBeVisible();
	// 	await n8n.page
	// 		.locator('.el-message-box__btns button')
	// 		.filter({ hasText: /ignore for all workflows/i })
	// 		.click();

	// 	// Verify suggested actions button is no longer visible
	// 	await expect(getSuggestedActionsButton(n8n.page)).toBeHidden();
	// });
});
