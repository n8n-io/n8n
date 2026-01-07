import { INSTANCE_OWNER_CREDENTIALS } from '../../../../config/test-users';
import { test, expect } from '../../../../fixtures/base';

test.describe('Users Settings', () => {
	test('should prevent non-owners to access UM settings', async ({ n8n }) => {
		// This creates a new user in the same context, so the cookies are refreshed and owner is no longer logged in
		await n8n.api.users.create();
		await n8n.navigate.toUsers();
		await expect(n8n.workflows.getNewWorkflowCard()).toBeVisible();
	});

	test('should allow instance owner to access UM settings', async ({ n8n }) => {
		await n8n.navigate.toUsers();
		expect(n8n.page.url()).toContain('/settings/users');
	});

	test('should be able to change user role to Admin and back', async ({ n8n, api }) => {
		const user = await api.users.create();
		await n8n.navigate.toUsers();
		await n8n.settingsUsers.search(user.email);
		await n8n.settingsUsers.selectAccountType(user.email, 'Admin');
		await expect(n8n.settingsUsers.getAccountType(user.email)).toHaveText('Admin');
		await n8n.settingsUsers.selectAccountType(user.email, 'Member');
		await expect(n8n.settingsUsers.getAccountType(user.email)).toHaveText('Member');
	});

	test('should delete user and their data', async ({ n8n, api }) => {
		const user = await api.users.create();
		await n8n.navigate.toUsers();
		await n8n.page.reload();

		await n8n.settingsUsers.search(user.email);
		await expect(n8n.settingsUsers.getRow(user.email)).toBeVisible();

		await n8n.settingsUsers.clickDeleteUser(user.email);
		await n8n.settingsUsers.deleteData();
		await expect(n8n.notifications.getNotificationByTitleOrContent('User deleted')).toBeVisible();
	});

	test('should delete user and transfer their data', async ({ n8n, api }) => {
		const ownerEmail = INSTANCE_OWNER_CREDENTIALS.email;
		const user = await api.users.create();
		await n8n.navigate.toUsers();
		await n8n.page.reload();

		await n8n.settingsUsers.search(user.email);
		await n8n.settingsUsers.getRow(user.email).isVisible();

		await n8n.settingsUsers.clickDeleteUser(user.email);
		await n8n.settingsUsers.transferData(ownerEmail);
		await expect(n8n.notifications.getNotificationByTitleOrContent('User deleted')).toBeVisible();
	});
});
