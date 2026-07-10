import type { Locator } from '@playwright/test';

import { BaseModal } from './BaseModal';
import { NodeCredentials } from './NodeCredentials';

export class ChatHubCredentialModal extends BaseModal {
	private readonly credentials: NodeCredentials;

	constructor(private root: Locator) {
		super(root.page());
		this.credentials = new NodeCredentials(root);
	}

	getCredentialSelector(): Locator {
		return this.root.getByRole('combobox');
	}

	getCreateButton(): Locator {
		return this.credentials.getCreateNewItem();
	}
}
