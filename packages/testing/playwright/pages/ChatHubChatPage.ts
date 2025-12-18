import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';
import { ChatHubPersonalAgentModal } from './components/ChatHubPersonalAgentModal';
import { ChatHubSidebar } from './components/ChatHubSidebar';

export class ChatHubChatPage extends BasePage {
	readonly sidebar = new ChatHubSidebar(this.page.locator('#sidebar'));
	readonly personalAgentModal = new ChatHubPersonalAgentModal(
		this.page.getByTestId('agentEditorModal-modal'),
	);

	constructor(page: Page) {
		super(page);
	}

	async openNewChat() {
		await this.page.goto('/home/chat');
	}

	getGreetingMessage(): Locator {
		return this.page.getByRole('heading', { level: 2 });
	}

	getModelSelectorButton(): Locator {
		return this.page.getByTestId('chat-model-selector');
	}

	getChatInput(): Locator {
		return this.page.locator('form').getByRole('textbox');
	}

	getSendButton(): Locator {
		return this.page.getByTitle('Send');
	}

	getChatMessages(): Locator {
		return this.page.locator('[data-message-id]');
	}

	getEditButtonAt(index: number): Locator {
		return this.getChatMessages().nth(index).getByTestId('chat-message-edit');
	}

	getEditorAt(index: number): Locator {
		return this.getChatMessages().nth(index).getByRole('textbox');
	}

	getSendButtonAt(index: number): Locator {
		return this.getChatMessages().nth(index).getByText('Send');
	}

	getRegenerateButtonAt(index: number): Locator {
		return this.getChatMessages().nth(index).getByTestId('chat-message-regenerate');
	}

	getPrevAlternativeButtonAt(index: number): Locator {
		return this.getChatMessages().nth(index).getByTestId('chat-message-prev-alternative');
	}

	getNextAlternativeButtonAt(index: number): Locator {
		return this.getChatMessages().nth(index).getByTestId('chat-message-next-alternative');
	}
}
