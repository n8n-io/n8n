import type { Locator, Page } from '@playwright/test';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

async function tryReachBackgroundConfigTypeWithKeyboard(
	page: Page,
	confirmDialog: Locator,
	configTypeCombobox: Locator,
	connectionStringOption: Locator,
): Promise<{ escapedConfirmationDialog: boolean; reachedBackgroundConfigType: boolean }> {
	let escapedConfirmationDialog = false;
	let reachedBackgroundConfigType = false;

	for (let step = 0; step < 25; step++) {
		await page.keyboard.press('Tab');
		if (await configTypeCombobox.evaluate((el) => el === document.activeElement)) {
			reachedBackgroundConfigType = true;
			break;
		}
		const focusInsideConfirmDialog = await confirmDialog.evaluate((dialog) =>
			dialog.contains(document.activeElement),
		);
		if (!focusInsideConfirmDialog) {
			escapedConfirmationDialog = true;
		}
	}

	if (reachedBackgroundConfigType) {
		await page.keyboard.press('ArrowDown');
		const opened = await connectionStringOption
			.waitFor({ state: 'visible', timeout: 2_000 })
			.then(() => true)
			.catch(() => false);
		if (opened) {
			await connectionStringOption.click({ timeout: 2_000 }).catch(() => {});
		}
	}

	return { escapedConfirmationDialog, reachedBackgroundConfigType };
}

// IAM-1599: The 'Close without saving?' confirmation dialog must block interaction
// with the credential configuration modal behind it.
test.describe(
	'IAM-1599: Unsaved credential close confirmation blocks background configuration',
	{
		annotation: [
			{ type: 'owner', description: 'Identity & Access' },
			{ type: 'issue', description: 'IAM-1599' },
		],
	},
	() => {
		test.beforeEach(async ({ n8n }) => {
			const projectId = await n8n.start.fromNewProject();
			const credentialName = `MongoDB ${nanoid(6)}`;

			await n8n.api.credentials.createCredential({
				name: credentialName,
				type: 'mongoDb',
				data: {
					configurationType: 'values',
					host: 'localhost',
					database: 'initial-db',
					user: '',
					password: '',
					port: 27017,
					tls: false,
				},
				projectId,
			});

			await n8n.navigate.toCredentials(projectId);
			await n8n.credentials.cards.clickCredentialCard(credentialName);

			await expect(n8n.credentials.credentialModal.getModal()).toBeVisible();
			await expect(n8n.credentials.credentialModal.getFieldInput('host')).toBeVisible();
			await expect(n8n.credentials.credentialModal.getFieldInput('database')).toHaveValue(
				'initial-db',
			);

			// Modify a field without saving so closing triggers 'Close without saving?'.
			await n8n.credentials.credentialModal.fillField('database', 'unsaved-db');
			await n8n.credentials.credentialModal.close();
			await expect(n8n.credentials.getUnsavedChangesDialog()).toBeVisible();
			await expect(n8n.credentials.getUnsavedChangesKeepEditingButton()).toBeVisible();
		});

		test('allows switching Configuration Type after choosing Keep Editing', async ({ n8n }) => {
			await n8n.credentials.getUnsavedChangesKeepEditingButton().click();
			await expect(n8n.credentials.getUnsavedChangesDialog()).toBeHidden();
			await expect(n8n.credentials.credentialModal.getModal()).toBeVisible();

			await n8n.credentials.credentialModal.selectFieldOption(
				'configurationType',
				'Connection String',
			);
			await expect(n8n.credentials.credentialModal.getFieldInput('connectionString')).toBeVisible();
			await expect(n8n.credentials.credentialModal.getFieldInput('host')).toBeHidden();
		});

		test('blocks switching MongoDB Configuration Type while Close without saving dialog is open', async ({
			n8n,
		}) => {
			const confirmDialog = n8n.credentials.getUnsavedChangesDialog();
			const credentialModal = n8n.credentials.credentialModal;

			const { escapedConfirmationDialog, reachedBackgroundConfigType } =
				await tryReachBackgroundConfigTypeWithKeyboard(
					n8n.page,
					confirmDialog,
					credentialModal.getFieldCombobox('configurationType'),
					credentialModal.getVisibleDropdownOption('Connection String'),
				);

			await expect(confirmDialog).toBeVisible();
			await expect(
				credentialModal.getFieldInput('host'),
				'Background MongoDB Values fields must remain visible while Close without saving is open',
			).toBeVisible();
			await expect(
				credentialModal.getFieldInput('connectionString'),
				'Background MongoDB Connection String field must not appear while Close without saving is open',
			).toBeHidden();
			expect(
				reachedBackgroundConfigType,
				'Keyboard focus must not reach background Configuration Type behind Close without saving',
			).toBe(false);
			expect(
				escapedConfirmationDialog,
				'Keyboard focus must remain trapped inside the Close without saving confirmation dialog',
			).toBe(false);
		});
	},
);
