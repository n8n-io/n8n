import { test, expect } from '../../../fixtures/base';

test.describe(
	'Authentication',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		// Every signed-in role holds `instanceAi:message`, so the root route lands
		// them on the AI Assistant while the `instance-ai` module is active.
		const testCases = [
			{ role: 'default', expectedUrl: /\/assistant/, auth: '' },
			{ role: 'owner', expectedUrl: /\/assistant/, auth: '@auth:owner' },
			{ role: 'admin', expectedUrl: /\/assistant/, auth: '@auth:admin' },
			{ role: 'member', expectedUrl: /\/assistant/, auth: '@auth:member' },
			{ role: 'none', expectedUrl: /\/signin/, auth: '@auth:none' },
		];

		for (const { role, expectedUrl, auth } of testCases) {
			test(`${role} authentication ${auth}`, async ({ n8n }) => {
				await n8n.goToRoot();
				await expect(n8n.page).toHaveURL(expectedUrl);
			});
		}
	},
);
