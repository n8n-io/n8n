import { test, expect } from '../../../../fixtures/base';

test.describe(
	'Executions Filter',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('Test_workflow_4_executions_view.json');

			// Create mix of successful and failed executions
			await n8n.executionsComposer.createExecutions(2);
			await n8n.canvas.toggleNodeEnabled('Error');
			await expect(n8n.canvas.disabledNodes()).toHaveCount(0);
			await n8n.executionsComposer.createExecutions(2);

			const executionsResponsePromise = n8n.page.waitForResponse((response) =>
				response.url().includes('/rest/executions?filter='),
			);
			await n8n.canvas.clickExecutionsTab();
			await executionsResponsePromise;

			await expect(n8n.executions.getExecutionItems().first()).toBeVisible();
		});

		test('should filter executions by status and show filter badge', async ({ n8n }) => {
			await n8n.executions.openFilter();
			await expect(n8n.executions.getFilterForm()).toBeVisible();

			// No badge before filtering
			await expect(n8n.executions.getFilterBadge()).toBeHidden();

			const filterRequestPromise = n8n.page.waitForResponse(
				(response) =>
					response.url().includes('/rest/executions?filter=') && response.url().includes('error'),
			);

			await n8n.executions.selectFilterStatus('Error');
			await filterRequestPromise;

			// Badge shows active filter count
			await expect(n8n.executions.getFilterBadge()).toBeVisible();

			// Only failed executions visible
			await expect(n8n.executions.getFailedExecutionItems()).toHaveCount(2);
			await expect(n8n.executions.getSuccessfulExecutionItems()).toHaveCount(0);
		});

		test('should reset filter and remove badge', async ({ n8n }) => {
			await n8n.executions.openFilter();
			await n8n.executions.selectFilterStatus('Success');
			await expect(n8n.executions.getFilterBadge()).toBeVisible();

			const resetRequestPromise = n8n.page.waitForResponse((response) =>
				response.url().includes('/rest/executions?filter='),
			);

			await n8n.executions.resetFilter();
			await resetRequestPromise;

			await expect(n8n.executions.getFilterBadge()).toBeHidden();
			await expect(n8n.executions.getExecutionItems()).toHaveCount(4);
		});
	},
);
