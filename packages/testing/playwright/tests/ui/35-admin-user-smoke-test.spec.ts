import { test, expect } from '../../fixtures/base';

test.describe('Admin user', () => {
	test('should see same Settings sub menu items as instance owner', async ({ n8n }) => {
		await n8n.api.setupTest('signin-only', 'owner');
		await n8n.settingsPersonal.goToSettings();

		const ownerMenuItems = await n8n.settingsPersonal.getMenuItems().count();

		await n8n.api.setupTest('signin-only', 'admin');
		await n8n.settingsPersonal.goToSettings();

		await expect(n8n.settingsPersonal.getMenuItems()).toHaveCount(ownerMenuItems);
	});
});
