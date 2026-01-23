import type { Locator } from '@playwright/test';

import { BaseModal } from './BaseModal';

export class ChatHubPersonalAgentModal extends BaseModal {
	constructor(protected readonly root: Locator) {
		super(root.page());
	}

	getRoot() {
		return this.root;
	}

	getNameField() {
		return this.root.getByPlaceholder(/Enter agent name/);
	}

	getDescriptionField() {
		return this.root.getByPlaceholder(/Enter agent description/);
	}

	getSystemPromptField() {
		return this.root.getByPlaceholder(/Enter system prompt/);
	}

	getModelSelectorButton(): Locator {
		return this.root.getByTestId('chat-model-selector');
	}

	getSaveButton() {
		return this.root.getByText('Save');
	}
}
