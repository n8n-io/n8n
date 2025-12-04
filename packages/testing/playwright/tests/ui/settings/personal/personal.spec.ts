import { customAlphabet } from 'nanoid';

import { test, expect } from '../../../../fixtures/base';

const INVALID_NAMES = [
	'https://n8n.io',
	'http://n8n.io',
	'www.n8n.io',
	'n8n.io',
	'n8n.бг',
	'n8n.io/home',
	'n8n.io/home?send=true',
	'<a href="#">Jack</a>',
	'<script>alert("Hello")</script>',
];

const VALID_NAMES = [
	['a', 'a'],
	['alice', 'alice'],
	['Robert', 'Downey Jr.'],
	['Mia', 'Mia-Downey'],
	['Mark', "O'neil"],
	['Thomas', 'Müler'],
	['ßáçøñ', 'ßáçøñ'],
	['أحمد', 'فلسطين'],
	['Милорад', 'Филиповић'],
];

test.describe('Personal Settings', () => {
	test('should allow to change first and last name', async ({ n8n }) => {
		await n8n.settingsPersonal.goToPersonalSettings();

		for (const name of VALID_NAMES) {
			await n8n.settingsPersonal.fillPersonalData(name[0], name[1]);
			await n8n.settingsPersonal.saveSettings();

			await expect(
				n8n.notifications.getNotificationByTitleOrContent('Personal details updated'),
			).toBeVisible();
			await n8n.notifications.closeNotificationByText('Personal details updated');
		}
	});

	test('should not allow malicious values for personal data', async ({ n8n }) => {
		await n8n.settingsPersonal.goToPersonalSettings();

		for (const name of INVALID_NAMES) {
			await n8n.settingsPersonal.fillPersonalData(name, name);
			await n8n.settingsPersonal.saveSettings();

			await expect(
				n8n.notifications.getNotificationByTitleOrContent('Problem updating your details'),
			).toBeVisible();
			await n8n.notifications.closeNotificationByText('Problem updating your details');
		}
	});

	test('should be able to change theme', async ({ n8n }) => {
		await n8n.navigate.toPersonalSettings();
		await n8n.settingsPersonal.changeTheme('Dark theme');
		await expect(
			n8n.notifications.getNotificationByTitleOrContent('Personal details updated'),
		).toBeVisible();
		await expect(n8n.page.locator('body')).toHaveAttribute('data-theme', 'dark');
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
