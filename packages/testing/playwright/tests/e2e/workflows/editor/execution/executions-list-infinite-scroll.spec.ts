/**
 * Reproduction test for LIGO-304: Executions list not loading on longer screens
 *
 * Issue: On longer screens where the default 20 executions fit without scrolling,
 * the scrollbar does not appear and users cannot load more executions.
 *
 * The IntersectionObserver watches the last execution card, but if all 20 fit
 * on screen without overflow, the scroll event never fires and the observer
 * may not trigger properly to load more executions.
 */

import { test, expect } from '../../../../../fixtures/base';

test.describe(
	'Executions list infinite scroll',
	{
		annotation: [{ type: 'issue', description: 'LIGO-304' }],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.start.fromImportedWorkflow('Test_workflow_4_executions_view.json');
		});

		test('should load more executions when list fits on tall screen without scrollbar', async ({
			n8n,
		}) => {
			// Create 25 executions (more than the default page size of 20)
			await n8n.executionsComposer.createExecutions(25);

			// Navigate to executions tab
			await n8n.canvas.clickExecutionsTab();

			// Set a tall viewport to ensure all 20 executions fit without scrolling
			// This simulates the bug scenario where the user has a long monitor
			await n8n.page.setViewportSize({ width: 1920, height: 2000 });

			// Wait for initial executions to load
			await expect(n8n.executions.getExecutionsList()).toBeVisible();
			await expect(n8n.executions.getExecutionItems().first()).toBeVisible();

			// Initially should have 20 executions visible (default page size)
			await expect(n8n.executions.getExecutionItems()).toHaveCount(20, { timeout: 5000 });

			// Check if the executions list has a scrollbar
			// If scrollHeight > clientHeight, there's overflow and a scrollbar should appear
			const hasScrollbar = await n8n.executions.getExecutionsList().evaluate((el) => {
				return el.scrollHeight > el.clientHeight;
			});

			// On a tall screen with 20 executions, there should be NO scrollbar
			// This is the bug condition - no scrollbar means no way to trigger infinite scroll
			expect(hasScrollbar).toBe(false);

			// Wait a bit to see if IntersectionObserver triggers automatically
			// (it should, since the last item is visible)
			await n8n.page.waitForTimeout(2000);

			// The bug: even though there are 25 executions total, only 20 are shown
			// and there's no way to load more because:
			// 1. No scrollbar to scroll down
			// 2. IntersectionObserver might not trigger properly
			const executionCount = await n8n.executions.getExecutionItems().count();

			// EXPECTED: Should have loaded more executions automatically (25 total)
			// ACTUAL (BUG): Still stuck at 20 executions
			expect(executionCount).toBe(25);
		});

		test('should load more executions when manually triggering scroll on tall screen', async ({
			n8n,
		}) => {
			// Create 25 executions
			await n8n.executionsComposer.createExecutions(25);

			// Navigate to executions tab
			await n8n.canvas.clickExecutionsTab();

			// Set a tall viewport
			await n8n.page.setViewportSize({ width: 1920, height: 2000 });

			// Wait for initial executions to load
			await expect(n8n.executions.getExecutionsList()).toBeVisible();
			await expect(n8n.executions.getExecutionItems()).toHaveCount(20, { timeout: 5000 });

			// Manually scroll to the bottom to trigger load more
			const loadMoreResponsePromise = n8n.page.waitForResponse((response) =>
				response.url().includes('/rest/executions?filter='),
			);
			await n8n.executions.scrollExecutionsListToBottom();
			await loadMoreResponsePromise;

			// After manual scroll, should have loaded all 25 executions
			// This tests whether the scroll event handler works when triggered manually
			const executionCount = await n8n.executions.getExecutionItems().count();

			// EXPECTED: Should load more when we manually scroll (even if no visible scrollbar)
			// If this fails, the scroll event handler itself is broken
			expect(executionCount).toBeGreaterThan(20);
			expect(executionCount).toBe(25);
		});
	},
);
