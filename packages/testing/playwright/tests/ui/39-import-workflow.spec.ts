import { test, expect } from '../../fixtures/base';
import onboardingWorkflow from '../../workflows/Onboarding_workflow.json';

test.describe('Import workflow', () => {
	test.describe('From URL', () => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.page.route('**/rest/workflows/from-url*', async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ data: onboardingWorkflow }),
				});
			});
		});

		test('should import workflow', async ({ n8n }) => {
			await n8n.navigate.toWorkflow('new');
			await n8n.page.waitForLoadState('load');

			await n8n.canvas.clickWorkflowMenu();
			await n8n.canvas.clickImportFromURL();

			await expect(n8n.canvas.getImportURLInput()).toBeVisible();

			await n8n.canvas.fillImportURLInput('https://fakepage.com/workflow.json');
			await n8n.canvas.clickConfirmImportURL();

			await n8n.canvas.clickZoomToFitButton();

			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(4);

			await expect(n8n.notifications.getErrorNotifications()).toHaveCount(0);
			await expect(n8n.notifications.getSuccessNotifications()).toHaveCount(0);
		});

		test('clicking outside modal should not show error toast', async ({ n8n }) => {
			await n8n.navigate.toWorkflow('new');
			await n8n.page.waitForLoadState('load');

			await n8n.canvas.clickWorkflowMenu();
			await n8n.canvas.clickImportFromURL();

			await n8n.canvas.clickOutsideModal();

			await expect(n8n.notifications.getErrorNotifications()).toHaveCount(0);
		});

		test('canceling modal should not show error toast', async ({ n8n }) => {
			await n8n.navigate.toWorkflow('new');
			await n8n.page.waitForLoadState('load');

			await n8n.canvas.clickWorkflowMenu();
			await n8n.canvas.clickImportFromURL();

			await n8n.canvas.clickCancelImportURL();

			await expect(n8n.notifications.getErrorNotifications()).toHaveCount(0);
		});
	});

	test.describe('From File', () => {
		test('should import workflow', async ({ n8n }) => {
			await n8n.navigate.toWorkflow('new');
			await n8n.page.waitForLoadState('load');

			await n8n.canvas.importWorkflow(
				'Test_workflow-actions_paste-data.json',
				'Import Test Workflow',
			);

			await n8n.page.waitForLoadState('load');

			await n8n.canvas.clickZoomToFitButton();

			await expect(n8n.canvas.getCanvasNodes()).toHaveCount(5);

			const connections = n8n.page.getByTestId('edge');
			await expect(connections).toHaveCount(5);
		});
	});
});
