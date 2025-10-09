import { authenticator } from 'otplib';

import { INSTANCE_OWNER_CREDENTIALS } from '../../config/test-users';
import { test, expect } from '../../fixtures/base';

const TEST_DATA = {
	NEW_EMAIL: 'newemail@test.com',
	NEW_FIRST_NAME: 'newFirstName',
	NEW_LAST_NAME: 'newLastName',
};

const NOTIFICATIONS = {
	PERSONAL_DETAILS_UPDATED: 'Personal details updated',
};

const { email, password, mfaSecret, mfaRecoveryCodes } = INSTANCE_OWNER_CREDENTIALS;
const RECOVERY_CODE = mfaRecoveryCodes![0];

test.describe('Two-factor authentication @auth:none @db:reset', () => {
	test('Should be able to login with MFA code', async ({ n8n }) => {
		await n8n.mfaComposer.enableMfa(email, password, mfaSecret!);
		await n8n.sideBar.signOutFromWorkflows();

		await n8n.mfaComposer.loginWithMfaCode(email, password, mfaSecret!);

		await expect(n8n.page).toHaveURL(/workflows/);
	});

	test('Should be able to login with MFA recovery code', async ({ n8n }) => {
		await n8n.mfaComposer.enableMfa(email, password, mfaSecret!);
		await n8n.sideBar.signOutFromWorkflows();

		await n8n.mfaComposer.loginWithMfaRecoveryCode(email, password, RECOVERY_CODE);

		await expect(n8n.page).toHaveURL(/workflows/);
	});

	test('Should be able to disable MFA in account with MFA code', async ({ n8n }) => {
		await n8n.mfaComposer.enableMfa(email, password, mfaSecret!);
		await n8n.sideBar.signOutFromWorkflows();

		await n8n.mfaComposer.loginWithMfaCode(email, password, mfaSecret!);

		const disableToken = authenticator.generate(mfaSecret!);
		await n8n.settingsPersonal.triggerDisableMfa();
		await n8n.settingsPersonal.fillMfaCodeAndSave(disableToken);

		await expect(n8n.settingsPersonal.getEnableMfaButton()).toBeVisible();
	});

	test('Should prompt for MFA code when email changes', async ({ n8n }) => {
		await n8n.mfaComposer.enableMfa(email, password, mfaSecret!);

		await n8n.settingsPersonal.goToPersonalSettings();
		await n8n.settingsPersonal.fillEmail(TEST_DATA.NEW_EMAIL);
		await n8n.settingsPersonal.pressEnterOnEmail();

		const mfaCode = authenticator.generate(mfaSecret!);
		await n8n.settingsPersonal.fillMfaCodeAndSave(mfaCode);

		await expect(
			n8n.notifications.getNotificationByTitleOrContent(NOTIFICATIONS.PERSONAL_DETAILS_UPDATED),
		).toBeVisible();
	});

	test('Should prompt for MFA recovery code when email changes', async ({ n8n }) => {
		await n8n.mfaComposer.enableMfa(email, password, mfaSecret!);

		await n8n.settingsPersonal.goToPersonalSettings();
		await n8n.settingsPersonal.fillEmail(TEST_DATA.NEW_EMAIL);
		await n8n.settingsPersonal.pressEnterOnEmail();

		await expect(n8n.settingsPersonal.getMfaCodeOrRecoveryCodeInput()).toBeVisible();
	});

	test('Should not prompt for MFA code or recovery code when first name or last name changes', async ({
		n8n,
	}) => {
		await n8n.mfaComposer.enableMfa(email, password, mfaSecret!);

		await n8n.settingsPersonal.updateFirstAndLastName(
			TEST_DATA.NEW_FIRST_NAME,
			TEST_DATA.NEW_LAST_NAME,
		);

		await expect(
			n8n.notifications.getNotificationByTitleOrContent(NOTIFICATIONS.PERSONAL_DETAILS_UPDATED),
		).toBeVisible();
	});

	test('Should be able to disable MFA in account with recovery code', async ({ n8n }) => {
		await n8n.mfaComposer.enableMfa(email, password, mfaSecret!);
		await n8n.sideBar.signOutFromWorkflows();

		await n8n.mfaComposer.loginWithMfaCode(email, password, mfaSecret!);

		await n8n.settingsPersonal.triggerDisableMfa();
		await n8n.settingsPersonal.fillMfaCodeAndSave(RECOVERY_CODE);

		await expect(n8n.settingsPersonal.getEnableMfaButton()).toBeVisible();
	});
});
