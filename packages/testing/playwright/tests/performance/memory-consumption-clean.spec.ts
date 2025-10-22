import { test, expect } from '../../fixtures/cloud';
import { attachMetric, pollMemoryMetric } from '../../utils/performance-helper';

test.describe('Memory Leak Detection', () => {
	const CONTAINER_STABILIZATION_TIME = 20000;
	const BASELINE_POLL_DURATION = 10000;
	const FINAL_POLL_DURATION = 30000;

	// Single source of truth for memory thresholds
	const MAX_MEMORY_RETENTION_PERCENT = 5; // Maximum acceptable retention after returning to baseline

	/**
	 * Define the memory-consuming action to test.
	 * This function can be easily modified to test different features.
	 */
	async function performMemoryAction(n8n: any) {
		// Example 1: AI Workflow Builder
		// Enable AI workflow feature
		await n8n.api.setEnvFeatureFlags({ '026_easy_ai_workflow': 'variant' });

		// Navigate to workflows and trigger AI workflow builder
		await n8n.navigate.toWorkflows();
		await expect(n8n.workflows.getEasyAiWorkflowCard()).toBeVisible({ timeout: 10000 });
		await n8n.workflows.clickEasyAiWorkflowCard();

		// Wait for AI workflow builder to fully load
		await n8n.page.waitForLoadState();
		await expect(n8n.canvas.sticky.getStickies().first()).toBeVisible({ timeout: 10000 });

		// Allow time for any background loading
		await new Promise((resolve) => setTimeout(resolve, 5000));

		// Example 2: Canvas with workflow execution (commented out)
		// const workflowImportResult = await n8n.api.workflows.importWorkflowFromFile(
		// 	'memory-test-workflow.json',
		// );
		// await n8n.page.goto(`/workflow/${workflowImportResult.workflowId}`);
		// await expect(n8n.canvas.getCanvasNodes().first()).toBeVisible();
		// await n8n.canvas.clickExecuteWorkflowButton();
		// await expect(
		// 	n8n.notifications.getNotificationByTitle('Workflow executed successfully'),
		// ).toBeVisible({ timeout: 10000 });

		// Example 3: AI Assistant Chat (commented out)
		// await n8n.api.setEnvFeatureFlags({ 'aiAssistant.enabled': true });
		// await n8n.page.route('**/rest/ai/chat', async (route) => {
		// 	await route.fulfill({
		// 		status: 200,
		// 		json: {
		// 			sessionId: 'test-session',
		// 			messages: [{
		// 				role: 'assistant',
		// 				type: 'message',
		// 				text: 'I can help you build workflows.',
		// 			}],
		// 		},
		// 	});
		// });
		// await n8n.page.goto('/workflow/new');
		// const askAssistantButton = n8n.page.getByTestId('ask-assistant-canvas-action-button');
		// if (await askAssistantButton.count() > 0) {
		// 	await askAssistantButton.click();
		// 	const chatInput = n8n.page.getByTestId('chat-input').locator('textarea');
		// 	if (await chatInput.count() > 0) {
		// 		await chatInput.fill('Create a workflow that sends emails');
		// 		const sendButton = n8n.page.getByTestId('send-message-button');
		// 		if (await sendButton.count() > 0) {
		// 			await sendButton.click();
		// 			await new Promise((resolve) => setTimeout(resolve, 3000));
		// 		}
		// 	}
		// 	const closeButton = n8n.page.getByTestId('close-chat-button');
		// 	if (await closeButton.count() > 0) {
		// 		await closeButton.click();
		// 	}
		// }
	}

	test('Memory should be released after actions @cloud:starter', async ({
		cloudContainer,
		n8n,
	}, testInfo) => {
		// === ARRANGE ===
		// Let container stabilize
		await new Promise((resolve) => setTimeout(resolve, CONTAINER_STABILIZATION_TIME));

		// Get baseline memory (average over 10 seconds for accuracy)
		const baselineMemoryMB =
			(await pollMemoryMetric(cloudContainer.baseUrl, BASELINE_POLL_DURATION, 1000)) / 1024 / 1024;

		// === ACT ===
		// Perform the memory-consuming action
		await performMemoryAction(n8n);

		// Return to home (baseline state)
		await n8n.page.goto('/home/workflows');
		await n8n.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

		// Give time for garbage collection
		await new Promise((resolve) => setTimeout(resolve, 5000));

		// === ASSERT ===
		// Measure final memory (average over 30 seconds for stability)
		const finalMemoryMB =
			(await pollMemoryMetric(cloudContainer.baseUrl, FINAL_POLL_DURATION, 1000)) / 1024 / 1024;

		// Calculate retention percentage - THE key metric
		const memoryRetainedMB = finalMemoryMB - baselineMemoryMB;
		const retentionPercent = (memoryRetainedMB / baselineMemoryMB) * 100;

		// Log the single important metric
		await attachMetric(testInfo, 'memory-retention-percentage', retentionPercent, '%');

		// Clear assertion with informative error message
		expect(retentionPercent).toBeLessThan(
			MAX_MEMORY_RETENTION_PERCENT,
			`Memory retention (${retentionPercent.toFixed(1)}%) exceeds maximum allowed ${MAX_MEMORY_RETENTION_PERCENT}%. ` +
				`Baseline: ${baselineMemoryMB.toFixed(1)} MB, Final: ${finalMemoryMB.toFixed(1)} MB, ` +
				`Retained: ${memoryRetainedMB.toFixed(1)} MB`,
		);
	});
});
