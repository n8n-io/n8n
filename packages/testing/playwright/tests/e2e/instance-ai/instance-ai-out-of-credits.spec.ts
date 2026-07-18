import { test, expect, instanceAiTestConfig, SKIP_PROXY_SETUP_ANNOTATION } from './fixtures';

/**
 * Quota exhaustion is surfaced when the AI service returns a 403 carrying a
 * machine-readable `code: 'quota_exhausted'`. We simulate that by overriding the
 * proxy's `/v1/messages` response, then assert the run renders the tailored
 * out-of-credits state instead of a raw provider error.
 */
test.use(instanceAiTestConfig);
test.describe(
	'Instance AI out of credits @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test(
			'shows a tailored out-of-credits state when the model quota is exhausted',
			{ annotation: [{ type: SKIP_PROXY_SETUP_ANNOTATION }] },
			async ({ n8n, n8nContainer }) => {
				test.skip(!n8nContainer, 'Requires the proxy service to simulate a quota 403');

				// Clear any recordings left by prior tests, then make every model call
				// fail with the quota 403 the AI service emits — a machine-readable
				// `code: 'quota_exhausted'` alongside the message (see credit-pool service).
				await n8nContainer.services.proxy.reset();
				await n8nContainer.services.proxy.createExpectation({
					httpRequest: { method: 'POST', path: '/v1/messages' },
					httpResponse: {
						statusCode: 403,
						headers: { 'Content-Type': ['application/json'] },
						body: JSON.stringify({
							statusCode: 403,
							error: 'Forbidden',
							message: 'Have reached end of quota',
							code: 'quota_exhausted',
						}),
					},
					times: { unlimited: true },
				});

				await n8n.navigate.toInstanceAi();
				await n8n.instanceAi.sendMessage('Build me a workflow');

				await expect(n8n.instanceAi.getOutOfCreditsError()).toBeVisible({ timeout: 60_000 });
				await expect(
					n8n.instanceAi.getAssistantMessageText("You've run out of AI credits"),
				).toBeVisible();
				await expect(n8n.instanceAi.getOutOfCreditsUpgradeButton()).toBeVisible();
			},
		);
	},
);
