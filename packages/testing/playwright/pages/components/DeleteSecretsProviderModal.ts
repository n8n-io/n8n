import type { Locator } from '@playwright/test';

import { BaseModal } from './BaseModal';

/**
 * Page object for the delete secrets provider confirmation modal.
 * Modal key: DELETE_SECRETS_PROVIDER_MODAL_KEY ("deleteSecretsProvider")
 * Component: DeleteSecretsProviderModal.ee.vue
 *
 * When credentials reference the provider, a confirmation input is required
 * where the user must type the exact provider name before deletion is enabled.
 */
export class DeleteSecretsProviderModal extends BaseModal {
	get container(): Locator {
		return this.page.getByTestId('deleteSecretsProvider-modal');
	}

	async waitForModal(): Promise<void> {
		await this.container.waitFor({ state: 'visible' });
	}

	/**
	 * Only shown when credentials reference this provider.
	 * The user must type the exact provider name to enable deletion.
	 */
	getConfirmationInput(): Locator {
		return this.container.getByTestId('delete-confirmation-input');
	}

	/** Required when credentials reference this provider. */
	async fillConfirmation(providerName: string): Promise<void> {
		const input = this.getConfirmationInput();
		await input.waitFor({ state: 'visible' });
		await input.fill(providerName);
	}

	getConfirmDeleteButton(): Locator {
		return this.container.getByTestId('confirm-delete-button');
	}

	/** Clicks the confirm delete button and waits for the DELETE API response. */
	async confirmDelete(): Promise<void> {
		const responsePromise = this.page.waitForResponse(
			(res) =>
				res.url().includes('/rest/secret-providers/connections') &&
				res.request().method() === 'DELETE',
		);
		await this.getConfirmDeleteButton().click();
		await responsePromise;
	}
}
