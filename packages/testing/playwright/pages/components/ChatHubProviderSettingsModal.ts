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
		return this.root.getByLabel(/^Enable /).locator('..');
	}

	getCredentialPicker(): Locator {
		return this.root.getByLabel('Default credential');
	}

	getEditCredentialButton(): Locator {
		return this.root.getByTitle('Update Credential');
	}

	getLimitModelsToggle(): Locator {
		return this.root.getByLabel('Limit models').locator('..');
	}

	getModelSelector(): Locator {
		return this.root.getByLabel('Models', { exact: true });
	}

	getConfirmButton(): Locator {
		return this.root.getByRole('button', { name: 'Confirm' });
	}
}
