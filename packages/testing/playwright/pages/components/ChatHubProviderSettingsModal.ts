import type { Locator } from '@playwright/test';

import { BaseModal } from './BaseModal';

export class ChatHubProviderSettingsModal extends BaseModal {
	constructor(protected readonly root: Locator) {
		super(root.page());
	}

	getRoot(): Locator {
		return this.root;
	}

	getEnabledToggle(): Locator {
		return this.root.getByTestId('chat-provider-enabled-switch');
	}

	getCredentialPicker(): Locator {
		return this.root.getByLabel('Default credential');
	}

	getEditCredentialButton(): Locator {
		return this.root.getByTitle('Update Credential');
	}

	getLimitModelsToggle(): Locator {
		return this.root.getByTestId('chat-provider-limit-models-switch');
	}

	getModelSelector(): Locator {
		return this.root.getByLabel('Models', { exact: true });
	}

	getConfirmButton(): Locator {
		return this.root.getByRole('button', { name: 'Confirm' });
	}
}
