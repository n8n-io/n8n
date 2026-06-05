import { test, expect, instanceAiTestConfig, SKIP_PROXY_SETUP_ANNOTATION } from './fixtures';

test.use(instanceAiTestConfig);
test.describe(
	'Instance AI thread launcher @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test(
			'external link prefills Instance AI without sending',
			{ annotation: [{ type: SKIP_PROXY_SETUP_ANNOTATION }] },
			async ({ n8n }) => {
				// Boot the app in an authenticated state before navigating to the
				// external launch route. fromHome() logs in and lands on the home
				// page; we then drive the browser to the /instance-ai/new path
				// directly, mimicking a user following an external deep-link.
				await n8n.start.fromHome();
				await n8n.instanceAi.enableInstanceAiIfPrompted();

				const prompt = 'Hello from external link';
				const encodedPrompt = encodeURIComponent(prompt);

				// Navigate to the external launch route. The router's beforeEnter
				// guard provisions a thread, sets a pending prefill, and redirects
				// to /instance-ai/<uuid> — all without triggering an LLM call.
				await n8n.page.goto(`/instance-ai/new?prompt=${encodedPrompt}&source=external-link`);

				// URL must settle on /instance-ai/<uuid> with no query string.
				await expect(n8n.page).toHaveURL(/\/instance-ai\/[0-9a-f-]+$/, { timeout: 15_000 });

				// The chat input must be pre-filled with the prompt text.
				await expect(n8n.instanceAi.getChatInput()).toHaveValue(prompt, { timeout: 10_000 });

				// The prefill must NOT have been auto-sent — there should be no user
				// message bubble in the timeline.
				await expect(n8n.instanceAi.getUserMessages()).toHaveCount(0);
			},
		);

		// This scenario (template "Start with AI" → real agent run) requires
		// recorded LLM expectations per packages/@n8n/instance-ai/CLAUDE.md.
		// It is out of scope for this task and will be covered when the
		// expectation recordings are available.
		test.skip('start with AI from a template launches and builds', async () => {});
	},
);
