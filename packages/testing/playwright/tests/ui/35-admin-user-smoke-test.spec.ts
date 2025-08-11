import { test, expect } from '../../fixtures/base';

test.describe('Admin user', () => {
	test('should see same Settings sub menu items as instance owner', async ({ n8n, api }) => {
		await api.setupTest('signin-only', 'owner');
		await n8n.settings.goToSettings();

		const ownerMenuItems = await n8n.settings.getMenuItems().count();

		await api.setupTest('signin-only', 'admin');
		await n8n.settings.goToSettings();

		await expect(n8n.settings.getMenuItems()).toHaveCount(ownerMenuItems);
	});
});
