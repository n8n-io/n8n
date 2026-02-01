import type { Locator } from '@playwright/test';

export class ChatHubSidebar {
	constructor(private root: Locator) {}

	getPersonalAgentButton() {
		return this.root.getByRole('menuitem', { name: 'Personal agents' });
	}

	getWorkflowAgentButton() {
		return this.root.getByRole('menuitem', { name: 'Workflow agents' });
	}

	getConversations() {
		return this.root.getByTestId('chat-conversation-list').getByRole('link');
	}
}
