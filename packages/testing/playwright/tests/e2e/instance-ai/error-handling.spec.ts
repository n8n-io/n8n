import { setupInstanceAiMocks } from '../../../composables/InstanceAiComposer';
import { buildErrorSSE } from '../../../config/instance-ai-fixtures';
import { test, expect } from '../../../fixtures/base';

test.describe('Instance AI - Error Handling', () => {
	test('should display error when run fails', async ({ n8n }) => {
		const errorMessage = 'Something went wrong';
		const sseBody = buildErrorSSE(errorMessage);
		await setupInstanceAiMocks(n8n.page, sseBody);
		await n8n.navigate.toInstanceAi();

		await n8n.instanceAi.sendMessage('Do something that fails');
		await n8n.instanceAi.waitForResponseComplete();

		// The assistant message should be visible and contain the error content
		const assistantMessage = n8n.instanceAi.getAssistantMessages().first();
		await expect(assistantMessage).toBeVisible();
		await expect(assistantMessage).toContainText(errorMessage);
	});

	test('should handle message send failure gracefully', async ({ n8n }) => {
		await setupInstanceAiMocks(n8n.page, buildErrorSSE('unused'));
		await n8n.navigate.toInstanceAi();

		// Override the chat POST route to return a 500 error
		await n8n.page.route('**/instance-ai/chat/**', async (route) => {
			if (route.request().method() === 'POST') {
				await route.fulfill({ status: 500 });
			} else {
				await route.continue();
			}
		});

		await n8n.instanceAi.sendMessage('This should fail');

		// An error notification should appear
		await expect(n8n.notifications.getErrorNotifications().first()).toBeVisible();
	});
});
