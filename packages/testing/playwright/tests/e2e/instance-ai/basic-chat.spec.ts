import { setupInstanceAiMocks } from '../../../composables/InstanceAiComposer';
import { buildSimpleChatSSE } from '../../../config/instance-ai-fixtures';
import { test, expect } from '../../../fixtures/base';

test.describe('Instance AI - Basic Chat', () => {
	test('should show empty state when navigating to /instance-ai', async ({ n8n }) => {
		// Setup mocks with a simple SSE response (won't be triggered until a message is sent)
		await setupInstanceAiMocks(n8n.page, buildSimpleChatSSE('Hello!'));
		await n8n.navigate.toInstanceAi();

		// Assert empty state is visible
		await expect(n8n.instanceAi.getEmptyState()).toBeVisible();
		await expect(n8n.instanceAi.getSuggestionCards()).toHaveCount(4);
		await expect(n8n.instanceAi.getSendButton()).toBeVisible();
		await expect(n8n.instanceAi.getThreadList()).toBeVisible();
	});

	test('should send a message and receive a streaming response', async ({ n8n }) => {
		const responseText = 'Hello! I can help you build workflows.';
		await setupInstanceAiMocks(n8n.page, buildSimpleChatSSE(responseText));
		await n8n.navigate.toInstanceAi();

		await n8n.instanceAi.sendMessage('Build me a workflow');
		await n8n.instanceAi.waitForResponseComplete();

		// User message should be visible
		await expect(n8n.instanceAi.getUserMessages().first()).toContainText('Build me a workflow');
		// Assistant response should contain the mocked text
		await expect(n8n.instanceAi.getAssistantMessages().first()).toContainText(responseText);
		// Send button should be re-enabled (not stop button)
		await expect(n8n.instanceAi.getSendButton()).toBeVisible();
		// Empty state should be gone
		await expect(n8n.instanceAi.getEmptyState()).toBeHidden();
	});

	test('should allow clicking a suggestion card to send a message', async ({ n8n }) => {
		await setupInstanceAiMocks(n8n.page, buildSimpleChatSSE('Working on it!'));
		await n8n.navigate.toInstanceAi();

		// Click the first suggestion card
		await n8n.instanceAi.getSuggestionCards().first().click();

		// Should show a user message (the suggestion prompt text)
		await expect(n8n.instanceAi.getUserMessages().first()).toBeVisible();
		// Wait for the response
		await n8n.instanceAi.waitForResponseComplete();
		await expect(n8n.instanceAi.getAssistantMessages().first()).toContainText('Working on it!');
	});

	test('should show thread in sidebar after conversation', async ({ n8n }) => {
		await setupInstanceAiMocks(n8n.page, buildSimpleChatSSE('Done!'));
		await n8n.navigate.toInstanceAi();

		// Initially there should be at least one thread item (the current empty thread)
		await expect(n8n.instanceAi.getThreadItems().first()).toBeVisible();

		await n8n.instanceAi.sendMessage('Hello');
		await n8n.instanceAi.waitForResponseComplete();

		// Thread item should still be visible in sidebar
		await expect(n8n.instanceAi.getThreadItems().first()).toBeVisible();
	});
});
