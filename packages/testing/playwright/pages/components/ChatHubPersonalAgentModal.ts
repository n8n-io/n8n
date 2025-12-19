import type { Locator } from '@playwright/test';

export class ChatHubPersonalAgentModal {
	constructor(private root: Locator) {}

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
