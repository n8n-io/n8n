import { authenticator } from 'otplib';

import {
	INSTANCE_MEMBER_CREDENTIALS,
	INSTANCE_OWNER_CREDENTIALS,
} from '../../../../config/test-users';
import { test, expect } from '../../../../fixtures/base';

test.use({ capability: { env: { TEST_ISOLATION: 'two-factor-auth' } } });

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

test.describe(
	'Two-factor authentication @auth:none @db:reset',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test.describe.configure({ mode: 'serial' });

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

			await n8n.settingsPersonal.goto();
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

			await n8n.settingsPersonal.goto();
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

		/**
		 * A user without MFA on an enforced instance is redirected to Personal
		 * Settings, and `initializeAuthenticatedFeatures` throws `MfaRequiredError`
		 * on the way there. Post-login modal registration therefore never runs, so
		 * every modal this page offers has to be registered eagerly, pre-mount.
		 * Nothing else exercises that path.
		 *
		 * Runs last in this serial file: it turns MFA enforcement on for the whole
		 * instance, and the owner session it needs cannot be reused by the tests
		 * above.
		 */
		test('Should open the Personal Settings modals on the MFA-enforced landing page', async ({
			n8n,
			api,
		}) => {
			await api.enableFeature('mfaEnforcement');

			try {
				// The enforce endpoint refuses a session that did not use MFA, so the
				// owner enrols and signs back in with a code first.
				await n8n.mfaComposer.enableMfa(email, password, mfaSecret!);
				await n8n.sideBar.signOutFromWorkflows();
				await n8n.mfaComposer.loginWithMfaCode(email, password, mfaSecret!);

				await n8n.securitySettings.goto();
				await n8n.securitySettings.enforceMfa();

				const memberN8n = await n8n.start.withUser(INSTANCE_MEMBER_CREDENTIALS[0]);
				await memberN8n.navigate.toHome();

				await expect(memberN8n.page).toHaveURL(/\/settings\/personal/);
				await expect(memberN8n.settingsPersonal.getPersonalSettingsPanel()).toBeVisible();

				await memberN8n.settingsPersonal.clickChangePassword();
				await expect(memberN8n.settingsPersonal.getChangePasswordModal()).toBeVisible();
				await memberN8n.page.keyboard.press('Escape');
				await expect(memberN8n.settingsPersonal.getChangePasswordModal()).toBeHidden();

				await memberN8n.settingsPersonal.clickEnableMfa();
				await expect(memberN8n.mfaSetupModal.container).toBeVisible();
			} finally {
				// Leave the instance unenforced. Dropping the license is the one lever
				// that needs no MFA-authenticated session, so it works after a failure
				// part-way through the flow above.
				await api.disableFeature('mfaEnforcement');
			}
		});
	},
);
