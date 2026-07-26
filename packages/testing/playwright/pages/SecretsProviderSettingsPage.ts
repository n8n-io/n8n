import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

/**
 * Page object for /settings/external-secrets
 * Wraps the SettingsSecretsProviders.ee.vue view.
 */
export class SecretsProviderSettingsPage extends BasePage {
	async goto(): Promise<void> {
		await this.page.goto('/settings/external-secrets');
	}

	/** The licensed content container (visible when enterprise feature is enabled) */
	getLicensedContent(): Locator {
		return this.page.getByTestId('secrets-provider-connections-content-licensed');
	}

	/** The empty state action box (visible when no providers are configured) */
	getEmptyState(): Locator {
		return this.page.getByTestId('secrets-provider-connections-empty-state');
	}

	async clickEmptyStateAddButton(): Promise<void> {
		await this.getEmptyState().getByRole('button').click();
	}

	/** Returns the provider name label for the given connection name. */
	getProviderNameCard(name: string): Locator {
		return this.page.getByTestId('secrets-provider-name').filter({ hasText: name });
	}

	/** Loading skeleton shown while providers are being fetched */
	getLoadingIndicator(): Locator {
		return this.page.getByTestId('secrets-providers-loading');
	}

	/** Returns the global badge scoped to the card for the given provider name. */
	getProviderCardGlobalBadge(name: string): Locator {
		return this.getCardContainer(name).getByTestId('secrets-provider-global-badge');
	}

	/** Returns the project badge scoped to the card for the given provider name. */
	getProviderCardProjectBadge(name: string): Locator {
		return this.getCardContainer(name).getByTestId('secrets-provider-project-badge');
	}

	/** Returns the action toggle (3-dot menu) for a specific provider card. */
	getProviderCardActionToggle(name: string): Locator {
		return this.getCardContainer(name).getByTestId('secrets-provider-action-toggle');
	}

	/**
	 * Selects an action from the dropdown menu of a specific provider card.
	 * @param name - The provider connection name
	 * @param action - The action label to click (e.g. 'Edit', 'Delete', 'Share')
	 */
	async selectCardAction(name: string, action: string): Promise<void> {
		await this.getProviderCardActionToggle(name).click();
		await this.page.getByRole('menuitem', { name: action }).click();
	}

	async waitForProvidersLoaded(): Promise<void> {
		await this.getLicensedContent().waitFor({ state: 'visible' });
		await this.getLoadingIndicator().waitFor({ state: 'hidden' });
	}

	/**
	 * Returns the N8nCard element wrapping a provider card for a given name.
	 * Used internally to scope sub-element lookups to the right card.
	 */
	private getCardContainer(name: string): Locator {
		return this.page
			.getByTestId('secrets-provider-name')
			.filter({ hasText: name })
			.locator('xpath=ancestor::*[contains(@class,"card") or @role="article"]')
			.first();
	}
}
