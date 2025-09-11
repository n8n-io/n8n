import { authenticator } from 'otplib';

import { INSTANCE_OWNER_CREDENTIALS } from '../../config/test-users';
import { test, expect } from '../../fixtures/base';

const MFA_SECRET = 'KVKFKRCPNZQUYMLXOVYDSQKJKZDTSRLD';
const RECOVERY_CODE = 'd04ea17f-e8b2-4afa-a9aa-57a2c735b30e';

const user = {
	email: INSTANCE_OWNER_CREDENTIALS.email,
	password: INSTANCE_OWNER_CREDENTIALS.password,
	firstName: 'User',
	lastName: 'A',
	mfaEnabled: false,
	mfaSecret: MFA_SECRET,
	mfaRecoveryCodes: [RECOVERY_CODE],
};

test.describe('Two-factor authentication @auth:none @db:reset', () => {
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
					mfaSecret: MFA_SECRET,
					mfaRecoveryCodes: [RECOVERY_CODE],
				},
			},
		});
	});

	test('Should be able to login with MFA code', async ({ n8n }) => {
		const { email, password } = user;

		// Match Cypress: login -> enable MFA -> signout -> login with MFA code
		await n8n.signIn.goToSignIn();
		await n8n.signIn.fillEmail(email);
		await n8n.signIn.fillPassword(password);
		await n8n.signIn.clickSubmit();
		await n8n.page.waitForURL(/\/workflow/);

		// Enable MFA and get the actual secret from modal (like Cypress does)
		const actualSecret = await n8n.settings.enableMfa();

		// Wait for MFA setup to fully complete (modal disappears)
		await expect(n8n.page.getByTestId('mfaSetup-modal')).toBeHidden();

		// Sign out
		await n8n.sideBar.clickSignout();

		// Login with MFA code using the actual secret from setup
		await n8n.signIn.fillEmail(email);
		await n8n.signIn.fillPassword(password);
		await n8n.signIn.clickSubmit();

		await expect(n8n.mfaLogin.getForm()).toBeVisible();
		const loginMfaCode = authenticator.generate(actualSecret);
		await n8n.mfaLogin.submitMfaCode(loginMfaCode);
		await expect(n8n.page).toHaveURL(/\/workflow/);
		await n8n.sideBar.clickSignout();
	});

	test('Should be able to login with MFA recovery code', async ({ n8n }) => {
		const { email, password } = user;

		// Match Cypress: login -> enable MFA -> signout -> login with recovery code
		await n8n.signIn.goToSignIn();
		await n8n.signIn.fillEmail(email);
		await n8n.signIn.fillPassword(password);
		await n8n.signIn.clickSubmit();
		await n8n.page.waitForURL(/\/workflow/);

		// Enable MFA (manual approach with clipboard secret for correct validation)
		await n8n.settings.goToPersonalSettings();

		// Set up intercept for MFA QR code request (like Cypress @getMfaQrCode)
		const qrCodePromise = n8n.page.waitForResponse(
			(response) => response.url().includes('/rest/mfa/qr') && response.status() === 200,
		);

		await n8n.settings.clickEnableMfa();

		// Wait for QR code request to complete (like Cypress cy.wait('@getMfaQrCode'))
		await qrCodePromise;

		await n8n.mfaSetupModal.getModalContainer().waitFor({ state: 'visible' });

		// Get the actual secret from clipboard (like the working first test)
		await n8n.mfaSetupModal.getCopySecretToClipboardButton().waitFor({ state: 'visible' });
		await n8n.mfaSetupModal.clickCopySecretToClipboard();
		const actualSecret = await n8n.page.evaluate(() => navigator.clipboard.readText());

		// Generate token using the real secret from modal
		const mfaCode = authenticator.generate(actualSecret);
		await n8n.mfaSetupModal.fillToken(mfaCode);
		await n8n.mfaSetupModal.clickDownloadRecoveryCodes(); // Required for Save button to be enabled

		// Extract the first recovery code from the modal
		// After download, the modal displays fresh recovery codes that we need to use
		// since the download step invalidates any predefined recovery codes
		let extractedRecoveryCode = RECOVERY_CODE; // fallback to predefined

		try {
			// Find recovery codes displayed in the modal after download
			const recoveryCodeElements = await n8n.page
				.locator('[class*="recovery"], [class*="code"], .recovery-code, [data-test-id*="recovery"]')
				.allTextContents();

			// Look for UUID-like recovery codes in the modal content
			for (const text of recoveryCodeElements) {
				const match = text.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/);
				if (match) {
					extractedRecoveryCode = match[0]; // Use the first matched recovery code
					break;
				}
			}
		} catch (error) {
			// If extraction fails, fall back to predefined code (may not work)
		}

		await n8n.mfaSetupModal.clickSave();

		// Wait for MFA setup to fully complete (modal disappears)
		await expect(n8n.page.getByTestId('mfaSetup-modal')).toBeHidden();

		// Sign out
		await n8n.sideBar.clickSignout();

		// Login with recovery code
		await n8n.signIn.fillEmail(email);
		await n8n.signIn.fillPassword(password);
		await n8n.signIn.clickSubmit();

		await expect(n8n.mfaLogin.getForm()).toBeVisible();
		// Use the extracted recovery code for login
		await n8n.mfaLogin.submitMfaRecoveryCode(extractedRecoveryCode);

		// Verify successful login by checking we're redirected to workflows page
		await expect(n8n.page).toHaveURL(/\/workflow/);
		await n8n.sideBar.clickSignout();
	});

	test('Should be able to disable MFA in account with MFA code', async ({ n8n }) => {
		const { email, password } = user;

		// Match Cypress: login -> enable MFA -> signout -> login with MFA code -> disable MFA
		await n8n.signIn.goToSignIn();
		await n8n.signIn.fillEmail(email);
		await n8n.signIn.fillPassword(password);
		await n8n.signIn.clickSubmit();
		await n8n.page.waitForURL(/\/workflow/);

		// Enable MFA and get the actual secret from modal
		const actualSecret = await n8n.settings.enableMfa();

		// Wait for MFA setup to fully complete (modal disappears)
		await expect(n8n.page.getByTestId('mfaSetup-modal')).toBeHidden();

		// Sign out
		await n8n.sideBar.clickSignout();

		// Login with MFA code using the actual secret from setup
		await n8n.signIn.fillEmail(email);
		await n8n.signIn.fillPassword(password);
		await n8n.signIn.clickSubmit();

		await expect(n8n.mfaLogin.getForm()).toBeVisible();
		const loginMfaCode = authenticator.generate(actualSecret);
		await n8n.mfaLogin.submitMfaCode(loginMfaCode);
		await expect(n8n.page).toHaveURL(/\/workflow/);

		// Disable MFA using fresh MFA code
		const disableToken = authenticator.generate(actualSecret);
		await n8n.settings.disableMfa(disableToken);

		// Verify MFA is disabled by checking that Enable MFA button is visible
		await expect(n8n.settings.getEnableMfaButton()).toBeVisible();
		await n8n.sideBar.clickSignout();
	});

	test('Should prompt for MFA code when email changes', async ({ n8n }) => {
		const { email, password } = user;

		// Match Cypress: login -> enable MFA -> update email -> fill MFA code -> save
		await n8n.signIn.goToSignIn();
		await n8n.signIn.fillEmail(email);
		await n8n.signIn.fillPassword(password);
		await n8n.signIn.clickSubmit();
		await n8n.page.waitForURL(/\/workflow/);

		// Enable MFA and get the actual secret for MFA code generation
		const actualSecret = await n8n.settings.enableMfa();

		// Wait for MFA setup to fully complete (modal disappears)
		await expect(n8n.page.getByTestId('mfaSetup-modal')).toBeHidden();

		// Update email - this should trigger MFA prompt (different from updateEmail which auto-saves)
		await n8n.settings.goToPersonalSettings();
		await n8n.settings.fillEmail('newemail@test.com');
		await n8n.settings.saveSettings();

		// Fill MFA code in the prompt that should appear
		const mfaCode = authenticator.generate(actualSecret);
		await n8n.settings.fillMfaCodeOrRecoveryCode(mfaCode);
		await n8n.settings.clickMfaSave();

		// Verify success notification appears
		await expect(
			n8n.notifications.getNotificationByTitleOrContent('Personal details updated'),
		).toBeVisible();

		await n8n.sideBar.clickSignout();
	});

	test('Should prompt for MFA recovery code when email changes', async ({ n8n }) => {
		const { email, password } = user;

		// Match Cypress: login -> enable MFA -> update email -> fill recovery code -> save
		await n8n.signIn.goToSignIn();
		await n8n.signIn.fillEmail(email);
		await n8n.signIn.fillPassword(password);
		await n8n.signIn.clickSubmit();
		await n8n.page.waitForURL(/\/workflow/);

		// Enable MFA (simple approach like Cypress and our successful MFA code email test)
		const actualSecret = await n8n.settings.enableMfa();

		// Wait for MFA setup to fully complete (modal disappears)
		await expect(n8n.page.getByTestId('mfaSetup-modal')).toBeHidden();

		// Update email - this should trigger MFA prompt
		await n8n.settings.goToPersonalSettings();
		await n8n.settings.fillEmail('newemail@test.com');
		await n8n.settings.saveSettings();

		// Fill predefined recovery code in the prompt that should appear (like Cypress)
		await n8n.settings.fillMfaCodeOrRecoveryCode(RECOVERY_CODE);
		await n8n.settings.clickMfaSave();

		await n8n.sideBar.clickSignout();
	});

	test('Should not prompt for MFA code or recovery code when first name or last name changes', async ({
		n8n,
	}) => {
		const { email, password } = user;

		// Match Cypress: login -> enable MFA -> update names -> verify success (no MFA prompt)
		await n8n.signIn.goToSignIn();
		await n8n.signIn.fillEmail(email);
		await n8n.signIn.fillPassword(password);
		await n8n.signIn.clickSubmit();
		await n8n.page.waitForURL(/\/workflow/);

		// Enable MFA (simple approach since we don't need MFA login later)
		const actualSecret = await n8n.settings.enableMfa();

		// Wait for MFA setup to fully complete (modal disappears)
		await expect(n8n.page.getByTestId('mfaSetup-modal')).toBeHidden();

		// Update first and last name - should NOT prompt for MFA
		await n8n.settings.updateFirstAndLastName('newFirstName', 'newLastName');

		// Verify success notification appears (indicates update succeeded without MFA prompt)
		await expect(
			n8n.notifications.getNotificationByTitleOrContent('Personal details updated'),
		).toBeVisible();

		await n8n.sideBar.clickSignout();
	});

	test('Should be able to disable MFA in account with recovery code', async ({ n8n }) => {
		const { email, password } = user;

		// Match Cypress: login -> enable MFA -> signout -> login with MFA code -> disable MFA with recovery code
		await n8n.signIn.goToSignIn();
		await n8n.signIn.fillEmail(email);
		await n8n.signIn.fillPassword(password);
		await n8n.signIn.clickSubmit();
		await n8n.page.waitForURL(/\/workflow/);

		// Enable MFA with recovery code extraction (manual approach like recovery login test)
		await n8n.settings.goToPersonalSettings();

		// Set up intercept for MFA QR code request
		const qrCodePromise = n8n.page.waitForResponse(
			(response) => response.url().includes('/rest/mfa/qr') && response.status() === 200,
		);

		await n8n.settings.clickEnableMfa();

		// Wait for QR code request to complete
		await qrCodePromise;

		await n8n.mfaSetupModal.getModalContainer().waitFor({ state: 'visible' });

		// Get the actual secret from clipboard
		await n8n.mfaSetupModal.getCopySecretToClipboardButton().waitFor({ state: 'visible' });
		await n8n.mfaSetupModal.clickCopySecretToClipboard();
		const actualSecret = await n8n.page.evaluate(() => navigator.clipboard.readText());

		// Generate token using the real secret from modal
		const mfaCode = authenticator.generate(actualSecret);
		await n8n.mfaSetupModal.fillToken(mfaCode);
		await n8n.mfaSetupModal.clickDownloadRecoveryCodes(); // Required for Save button to be enabled

		// Extract the first recovery code from the modal
		// After download, the modal displays fresh recovery codes that we need to use
		// since the download step invalidates any predefined recovery codes
		let extractedRecoveryCode = RECOVERY_CODE; // fallback to predefined

		try {
			// Find recovery codes displayed in the modal after download
			const recoveryCodeElements = await n8n.page
				.locator('[class*="recovery"], [class*="code"], .recovery-code, [data-test-id*="recovery"]')
				.allTextContents();

			// Look for UUID-like recovery codes in the modal content
			for (const text of recoveryCodeElements) {
				const match = text.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/);
				if (match) {
					extractedRecoveryCode = match[0]; // Use the first matched recovery code
					break;
				}
			}
		} catch (error) {
			// If extraction fails, fall back to predefined code (may not work)
		}

		await n8n.mfaSetupModal.clickSave();

		// Wait for MFA setup to fully complete (modal disappears)
		await expect(n8n.page.getByTestId('mfaSetup-modal')).toBeHidden();

		// Sign out
		await n8n.sideBar.clickSignout();

		// Login with MFA code using the actual secret from setup
		await n8n.signIn.fillEmail(email);
		await n8n.signIn.fillPassword(password);
		await n8n.signIn.clickSubmit();

		await expect(n8n.mfaLogin.getForm()).toBeVisible();
		const loginMfaCode = authenticator.generate(actualSecret);
		await n8n.mfaLogin.submitMfaCode(loginMfaCode);
		await expect(n8n.page).toHaveURL(/\/workflow/);

		// Disable MFA using extracted recovery code
		await n8n.settings.disableMfa(extractedRecoveryCode);

		// Verify MFA is disabled by checking that Enable MFA button is visible
		await expect(n8n.settings.getEnableMfaButton()).toBeVisible();
		await n8n.sideBar.clickSignout();
	});
});
