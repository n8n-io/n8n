import { authenticator } from 'otplib';

import { INSTANCE_OWNER_CREDENTIALS } from '../../config/test-users';
import { test, expect } from '../../fixtures/base';

const MFA_CONFIG = {
	SECRET: 'KVKFKRCPNZQUYMLXOVYDSQKJKZDTSRLD',
	FALLBACK_RECOVERY_CODE: 'd04ea17f-e8b2-4afa-a9aa-57a2c735b30e',
};

const NOTIFICATIONS = {
	PERSONAL_DETAILS_UPDATED: 'Personal details updated',
};

const user = {
	email: INSTANCE_OWNER_CREDENTIALS.email,
	password: INSTANCE_OWNER_CREDENTIALS.password,
	firstName: 'User',
	lastName: 'A',
	mfaEnabled: false,
	mfaSecret: MFA_CONFIG.SECRET,
	mfaRecoveryCodes: [MFA_CONFIG.FALLBACK_RECOVERY_CODE],
};

test.describe('Two-factor authentication @auth:none @db:reset', () => {
	const TEST_DATA = {
		NEW_EMAIL: 'newemail@test.com',
		NEW_FIRST_NAME: 'newFirstName',
		NEW_LAST_NAME: 'newLastName',
	};

	test.beforeEach(async ({ api }) => {
		await api.request.post('/rest/e2e/reset', {
			data: {
				owner: user,
				members: [],
				admin: {
					email: 'admin@n8n.io',
					password: 'password',
					firstName: 'Admin',
					lastName: 'B',
					mfaEnabled: false,
					mfaSecret: MFA_CONFIG.SECRET,
					mfaRecoveryCodes: [MFA_CONFIG.FALLBACK_RECOVERY_CODE],
				},
			},
		});
	});

	test('Should be able to login with MFA code', async ({ n8n }) => {
		const { email, password } = user;

		const secret = await n8n.mfaComposer.setupUser(email, password);
		await n8n.sideBar.clickSignout();

		await n8n.mfaComposer.loginWithMfaCode(email, password, secret);
		await n8n.sideBar.clickSignout();
	});

	test('Should be able to login with MFA recovery code', async ({ n8n }) => {
		const { email, password } = user;

		const { recoveryCode } = await n8n.mfaComposer.setupUserWithRecoveryCode(email, password);
		await n8n.sideBar.clickSignout();

		await n8n.signIn.fillEmail(email);
		await n8n.signIn.fillPassword(password);
		await n8n.signIn.clickSubmit();

		await expect(n8n.mfaLogin.getForm()).toBeVisible();
		await n8n.mfaLogin.submitMfaRecoveryCode(recoveryCode);

		await expect(n8n.page).toHaveURL(/\/workflow/);
		await n8n.sideBar.clickSignout();
	});

	test('Should be able to disable MFA in account with MFA code', async ({ n8n }) => {
		const { email, password } = user;

		const secret = await n8n.mfaComposer.setupUser(email, password);
		await n8n.sideBar.clickSignout();

		await n8n.mfaComposer.loginWithMfaCode(email, password, secret);

		const disableToken = authenticator.generate(secret);
		await n8n.settings.disableMfa(disableToken);

		await expect(n8n.settings.getEnableMfaButton()).toBeVisible();
		await n8n.sideBar.clickSignout();
	});

	test('Should prompt for MFA code when email changes', async ({ n8n }) => {
		const { email, password } = user;

		const secret = await n8n.mfaComposer.setupUser(email, password);

		await n8n.settings.goToPersonalSettings();
		await n8n.settings.fillEmail(TEST_DATA.NEW_EMAIL);
		await n8n.settings.saveSettings();

		const mfaCode = authenticator.generate(secret);
		await n8n.settings.fillMfaCodeOrRecoveryCode(mfaCode);
		await n8n.settings.clickMfaSave();

		await expect(
			n8n.notifications.getNotificationByTitleOrContent(NOTIFICATIONS.PERSONAL_DETAILS_UPDATED),
		).toBeVisible();

		await n8n.sideBar.clickSignout();
	});

	test('Should prompt for MFA recovery code when email changes', async ({ n8n }) => {
		const { email, password } = user;

		await n8n.mfaComposer.setupUser(email, password);

		await n8n.settings.goToPersonalSettings();
		await n8n.settings.fillEmail(TEST_DATA.NEW_EMAIL);
		await n8n.settings.saveSettings();

		await n8n.settings.fillMfaCodeOrRecoveryCode(MFA_CONFIG.FALLBACK_RECOVERY_CODE);
		await n8n.settings.clickMfaSave();

		const successToast = n8n.page.getByRole('alert');
		await expect(successToast).toBeVisible();

		await n8n.sideBar.clickSignout();
	});

	test('Should not prompt for MFA code or recovery code when first name or last name changes', async ({
		n8n,
	}) => {
		const { email, password } = user;

		await n8n.mfaComposer.setupUser(email, password);

		await n8n.settings.updateFirstAndLastName(TEST_DATA.NEW_FIRST_NAME, TEST_DATA.NEW_LAST_NAME);

		await expect(
			n8n.notifications.getNotificationByTitleOrContent(NOTIFICATIONS.PERSONAL_DETAILS_UPDATED),
		).toBeVisible();

		await n8n.sideBar.clickSignout();
	});

	test('Should be able to disable MFA in account with recovery code', async ({ n8n }) => {
		const { email, password } = user;

		const { secret, recoveryCode } = await n8n.mfaComposer.setupUserWithRecoveryCode(
			email,
			password,
		);
		await n8n.sideBar.clickSignout();

		await n8n.mfaComposer.loginWithMfaCode(email, password, secret);

		await n8n.settings.disableMfa(recoveryCode);

		await expect(n8n.settings.getEnableMfaButton()).toBeVisible();
		await n8n.sideBar.clickSignout();
	});
});
