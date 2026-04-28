import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

test.describe(
	'Instance AI chat basics @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test('should display empty state for new conversation', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await expect(n8n.instanceAi.getChatInput()).toBeVisible();
			await expect(n8n.instanceAi.getSendButton()).toBeVisible();
		});

		test('should send message and receive assistant response', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage('Hello, what can you help me with?');

			await expect(n8n.instanceAi.getUserMessages().first()).toBeVisible();
			await n8n.instanceAi.waitForAssistantResponse(120_000);
			await expect(n8n.instanceAi.getAssistantMessages().first()).toBeVisible();
		});

		test('should display user and assistant messages in timeline', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage('Say hello back to me');

			await expect(n8n.instanceAi.getUserMessages().first()).toContainText('Say hello back to me');
			await n8n.instanceAi.waitForAssistantResponse(120_000);
			await expect(n8n.instanceAi.getAssistantMessages().first()).toBeVisible();
		});

		test('should persist messages after page reload', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.sendMessage('Remember this persistence message');
			await n8n.instanceAi.waitForAssistantResponse(120_000);

			// Navigate back to instance AI (creates a new empty thread)
			await n8n.navigate.toInstanceAi();
			await expect(n8n.instanceAi.getChatInput()).toBeVisible({ timeout: 30_000 });

			// The old thread should be visible in the sidebar — click it to restore.
			// Thread title is LLM-generated ("Persistence message noted" from recording).
			// Use partial match to be resilient to minor title variations.
			const oldThread = n8n.instanceAi.sidebar.getThreadByTitle('Persistence message');
			await expect(oldThread).toBeVisible({ timeout: 10_000 });
			await oldThread.click();

			// Messages from the old thread should be visible
			await expect(n8n.instanceAi.getUserMessages().first()).toBeVisible({ timeout: 30_000 });
			await expect(n8n.instanceAi.getAssistantMessages().first()).toBeVisible({ timeout: 30_000 });
		});
	},
);
