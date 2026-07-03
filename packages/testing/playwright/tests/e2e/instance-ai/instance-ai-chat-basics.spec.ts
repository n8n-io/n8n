import { test, expect, instanceAiTestConfig, SKIP_PROXY_SETUP_ANNOTATION } from './fixtures';

test.use(instanceAiTestConfig);
test.describe(
	'Instance AI chat basics @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test(
			'should display empty state for new conversation',
			{ annotation: [{ type: SKIP_PROXY_SETUP_ANNOTATION }] },
			async ({ n8n }) => {
				await n8n.navigate.toInstanceAi();

				await expect(n8n.instanceAi.getChatInput()).toBeVisible();
				await expect(n8n.instanceAi.getSendButton()).toBeVisible();
			},
		);

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
			await n8n.instanceAi.waitForResponseComplete(120_000);
			await expect(n8n.page).toHaveURL(/\/assistant\/[^/]+$/);

			await n8n.page.reload();
			await expect(n8n.instanceAi.getChatInput()).toBeVisible({ timeout: 30_000 });

			await expect(n8n.instanceAi.getUserMessages().first()).toContainText(
				'Remember this persistence message',
				{ timeout: 30_000 },
			);
			await expect(n8n.instanceAi.getAssistantMessages().first()).toBeVisible({ timeout: 30_000 });
		});
	},
);
