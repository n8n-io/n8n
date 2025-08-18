import { test, expect } from '../../fixtures/base';

test.describe('Authentication', () => {
	const testCases = [
		{ role: 'default', expectedUrl: /\/workflow/, auth: '' },
		{ role: 'owner', expectedUrl: /\/workflow/, auth: '@auth:owner' },
		{ role: 'admin', expectedUrl: /\/workflow/, auth: '@auth:admin' },
		{ role: 'member', expectedUrl: /\/workflow/, auth: '@auth:member' },
		{ role: 'none', expectedUrl: /\/signin/, auth: '@auth:none' },
	];

	for (const { role, expectedUrl, auth } of testCases) {
		test(`${role} authentication ${auth}`, async ({ n8n }) => {
			await n8n.goHome();
			await expect(n8n.page).toHaveURL(expectedUrl);
		});
	}
});
