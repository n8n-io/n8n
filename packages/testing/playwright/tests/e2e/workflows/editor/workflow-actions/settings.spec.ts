import { test, expect } from '../../../../../fixtures/base';

test.describe('Workflow Settings @fixme', () => {
	test.fixme();

	test.beforeEach(async ({ n8n }) => {
		await n8n.start.fromBlankCanvas();
	});

	test('should update workflow settings', async ({ n8n }) => {
		await n8n.navigate.toHome();

		const workflowsResponsePromise = n8n.page.waitForResponse(
			(response) =>
				response.url().includes('/rest/workflows') && response.request().method() === 'GET',
		);

		await n8n.sideBar.addWorkflowFromUniversalAdd('Personal');

		const workflowsResponse = await workflowsResponsePromise;
		const responseBody = await workflowsResponse.json();
		const totalWorkflows = responseBody.count;

		await n8n.workflowSettingsModal.open();
		await expect(n8n.workflowSettingsModal.getModal()).toBeVisible();

		await n8n.workflowSettingsModal.getErrorWorkflowField().click();
		const optionCount = await n8n.page.getByRole('option').count();
		expect(optionCount).toBeGreaterThanOrEqual(totalWorkflows + 2);
		await n8n.page.getByRole('option').last().click();

		await n8n.workflowSettingsModal.getTimezoneField().click();
		await expect(n8n.page.getByRole('option').first()).toBeVisible();
		await n8n.page.getByRole('option').nth(1).click();

		await n8n.workflowSettingsModal.getSaveFailedExecutionsField().click();
		await expect(n8n.page.getByRole('option')).toHaveCount(3);
		await n8n.page.getByRole('option').last().click();

		await n8n.workflowSettingsModal.getSaveSuccessExecutionsField().click();
		await expect(n8n.page.getByRole('option')).toHaveCount(3);
		await n8n.page.getByRole('option').last().click();

		await n8n.workflowSettingsModal.getSaveManualExecutionsField().click();
		await expect(n8n.page.getByRole('option')).toHaveCount(3);
		await n8n.page.getByRole('option').last().click();

		await n8n.workflowSettingsModal.getSaveExecutionProgressField().click();
		await expect(n8n.page.getByRole('option')).toHaveCount(3);
		await n8n.page.getByRole('option').last().click();

		await n8n.workflowSettingsModal.getTimeoutSwitch().click();
		await n8n.workflowSettingsModal.getTimeoutInput().fill('1');

		await n8n.workflowSettingsModal.clickSave();

		await expect(n8n.workflowSettingsModal.getModal()).toBeHidden();
		await expect(n8n.notifications.getSuccessNotifications().first()).toBeVisible();
	});

	test.describe('Menu entry Push To Git', () => {
		test('should not show up in the menu for members @auth:member', async ({ n8n }) => {
			await n8n.workflowSettingsModal.getWorkflowMenu().click();
			await expect(n8n.workflowSettingsModal.getPushToGitMenuItem()).not.toBeAttached();
		});

		test('should show up for owners @auth:owner', async ({ n8n }) => {
			await n8n.workflowSettingsModal.getWorkflowMenu().click();
			await expect(n8n.workflowSettingsModal.getPushToGitMenuItem()).toBeVisible();
		});
	});
});
