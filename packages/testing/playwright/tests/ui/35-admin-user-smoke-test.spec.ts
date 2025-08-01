import { test, expect } from '../../fixtures/base';

test.describe('Admin user', () => {
	test('should see same Settings sub menu items as instance owner', async ({ n8n, api }) => {
		// Sign in as owner and count menu items
		await api.setupTest('signin-only', 'owner');
		await n8n.settings.goToSettings();

		const ownerMenuItems = await n8n.settings.getMenuItems().count();

		// Sign in as admin and verify same number of menu items
		await api.setupTest('signin-only', 'admin');
		await n8n.settings.goToSettings();

		await expect(n8n.settings.getMenuItems()).toHaveCount(ownerMenuItems);
	});
});
