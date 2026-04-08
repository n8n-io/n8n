import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

import { BaseModal } from './BaseModal';

/**
 * Page object for the secret provider connection creation/edit modal.
 * Modal key: SECRETS_PROVIDER_CONNECTION_MODAL_KEY ("secretsProviderConnection")
 * Component: SecretsProviderConnectionModal.ee.vue
 *
 * Used for both create mode (no providerKey) and edit mode (with providerKey).
 */
export class SecretsProviderConnectionModal extends BaseModal {
	get container(): Locator {
		return this.page.getByRole('dialog');
	}

	/** Readonly/disabled in edit mode. */
	getConnectionNameInput(): Locator {
		return this.container.getByTestId('provider-name');
	}

	async fillConnectionName(name: string): Promise<void> {
		const input = this.getConnectionNameInput();
		await input.waitFor({ state: 'visible' });
		await input.fill(name);
		await input.blur();
	}

	/** Disabled in edit mode. */
	getProviderTypeSelect(): Locator {
		return this.container.getByTestId('provider-type-select');
	}

	async selectProviderType(typeLabel: string): Promise<void> {
		await this.getProviderTypeSelect().click();
		await this.page.getByRole('option', { name: typeLabel }).click();
	}

	/**
	 * Fills a dynamic provider property field by its parameter name (e.g. 'region', 'accessKeyId').
	 * Fields are rendered via ParameterInputExpanded as `parameter-input-{name}` test ids.
	 */
	async fillProviderField(fieldName: string, value: string): Promise<void> {
		const field = this.container.getByTestId(`parameter-input-${fieldName}`);
		const input = field.locator('input, textarea').first();
		await input.waitFor({ state: 'visible', timeout: 10_000 });
		await input.fill(value);
		await expect(input).toHaveValue(value);
	}

	/** The save/create button in the modal header. */
	getSaveButton(): Locator {
		return this.container.getByTestId('secrets-provider-connection-save-button');
	}

	/** Clicks save and waits for the connection API call. After saving, the modal auto-tests the connection. */
	async save(): Promise<void> {
		const responsePromise = this.page.waitForResponse(
			(res) =>
				res.url().includes('/rest/secret-providers/connections') &&
				['POST', 'PATCH'].includes(res.request().method()),
		);
		await this.getSaveButton().click();
		await responsePromise;
	}

	/** Green callout — visible when the connection test succeeds. */
	getSuccessCallout(): Locator {
		return this.container.getByTestId('connection-success-callout');
	}

	getErrorBanner(): Locator {
		return this.container.getByTestId('connection-error-banner');
	}

	/**
	 * Switches to the Scope/Sharing tab.
	 * Only available in edit mode (requires forProjects feature flag + canShareGlobally permission).
	 */
	async switchToScopeTab(): Promise<void> {
		await this.container.getByTestId('sidebar-item-sharing').click();
	}

	getScopeSelect(): Locator {
		return this.container.getByTestId('secrets-provider-scope-select');
	}

	/**
	 * @param optionLabel - The project name or 'Global' to select
	 */
	async selectScope(optionLabel: string): Promise<void> {
		await this.getScopeSelect().waitFor({ state: 'visible' });
		await this.getScopeSelect().click();
		const option = this.page.getByRole('option', { name: optionLabel });
		await option.waitFor({ state: 'visible' });
		await option.click();
		await option.waitFor({ state: 'hidden' });
	}

	async close(): Promise<void> {
		const closeBtn = this.container.locator('.el-dialog__close').first();
		if (await closeBtn.isVisible()) {
			await closeBtn.click();
		}
	}

	async waitForModal(): Promise<void> {
		await this.container.waitFor({ state: 'visible' });
	}
}
