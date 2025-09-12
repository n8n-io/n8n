import { authenticator } from 'otplib';

import { INSTANCE_OWNER_CREDENTIALS } from '../../config/test-users';
import { test, expect } from '../../fixtures/base';

test.describe('Two-factor authentication @auth:none @db:reset', () => {
	const TEST_DATA = {
		NEW_EMAIL: 'newemail@test.com',
		NEW_FIRST_NAME: 'newFirstName',
		NEW_LAST_NAME: 'newLastName',
	};

	test('Should be able to login with MFA code', async ({ n8n }) => {
		const { email, password } = INSTANCE_OWNER_CREDENTIALS;

		const secret = await n8n.mfaComposer.setupUser(email, password);
		await n8n.sideBar.signOutFromWorkflows();

		await n8n.mfaComposer.loginWithMfaCode(email, password, secret);
		await n8n.sideBar.signOutFromWorkflows();
	});

	test('Should be able to login with MFA recovery code', async ({ n8n }) => {
		const { email, password } = INSTANCE_OWNER_CREDENTIALS;

		const { recoveryCode } = await n8n.mfaComposer.setupUserWithRecoveryCode(email, password);
		await n8n.sideBar.signOutFromWorkflows();

		await n8n.signIn.fillEmail(email);
		await n8n.signIn.fillPassword(password);
		await n8n.signIn.clickSubmit();

		await expect(n8n.mfaLogin.getForm()).toBeVisible();
		await n8n.mfaLogin.submitMfaRecoveryCode(recoveryCode);

		await expect(n8n.page).toHaveURL(/\/workflow/);
		await n8n.sideBar.signOutFromWorkflows();
	});

	test('Should be able to disable MFA in account with MFA code', async ({ n8n }) => {
		const { email, password } = INSTANCE_OWNER_CREDENTIALS;

		const secret = await n8n.mfaComposer.setupUser(email, password);
		await n8n.sideBar.signOutFromWorkflows();

		await n8n.mfaComposer.loginWithMfaCode(email, password, secret);

		const disableToken = authenticator.generate(secret);
		await n8n.personalSettings.triggerDisableMfa();
		await n8n.promptMfaCodeModal.submitMfaCode(disableToken);

		await expect(n8n.personalSettings.getEnableMfaButton()).toBeVisible();
		await n8n.sideBar.signOutFromWorkflows();
	});

	test('Should prompt for MFA code when email changes', async ({ n8n }) => {
		const { email, password } = INSTANCE_OWNER_CREDENTIALS;

		const secret = await n8n.mfaComposer.setupUser(email, password);

		await n8n.personalSettings.goToPersonalSettings();
		await n8n.personalSettings.fillEmail(TEST_DATA.NEW_EMAIL);
		await n8n.personalSettings.saveSettings();

		const mfaCode = authenticator.generate(secret);
		await n8n.promptMfaCodeModal.submitMfaCode(mfaCode);

		await expect(
			n8n.notifications.getNotificationByTitleOrContent('Personal details updated'),
		).toBeVisible();

		await n8n.sideBar.signOutFromWorkflows();
	});

	test('Should prompt for MFA recovery code when email changes', async ({ n8n }) => {
		const { email, password } = INSTANCE_OWNER_CREDENTIALS;

		const { recoveryCode } = await n8n.mfaComposer.setupUserWithRecoveryCode(email, password);

		await n8n.personalSettings.goToPersonalSettings();
		await n8n.personalSettings.fillEmail(TEST_DATA.NEW_EMAIL);
		await n8n.personalSettings.saveSettings();

		await n8n.promptMfaCodeModal.submitMfaCode(recoveryCode);

		expect(await n8n.notifications.getNotificationCount()).toBeGreaterThan(0);

		await n8n.sideBar.signOutFromWorkflows();
	});

	test('Should not prompt for MFA code or recovery code when first name or last name changes', async ({
		n8n,
	}) => {
		const { email, password } = INSTANCE_OWNER_CREDENTIALS;

		await n8n.mfaComposer.setupUser(email, password);

		await n8n.personalSettings.updateFirstAndLastName(
			TEST_DATA.NEW_FIRST_NAME,
			TEST_DATA.NEW_LAST_NAME,
		);

		await expect(
			n8n.notifications.getNotificationByTitleOrContent('Personal details updated'),
		).toBeVisible();

		await n8n.sideBar.signOutFromWorkflows();
	});

	test('Should be able to disable MFA in account with recovery code', async ({ n8n }) => {
		const { email, password } = INSTANCE_OWNER_CREDENTIALS;

		const { secret, recoveryCode } = await n8n.mfaComposer.setupUserWithRecoveryCode(
			email,
			password,
		);
		await n8n.sideBar.signOutFromWorkflows();

		await n8n.mfaComposer.loginWithMfaCode(email, password, secret);

		await n8n.personalSettings.triggerDisableMfa();
		await n8n.promptMfaCodeModal.submitMfaCode(recoveryCode);

		await expect(n8n.personalSettings.getEnableMfaButton()).toBeVisible();
		await n8n.sideBar.signOutFromWorkflows();
	});
});
