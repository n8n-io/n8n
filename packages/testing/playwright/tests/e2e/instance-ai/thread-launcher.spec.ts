import { test, expect, instanceAiTestConfig, SKIP_PROXY_SETUP_ANNOTATION } from './fixtures';

test.use(instanceAiTestConfig);
test.describe(
	'Instance AI thread launcher @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test(
			'template deep-link creates a thread and auto-sends the kickoff message',
			// No recorded LLM expectations for this flow: the auto-sent kickoff is
			// allowed to error at the model — the test asserts the user message
			// bubble, never the assistant reply, so proxy setup is skipped.
			{ annotation: [{ type: SKIP_PROXY_SETUP_ANNOTATION }] },
			async ({ n8n }) => {
				// Boot the app in an authenticated state before following the
				// deep-link route, mimicking a user coming from the n8n website.
				await n8n.navigate.toInstanceAi();

				await n8n.page.goto('/assistant/new?templateId=1234');

				// The router guard provisions a thread and redirects with no query —
				// the URL settles on /assistant/<uuid>, back-button safe.
				await expect(n8n.page).toHaveURL(/\/assistant\/[0-9a-f-]+$/, { timeout: 15_000 });

				// The kickoff auto-sends once the thread view has hydrated and
				// connected. It names the template by id.
				await expect(n8n.instanceAi.getUserMessages().first()).toContainText('template', {
					timeout: 30_000,
				});
				await expect(n8n.instanceAi.getUserMessages().first()).toContainText('1234');
			},
		);

		test(
			'invalid template id lands on the assistant empty view',
			{ annotation: [{ type: SKIP_PROXY_SETUP_ANNOTATION }] },
			async ({ n8n }) => {
				await n8n.navigate.toInstanceAi();

				// Non-numeric template ids are rejected by the guard: no thread is
				// created and the user lands on the assistant empty view.
				await n8n.page.goto('/assistant/new?templateId=abc');

				await expect(n8n.page).toHaveURL(/\/assistant$/, { timeout: 15_000 });
				await expect(n8n.instanceAi.getChatInput()).toBeVisible();
			},
		);
	},
);
