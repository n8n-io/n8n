import { customAlphabet } from 'nanoid';

import { INSTANCE_OWNER_CREDENTIALS } from '../../config/test-users';
import { test, expect } from '../../fixtures/base';

test.describe('User Management', () => {
	test('should login and logout @auth:none', async ({ n8n }) => {
		await n8n.goHome();
		await n8n.signIn.goToSignIn();
		await n8n.signIn.loginWithEmailAndPassword(
			INSTANCE_OWNER_CREDENTIALS.email,
			INSTANCE_OWNER_CREDENTIALS.password,
		);
		await expect(n8n.workflows.getProjectName()).toBeVisible();
	});

	test('should prevent non-owners to access UM settings', async ({ n8n }) => {
		// This creates a new user in the same context, so the cookies are refreshed and owner is no longer logged in
		await n8n.api.users.create();
		await n8n.navigate.toUsers();
		await expect(n8n.workflows.getProjectName()).toBeVisible();
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

	test('should be able to change theme', async ({ n8n }) => {
		await n8n.navigate.toPersonalSettings();
		await n8n.settingsPersonal.changeTheme('Dark theme');
		await expect(
			n8n.notifications.getNotificationByTitleOrContent('Personal details updated'),
		).toBeVisible();
		await expect(n8n.page.locator('body')).toHaveAttribute('data-theme', 'dark');
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

	test('should allow user to change their personal data', async ({ n8n }) => {
		await n8n.api.users.create();
		await n8n.navigate.toPersonalSettings();

		await n8n.settingsPersonal.fillPersonalData('Something', 'Else');
		await n8n.settingsPersonal.saveSettings();
		await expect(
			n8n.notifications.getNotificationByTitleOrContent('Personal details updated'),
		).toBeVisible();

		await n8n.page.reload();
		await expect(n8n.settingsPersonal.getFirstNameField()).toHaveValue('Something');
		await expect(n8n.settingsPersonal.getLastNameField()).toHaveValue('Else');
	});

	test("shouldn't allow user to set weak password", async ({ n8n }) => {
		const user = await n8n.api.users.create();
		await n8n.navigate.toPersonalSettings();
		await n8n.settingsPersonal.getChangePasswordLink().click();

		await n8n.settingsPersonal.currentPassword().fill(user.password);
		await n8n.settingsPersonal.newPassword().fill('abc');
		await n8n.settingsPersonal.repeatPassword().fill('abc');
		await expect(
			n8n.settingsPersonal
				.changePasswordModal()
				.getByText('8+ characters, at least 1 number and 1 capital letter'),
		).toBeVisible();
	});

	test("shouldn't allow user to change password if old password is wrong", async ({ n8n }) => {
		await n8n.navigate.toPersonalSettings();
		await n8n.settingsPersonal.getChangePasswordLink().click();
		await n8n.settingsPersonal.currentPassword().fill('wrong');
		await n8n.settingsPersonal.newPassword().fill('Keybo4rd');
		await n8n.settingsPersonal.repeatPassword().fill('Keybo4rd');
		await n8n.settingsPersonal.changePasswordButton().click();
		await expect(
			n8n.notifications.getNotificationByTitleOrContent('Provided current password is incorrect.'),
		).toBeVisible();
	});

	test('should change current user password', async ({ n8n }) => {
		const user = await n8n.api.users.create();
		await n8n.navigate.toPersonalSettings();
		await n8n.settingsPersonal.getChangePasswordLink().click();
		await n8n.settingsPersonal.currentPassword().fill(user.password);
		await n8n.settingsPersonal.newPassword().fill('Keybo4rd');
		await n8n.settingsPersonal.repeatPassword().fill('Keybo4rd');
		await n8n.settingsPersonal.changePasswordButton().click();
		await expect(
			n8n.notifications.getNotificationByTitleOrContent('Password updated'),
		).toBeVisible();
	});

	test("shouldn't allow users to set invalid email", async ({ n8n }) => {
		await n8n.api.users.create();
		await n8n.navigate.toPersonalSettings();
		await n8n.settingsPersonal.fillEmail('something_else');
		await expect(n8n.settingsPersonal.getSaveSettingsButton()).toBeDisabled();
	});

	test('should change user email', async ({ n8n }) => {
		const user = await n8n.api.users.create();
		const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);
		const newEmail = `something${nanoid()}@acme.corp`;
		await n8n.navigate.toPersonalSettings();
		await n8n.settingsPersonal.fillEmail(newEmail);
		await n8n.settingsPersonal.saveSettings();
		await n8n.settingsPersonal.currentPassword().fill(user.password);
		await n8n.modal.clickButton('Confirm');
		await expect(
			n8n.notifications.getNotificationByTitleOrContent('Personal details updated'),
		).toBeVisible();

		const newTestUser = {
			email: newEmail,
			password: user.password,
		};
		const secondBrowser = await n8n.start.withUser(newTestUser);
		await secondBrowser.navigate.toPersonalSettings();
		await expect(secondBrowser.settingsPersonal.getEmailField()).toHaveValue(newEmail);
	});
});
