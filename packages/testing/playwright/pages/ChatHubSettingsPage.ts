import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';
import { ChatHubProviderSettingsModal } from './components/ChatHubProviderSettingsModal';
import { CredentialModal } from './components/CredentialModal';

export class ChatHubSettingsPage extends BasePage {
	readonly providerModal = new ChatHubProviderSettingsModal(
		this.page.getByTestId('chatProviderSettingsModal-modal'),
	);
	readonly credentialModal = new CredentialModal(this.page.getByTestId('editCredential-modal'));

	constructor(page: Page) {
		super(page);
	}

	getProvidersTable(): Locator {
		return this.page.getByTestId('chat-providers-table');
	}

	getProviderRow(providerName: string): Locator {
		return this.getProvidersTable().getByRole('row').filter({ hasText: providerName });
	}

	getProviderActionToggle(providerName: string): Locator {
		return this.getProviderRow(providerName).getByTestId('action-toggle');
	}
}
