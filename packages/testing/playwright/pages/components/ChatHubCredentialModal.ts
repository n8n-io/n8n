import type { Locator } from '@playwright/test';

import { BaseModal } from './BaseModal';

export class ChatHubCredentialModal extends BaseModal {
	constructor(private root: Locator) {
		super(root.page());
	}

	getRoot(): Locator {
		return this.root;
	}

	getCredentialSelector(): Locator {
		return this.root.getByRole('combobox');
	}

	getCreateButton(): Locator {
		return this.page.getByTestId('node-credentials-select-item-new');
	}
}
