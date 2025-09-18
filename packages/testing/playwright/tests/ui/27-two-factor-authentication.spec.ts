import { authenticator } from 'otplib';

import { INSTANCE_OWNER_CREDENTIALS } from '../../config/test-users';
import { test, expect } from '../../fixtures/base';

// Test constants
const TEST_DATA = {
	NEW_EMAIL: 'newemail@test.com',
	NEW_FIRST_NAME: 'newFirstName',
	NEW_LAST_NAME: 'newLastName',
};

const NOTIFICATIONS = {
	PERSONAL_DETAILS_UPDATED: 'Personal details updated',
};

test.describe('Two-factor authentication @auth:none @db:reset', () => {
	test('Should be able to login with MFA code', async ({ n8n }) => {
		const { email, password, mfaSecret } = INSTANCE_OWNER_CREDENTIALS;

		await n8n.mfaComposer.enableMfa(email, password, mfaSecret!);
		await n8n.sideBar.signOutFromWorkflows();

		await n8n.mfaComposer.loginWithMfaCode(email, password, mfaSecret!);
		await n8n.sideBar.signOutFromWorkflows();
	});

	test('Should be able to login with MFA recovery code', async ({ n8n }) => {
		const { email, password, mfaSecret, mfaRecoveryCodes } = INSTANCE_OWNER_CREDENTIALS;

		await n8n.mfaComposer.enableMfa(email, password, mfaSecret!);
		await n8n.sideBar.signOutFromWorkflows();

		await n8n.mfaComposer.loginWithMfaRecoveryCode(email, password, mfaRecoveryCodes![0]);
		await n8n.sideBar.signOutFromWorkflows();
	});

	test('Should be able to disable MFA in account with MFA code', async ({ n8n }) => {
		const { email, password, mfaSecret } = INSTANCE_OWNER_CREDENTIALS;

		await n8n.mfaComposer.enableMfa(email, password, mfaSecret!);
		await n8n.sideBar.signOutFromWorkflows();

		await n8n.mfaComposer.loginWithMfaCode(email, password, mfaSecret!);

		const disableToken = authenticator.generate(mfaSecret!);
		await n8n.personalSettings.triggerDisableMfa();
		await n8n.promptMfaCodeModal.submitMfaCode(disableToken);

		await expect(n8n.personalSettings.getEnableMfaButton()).toBeVisible();
		await n8n.sideBar.signOutFromWorkflows();
	});

	test('Should prompt for MFA code when email changes', async ({ n8n }) => {
		const { email, password, mfaSecret } = INSTANCE_OWNER_CREDENTIALS;

		await n8n.mfaComposer.enableMfa(email, password, mfaSecret!);

		await n8n.personalSettings.goToPersonalSettings();
		await n8n.personalSettings.fillEmail(TEST_DATA.NEW_EMAIL);
		await n8n.personalSettings.pressEnterOnEmail();

		const mfaCode = authenticator.generate(mfaSecret!);
		await n8n.personalSettings.fillMfaCodeAndSave(mfaCode);

		await expect(
			n8n.notifications.getNotificationByTitleOrContent(NOTIFICATIONS.PERSONAL_DETAILS_UPDATED),
		).toBeVisible();

		await n8n.sideBar.signOutFromWorkflows();
	});

	test('Should prompt for MFA recovery code when email changes', async ({ n8n }) => {
		const { email, password, mfaSecret, mfaRecoveryCodes } = INSTANCE_OWNER_CREDENTIALS;

		await n8n.mfaComposer.enableMfa(email, password, mfaSecret!);

		await n8n.personalSettings.goToPersonalSettings();
		await n8n.personalSettings.fillEmail(TEST_DATA.NEW_EMAIL);
		await n8n.personalSettings.pressEnterOnEmail();
		await n8n.personalSettings.fillMfaCodeAndSave(mfaRecoveryCodes![0]);

		await expect(
			n8n.notifications.getNotificationByTitleOrContent(NOTIFICATIONS.PERSONAL_DETAILS_UPDATED),
		).toBeVisible();

		await n8n.sideBar.signOutFromWorkflows();
	});

	test('Should not prompt for MFA code or recovery code when first name or last name changes', async ({
		n8n,
	}) => {
		const { email, password, mfaSecret } = INSTANCE_OWNER_CREDENTIALS;

		await n8n.mfaComposer.enableMfa(email, password, mfaSecret!);

		await n8n.personalSettings.updateFirstAndLastName(
			TEST_DATA.NEW_FIRST_NAME,
			TEST_DATA.NEW_LAST_NAME,
		);

		await expect(
			n8n.notifications.getNotificationByTitleOrContent(NOTIFICATIONS.PERSONAL_DETAILS_UPDATED),
		).toBeVisible();

		await n8n.sideBar.signOutFromWorkflows();
	});

	test('Should be able to disable MFA in account with recovery code', async ({ n8n }) => {
		const { email, password, mfaSecret, mfaRecoveryCodes } = INSTANCE_OWNER_CREDENTIALS;

		await n8n.mfaComposer.enableMfa(email, password, mfaSecret!);
		await n8n.sideBar.signOutFromWorkflows();

		await n8n.mfaComposer.loginWithMfaCode(email, password, mfaSecret!);

		await n8n.personalSettings.triggerDisableMfa();
		await n8n.promptMfaCodeModal.submitMfaCode(mfaRecoveryCodes![0]);

		await expect(n8n.personalSettings.getEnableMfaButton()).toBeVisible();
		await n8n.sideBar.signOutFromWorkflows();
	});
});
