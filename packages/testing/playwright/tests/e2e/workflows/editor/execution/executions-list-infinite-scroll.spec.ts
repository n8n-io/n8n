/**
 * Regression coverage for LIGO-304: Executions list not loading on longer screens.
 *
 * On tall viewports (and at low browser zoom levels) the default 20 executions
 * fit without overflow, so no scrollbar appears. Without the fix the
 * IntersectionObserver disconnects after firing once, leaving the user stuck
 * at 20 executions with no way to load more.
 */

import { test, expect } from '../../../../../fixtures/base';

test.use({
	capability: { env: { TEST_ISOLATION: 'ligo-304-executions-list-infinite-scroll' } },
});

test.describe(
	'Executions list infinite scroll',
	{
		annotation: [{ type: 'issue', description: 'LIGO-304' }],
	},
	() => {
		const TOTAL_EXECUTIONS = 25;
		const TALL_VIEWPORT = { width: 1920, height: 2000 };

		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('Test_workflow_4_executions_view.json');
		});

		test('should auto-load remaining executions when the sidebar fits without a scrollbar', async ({
			n8n,
		}) => {
			await n8n.executionsComposer.createExecutions(TOTAL_EXECUTIONS);
			await n8n.canvas.clickExecutionsTab();
			await n8n.page.setViewportSize(TALL_VIEWPORT);

			await expect(n8n.executions.getExecutionsList()).toBeVisible();
			await expect(n8n.executions.getExecutionItems().first()).toBeVisible();

			const hasScrollbar = await n8n.executions.getExecutionsList().evaluate((listElement) => {
				return listElement.scrollHeight > listElement.clientHeight;
			});
			expect(hasScrollbar).toBe(false);

			await expect(n8n.executions.getExecutionItems()).toHaveCount(TOTAL_EXECUTIONS, {
				timeout: 15000,
			});
		});

		test('should keep loading on manual scroll on a tall viewport', async ({ n8n }) => {
			await n8n.executionsComposer.createExecutions(TOTAL_EXECUTIONS);
			await n8n.canvas.clickExecutionsTab();
			await n8n.page.setViewportSize(TALL_VIEWPORT);

			await expect(n8n.executions.getExecutionsList()).toBeVisible();
			await expect(n8n.executions.getExecutionItems().first()).toBeVisible();

			await n8n.executions.scrollExecutionsListToBottom();

			await expect(n8n.executions.getExecutionItems()).toHaveCount(TOTAL_EXECUTIONS, {
				timeout: 15000,
			});
		});
	},
);
