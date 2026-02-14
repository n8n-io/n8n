import { test, expect } from '../../../../fixtures/base';

test.describe(
	'Execution Preview Actions',
	{
		annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('Test_workflow_4_executions_view.json');
		});

		test('should delete an execution from the preview', async ({ n8n }) => {
			await n8n.executionsComposer.createExecutions(3);

			const executionsResponsePromise = n8n.page.waitForResponse((response) =>
				response.url().includes('/rest/executions?filter='),
			);
			await n8n.canvas.clickExecutionsTab();
			await executionsResponsePromise;

			await expect(n8n.executions.getExecutionItems()).toHaveCount(3);

			await n8n.executions.deleteExecutionInPreview();

			await expect(n8n.executions.getExecutionItems()).toHaveCount(2);
		});

		test('should show auto-refresh checkbox in executions sidebar', async ({ n8n }) => {
			await n8n.executionsComposer.createExecutions(1);

			await n8n.canvas.clickExecutionsTab();
			await expect(n8n.executions.getExecutionItems().first()).toBeVisible();

			await expect(n8n.executions.getAutoRefreshButton()).toBeVisible();
		});
	},
);
