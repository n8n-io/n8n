import { expect } from '@playwright/test';

import type { n8nPage } from '../pages/n8nPage';

/**
 * A class for user interactions with templates that go across multiple pages.
 */
export class TemplatesComposer {
	constructor(private readonly n8n: n8nPage) {}

	/**
	 * Navigates to templates page, waits for loading to complete,
	 * selects the first available template, and imports it to a new workflow
	 * @returns Promise that resolves when the template has been imported
	 */
	async importFirstTemplate(): Promise<void> {
		await this.n8n.navigate.toTemplates();
		await expect(this.n8n.templates.getSkeletonLoader()).toBeHidden();
		await expect(this.n8n.templates.getFirstTemplateCard()).toBeVisible();
		await expect(this.n8n.templates.getTemplatesLoadingContainer()).toBeHidden();

		await this.n8n.templates.clickFirstTemplateCard();
		await expect(this.n8n.templates.getUseTemplateButton()).toBeVisible();

		await this.n8n.templates.clickUseTemplateButton();
		// New workflows redirect to /workflow/<id>?new=true with optional templateId
		await expect(this.n8n.page).toHaveURL(/\/workflow\/[a-zA-Z0-9_-]+\?.*new=true/);
	}

	/**
	 * Fill in dummy credentials for an app in the template credential setup flow
	 * Opens credential creation, fills name, saves, and closes modal
	 * @param appName - The name of the app (e.g. 'Shopify', 'X (Formerly Twitter)')
	 */
	async fillDummyCredentialForApp(
		appName: string,
		{ fields }: { fields: Record<string, string> } = { fields: {} },
	): Promise<void> {
		await this.n8n.templateCredentialSetup.openCredentialCreation(appName);
		await this.n8n.templateCredentialSetup.credentialModal.getCredentialName().click();
		await this.n8n.templateCredentialSetup.credentialModal.getNameInput().fill('test');
		await this.n8n.templateCredentialSetup.credentialModal.fillAllFields(fields);
		await this.n8n.templateCredentialSetup.credentialModal.save();
		await this.n8n.templateCredentialSetup.credentialModal.close();
	}

	/**
	 * Fill in dummy credentials for an app and handle confirmation dialog
	 * @param appName - The name of the app
	 */
	async fillDummyCredentialForAppWithConfirm(
		appName: string,
		{ fields }: { fields: Record<string, string> } = { fields: {} },
	): Promise<void> {
		await this.fillDummyCredentialForApp(appName, { fields });
		await this.n8n.templateCredentialSetup.dismissMessageBox();
	}

	/**
	 * Fill in dummy OAuth credentials for an app in the template credential setup flow.
	 * OAuth credentials have no Save button — saving happens implicitly via the OAuth connect flow.
	 * Clicks the OAuth connect button to trigger save, handles the popup, and closes the modal.
	 * @param appName - The name of the app (e.g. 'X (Formerly Twitter)')
	 */
	async fillOAuthCredentialForApp(
		appName: string,
		{ fields }: { fields: Record<string, string> } = { fields: {} },
	): Promise<void> {
		await this.n8n.templateCredentialSetup.openCredentialCreation(appName);
		await this.n8n.templateCredentialSetup.credentialModal.getCredentialName().click();
		await this.n8n.templateCredentialSetup.credentialModal.getNameInput().fill('test');
		await this.n8n.templateCredentialSetup.credentialModal.fillAllFields(fields);

		const credentialSaved = this.n8n.page.waitForResponse(
			(resp) => resp.url().includes('/rest/credentials') && resp.request().method() === 'POST',
		);
		const popupPromise = this.n8n.page.context().waitForEvent('page');
		await this.n8n.templateCredentialSetup.credentialModal.oauthConnectButton.click();
		await credentialSaved;
		const popup = await popupPromise;
		await popup.close();

		await this.n8n.templateCredentialSetup.credentialModal.close();
	}

	/**
	 * Fill in dummy OAuth credentials for an app and handle confirmation dialog
	 * @param appName - The name of the app
	 */
	async fillOAuthCredentialForAppWithConfirm(
		appName: string,
		{ fields }: { fields: Record<string, string> } = { fields: {} },
	): Promise<void> {
		await this.fillOAuthCredentialForApp(appName, { fields });
		await this.n8n.templateCredentialSetup.dismissMessageBox();
	}
}
