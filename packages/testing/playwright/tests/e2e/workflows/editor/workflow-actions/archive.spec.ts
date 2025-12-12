import { SCHEDULE_TRIGGER_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';
import type { n8nPage } from '../../../../../pages/n8nPage';

async function saveWorkflowAndGetId(n8n: n8nPage): Promise<string> {
	const saveResponsePromise = n8n.page.waitForResponse(
		(response) =>
			response.url().includes('/rest/workflows') &&
			(response.request().method() === 'POST' || response.request().method() === 'PATCH'),
	);
	await n8n.canvas.saveWorkflow();
	const saveResponse = await saveResponsePromise;
	const {
		data: { id },
	} = await saveResponse.json();
	return id;
}

async function goToWorkflow(n8n: n8nPage, workflowId: string): Promise<void> {
	const loadResponsePromise = n8n.page.waitForResponse(
		(response) =>
			response.url().includes(`/rest/workflows/${workflowId}`) &&
			response.request().method() === 'GET' &&
			response.status() === 200,
	);
	await n8n.page.goto(`/workflow/${workflowId}`);
	await loadResponsePromise;
}

// eslint-disable-next-line playwright/no-skipped-test
test.skip('Workflow Archive', () => {
	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should not be able to archive or delete unsaved workflow', async ({ n8n }) => {
		await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
		await n8n.workflowSettingsModal.getWorkflowMenu().click();

		await expect(n8n.workflowSettingsModal.getDeleteMenuItem()).toBeHidden();
		await expect(n8n.workflowSettingsModal.getArchiveMenuItem().locator('..')).toHaveClass(
			/is-disabled/,
		);
	});

	test('should archive nonactive workflow and then delete it', async ({ n8n }) => {
		const workflowId = await saveWorkflowAndGetId(n8n);
		await expect(n8n.canvas.getArchivedTag()).not.toBeAttached();

		await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
		await n8n.workflowSettingsModal.getWorkflowMenu().click();

		await n8n.workflowSettingsModal.clickArchiveMenuItem();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
		await expect(n8n.page).toHaveURL(/\/workflows$/);

		await goToWorkflow(n8n, workflowId);

		await expect(n8n.canvas.getArchivedTag()).toBeVisible();
		await expect(n8n.canvas.getNodeCreatorPlusButton()).not.toBeAttached();

		await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
		await n8n.workflowSettingsModal.getWorkflowMenu().click();
		await n8n.workflowSettingsModal.clickDeleteMenuItem();
		await n8n.workflowSettingsModal.confirmDeleteModal();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
		await expect(n8n.page).toHaveURL(/\/workflows$/);
	});

	// eslint-disable-next-line n8n-local-rules/no-skipped-tests -- Flaky in multi-main mode
	test.skip('should archive published workflow and then delete it', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		const workflowId = await saveWorkflowAndGetId(n8n);
		await n8n.canvas.publishWorkflow();
		await n8n.page.keyboard.press('Escape');

		await expect(n8n.canvas.getPublishedIndicator()).toBeVisible();
		await expect(n8n.canvas.getArchivedTag()).not.toBeAttached();

		await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
		await n8n.workflowSettingsModal.getWorkflowMenu().click();
		await n8n.workflowSettingsModal.clickArchiveMenuItem();
		await n8n.workflowSettingsModal.confirmArchiveModal();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
		await expect(n8n.page).toHaveURL(/\/workflows$/);

		await goToWorkflow(n8n, workflowId);

		await expect(n8n.canvas.getArchivedTag()).toBeVisible();
		await expect(n8n.canvas.getNodeCreatorPlusButton()).not.toBeAttached();
		await expect(n8n.canvas.getPublishedIndicator()).not.toBeVisible();

		await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
		await n8n.workflowSettingsModal.getWorkflowMenu().click();
		await n8n.workflowSettingsModal.clickDeleteMenuItem();
		await n8n.workflowSettingsModal.confirmDeleteModal();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
		await expect(n8n.page).toHaveURL(/\/workflows$/);
	});

	test('should archive nonactive workflow and then unarchive it', async ({ n8n }) => {
		const workflowId = await saveWorkflowAndGetId(n8n);
		await expect(n8n.canvas.getArchivedTag()).not.toBeAttached();

		await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
		await n8n.workflowSettingsModal.getWorkflowMenu().click();

		await n8n.workflowSettingsModal.clickArchiveMenuItem();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
		await expect(n8n.page).toHaveURL(/\/workflows$/);

		await goToWorkflow(n8n, workflowId);

		await expect(n8n.canvas.getArchivedTag()).toBeVisible();
		await expect(n8n.canvas.getNodeCreatorPlusButton()).not.toBeAttached();

		await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
		await n8n.workflowSettingsModal.getWorkflowMenu().click();
		await n8n.workflowSettingsModal.clickUnarchiveMenuItem();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
		await expect(n8n.canvas.getArchivedTag()).not.toBeAttached();
		await expect(n8n.canvas.getNodeCreatorPlusButton()).toBeVisible();
	});

	test('should not show unpublish menu item for non-published workflow', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.saveWorkflow();

		await expect(n8n.canvas.getPublishedIndicator()).not.toBeVisible();

		await n8n.workflowSettingsModal.getWorkflowMenu().click();
		await expect(n8n.workflowSettingsModal.getUnpublishMenuItem()).not.toBeAttached();
	});

	// TODO: flaky test - 18 similar failures across 10 branches in last 14 days
	test.skip('should unpublish a published workflow', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		await n8n.canvas.publishWorkflow();
		await n8n.page.keyboard.press('Escape');

		await expect(n8n.canvas.getPublishedIndicator()).toBeVisible();

		await n8n.workflowSettingsModal.getWorkflowMenu().click();
		await n8n.workflowSettingsModal.clickUnpublishMenuItem();

		await expect(n8n.workflowSettingsModal.getUnpublishModal()).toBeVisible();
		await n8n.workflowSettingsModal.confirmUnpublishModal();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
		await expect(n8n.canvas.getPublishedIndicator()).not.toBeVisible();
	});

	// eslint-disable-next-line n8n-local-rules/no-skipped-tests -- Flaky in multi-main mode
	test.skip('should unpublish published workflow on archive', async ({ n8n }) => {
		await n8n.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME, { closeNDV: true });
		const workflowId = await saveWorkflowAndGetId(n8n);
		await n8n.canvas.publishWorkflow();
		await n8n.page.keyboard.press('Escape');

		await expect(n8n.canvas.getPublishedIndicator()).toBeVisible();

		await n8n.workflowSettingsModal.getWorkflowMenu().click();
		await n8n.workflowSettingsModal.clickArchiveMenuItem();
		await n8n.workflowSettingsModal.confirmArchiveModal();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
		await expect(n8n.page).toHaveURL(/\/workflows$/);

		await goToWorkflow(n8n, workflowId);

		await expect(n8n.canvas.getArchivedTag()).toBeVisible();
		await expect(n8n.canvas.getPublishedIndicator()).not.toBeVisible();
		await expect(n8n.canvas.getPublishButton()).not.toBeVisible();

		await expect(n8n.workflowSettingsModal.getWorkflowMenu()).toBeVisible();
		await n8n.workflowSettingsModal.getWorkflowMenu().click();
		await n8n.workflowSettingsModal.clickUnarchiveMenuItem();

		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
		await expect(n8n.canvas.getArchivedTag()).not.toBeAttached();

		await n8n.canvas.publishWorkflow();
		await n8n.page.keyboard.press('Escape');

		await expect(n8n.canvas.getPublishedIndicator()).toBeVisible();
		await expect(n8n.canvas.getOpenPublishModalButton()).toBeVisible();
	});
});
