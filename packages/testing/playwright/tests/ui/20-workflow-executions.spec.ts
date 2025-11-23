import { test, expect } from '../../fixtures/base';
import executionOutOfMemoryResponse from '../../fixtures/execution-out-of-memory-server-response.json';

const ERROR_MESSAGES = {
	OUT_OF_MEMORY: 'Workflow did not finish, possible out-of-memory issue',
} as const;

const TIMEOUTS = {
	EXECUTIONS_REFRESH_INTERVAL: 4000,
} as const;

test.describe('Workflow Executions', () => {
	test.describe('when workflow is saved', () => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('Test_workflow_4_executions_view.json');
		});

		test('should render executions tab correctly', async ({ n8n }) => {
			await n8n.executionsComposer.createExecutions(15);

			await n8n.canvas.toggleNodeEnabled('Error');
			await expect(n8n.canvas.disabledNodes()).toHaveCount(0);
			await n8n.executionsComposer.createExecutions(2);

			await n8n.canvas.toggleNodeEnabled('Error');
			await expect(n8n.canvas.disabledNodes()).toHaveCount(1);
			await n8n.executionsComposer.createExecutions(15);

			const executionsResponsePromise = n8n.page.waitForResponse((response) =>
				response.url().includes('/rest/executions?filter='),
			);

			await n8n.canvas.clickExecutionsTab();
			await executionsResponsePromise;

			await expect(n8n.executions.getExecutionItems().first()).toBeVisible();

			const loadMoreResponsePromise = n8n.page.waitForResponse((response) =>
				response.url().includes('/rest/executions?filter='),
			);
			await n8n.executions.scrollExecutionsListToBottom();
			await loadMoreResponsePromise;

			await expect(n8n.executions.getExecutionItems()).toHaveCount(30, { timeout: 15000 });
			await expect(n8n.executions.getSuccessfulExecutionItems()).toHaveCount(28);
			await expect(n8n.executions.getFailedExecutionItems()).toHaveCount(2);
			await expect(n8n.executions.getFirstExecutionItem()).toHaveClass(/_active_/);
		});

		test('should not redirect back to execution tab when request is not done before leaving the page', async ({
			n8n,
		}) => {
			await n8n.page.route('**/rest/executions?filter=*', (route) => route.continue());
			await n8n.page.route('**/rest/executions/active?filter=*', (route) => route.continue());

			await n8n.canvas.clickExecutionsTab();
			await n8n.canvas.clickEditorTab();
			await expect(n8n.page).toHaveURL(/\/workflow\/[^/]+$/, {
				timeout: TIMEOUTS.EXECUTIONS_REFRESH_INTERVAL,
			});

			for (let i = 0; i < 3; i++) {
				await n8n.canvas.clickExecutionsTab();
				await n8n.canvas.clickEditorTab();
			}
			await expect(n8n.page).toHaveURL(/\/workflow\/[^/]+$/, {
				timeout: TIMEOUTS.EXECUTIONS_REFRESH_INTERVAL,
			});

			await n8n.canvas.clickExecutionsTab();
			// eslint-disable-next-line playwright/no-wait-for-timeout
			await n8n.page.waitForTimeout(1000);
			await n8n.canvas.clickEditorTab();
			await expect(n8n.page).toHaveURL(/\/workflow\/[^/]+$/, {
				timeout: TIMEOUTS.EXECUTIONS_REFRESH_INTERVAL,
			});
		});

		test('should not redirect back to execution tab when slow request is not done before leaving the page', async ({
			n8n,
		}) => {
			await n8n.page.route('**/rest/executions?filter=*', async (route) => {
				await new Promise((resolve) => setTimeout(resolve, 2000));
				await route.continue();
			});

			await n8n.page.route('**/rest/executions/active?filter=*', async (route) => {
				await new Promise((resolve) => setTimeout(resolve, 2000));
				await route.continue();
			});

			await n8n.canvas.clickExecutionsTab();
			await n8n.page.waitForURL(/\/executions/);
			await n8n.canvas.clickEditorTab();
			await n8n.page.waitForURL(/\/workflow\/[^/]+$/);

			await expect(n8n.page).toHaveURL(/\/workflow\/[^/]+$/, {
				timeout: TIMEOUTS.EXECUTIONS_REFRESH_INTERVAL,
			});
		});

		test('should error toast when server error message returned without stack trace', async ({
			n8n,
		}) => {
			const responsePromise = n8n.page.waitForResponse(
				(response) =>
					response.url().includes('/rest/workflows/') &&
					response.url().includes('/run') &&
					response.request().method() === 'POST',
			);
			await n8n.canvas.clickExecuteWorkflowButton();
			await responsePromise;

			await n8n.page.route('**/rest/executions/*', async (route) => {
				if (route.request().url().includes('?filter=')) {
					await route.continue();
					return;
				}

				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(executionOutOfMemoryResponse),
				});
			});

			const executionDetailPromise = n8n.page.waitForResponse(
				(response) =>
					response.url().includes('/rest/executions/') && !response.url().includes('?filter='),
			);
			await n8n.canvas.clickExecutionsTab();
			await executionDetailPromise;

			const iframe = n8n.executions.getPreviewIframe();
			await expect(iframe.locator('body')).not.toBeEmpty();

			await n8n.executions.getErrorNotificationsInPreview().first().waitFor({ timeout: 5000 });

			const errorNotification = n8n.executions
				.getErrorNotificationsInPreview()
				.filter({ hasText: ERROR_MESSAGES.OUT_OF_MEMORY });
			await expect(errorNotification).toBeVisible();
		});

		// eslint-disable-next-line playwright/no-skipped-test
		test.skip('should show workflow data in executions tab after hard reload and modify name and tags', async () => {
			// TODO: Migrate from Cypress
		});
		// eslint-disable-next-line playwright/no-skipped-test
		test.skip('should load items and auto scroll after filter change', async () => {
			// TODO: This should be a component test
		});

		test('should redirect back to editor after seeing a couple of execution using browser back button', async ({
			n8n,
		}) => {
			await n8n.executionsComposer.createExecutions(15);

			await n8n.canvas.toggleNodeEnabled('Error');
			await expect(n8n.canvas.disabledNodes()).toHaveCount(0);
			await n8n.executionsComposer.createExecutions(2);

			await n8n.canvas.toggleNodeEnabled('Error');
			await expect(n8n.canvas.disabledNodes()).toHaveCount(1);
			await n8n.executionsComposer.createExecutions(15);

			const executionsResponsePromise = n8n.page.waitForResponse((response) =>
				response.url().includes('/rest/executions?filter='),
			);

			await n8n.canvas.clickExecutionsTab();
			await executionsResponsePromise;

			const iframe = n8n.executions.getPreviewIframe();
			await expect(iframe.locator('body')).toBeAttached();

			await n8n.executions.getExecutionItems().nth(2).click();
			await expect(iframe.locator('body')).toBeAttached();

			await n8n.executions.getExecutionItems().nth(4).click();
			await expect(iframe.locator('body')).toBeAttached();

			await n8n.executions.getExecutionItems().nth(6).click();
			await expect(iframe.locator('body')).toBeAttached();

			await n8n.page.goBack();
			await expect(iframe.locator('body')).toBeAttached();

			await n8n.page.goBack();
			await expect(iframe.locator('body')).toBeAttached();

			await n8n.page.goBack();
			await expect(iframe.locator('body')).toBeAttached();

			await n8n.page.goBack();

			await expect(n8n.page).not.toHaveURL(/\/executions/);
			await expect(n8n.page).toHaveURL(/\/workflow\//);
			await expect(n8n.canvas.canvasPane()).toBeVisible();
		});
	});

	test.describe('when new workflow is not saved', () => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromBlankCanvas();
		});

		test('should open executions tab', async ({ n8n }) => {
			await n8n.canvas.clickExecutionsTab();
			await expect(n8n.executions.getExecutionsSidebar()).toBeVisible();
			await expect(n8n.executions.getExecutionsEmptyList()).toBeVisible();
			await expect(n8n.page.getByTestId('workflow-execution-no-trigger-content')).toBeVisible();

			await n8n.page.getByRole('button', { name: 'Add first step' }).click();
			await n8n.canvas.nodeCreatorItemByName('Trigger manually').click();

			await n8n.canvas.clickExecutionsTab();
			await expect(n8n.executions.getExecutionsSidebar()).toBeVisible();
			await expect(n8n.executions.getExecutionsEmptyList()).toBeVisible();
			await expect(n8n.page.getByTestId('workflow-execution-no-content')).toBeVisible();

			await expect(n8n.canvas.saveWorkflowButton()).toBeEnabled();
			await n8n.canvas.saveWorkflowButton().click();
			await n8n.page.waitForURL(/\/workflow\/[^/]+$/);
			await expect(n8n.canvas.canvasPane()).toBeVisible();
		});
	});
});
