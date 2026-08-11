import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';

test.describe(
	'Authentication',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		// The root route lands users on the AI Assistant while the `instance-ai`
		// module is active — but only if they may manage it, or setup is complete.
		// Owner and admin hold `instanceAi:manage`; members only hold
		// `instanceAi:message`, so they land there once Instance AI is set up.
		// The module's `setupCompleted` flag is pinned per case so the expectation
		// doesn't depend on how the instance under test happens to be configured.
		const instanceAiSetup = (setupCompleted: boolean): TestRequirements => ({
			config: { moduleSettings: { 'instance-ai': { setupCompleted } } },
		});

		const testCases = [
			{ role: 'default', expectedUrl: /\/assistant/, auth: '', requirements: {} },
			{ role: 'owner', expectedUrl: /\/assistant/, auth: '@auth:owner', requirements: {} },
			{ role: 'admin', expectedUrl: /\/assistant/, auth: '@auth:admin', requirements: {} },
			{
				role: 'member without Instance AI set up',
				expectedUrl: /\/home\/workflows/,
				auth: '@auth:member',
				requirements: instanceAiSetup(false),
			},
			{
				role: 'member with Instance AI set up',
				expectedUrl: /\/assistant/,
				auth: '@auth:member',
				requirements: instanceAiSetup(true),
			},
			{ role: 'none', expectedUrl: /\/signin/, auth: '@auth:none', requirements: {} },
		];

		for (const { role, expectedUrl, auth, requirements } of testCases) {
			test(`${role} authentication ${auth}`, async ({ n8n, setupRequirements }) => {
				await setupRequirements(requirements);
				await n8n.goToRoot();
				await expect(n8n.page).toHaveURL(expectedUrl);
			});
		}
	},
);
