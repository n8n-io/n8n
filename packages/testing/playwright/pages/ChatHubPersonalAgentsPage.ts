import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';
import { ChatAgentCard } from './components/ChatAgentCard';
import { ChatHubPersonalAgentModal } from './components/ChatHubPersonalAgentModal';
import { MessageBox } from './components/messageBoxLocators';

export class ChatHubPersonalAgentsPage extends BasePage {
	async goto() {
		await this.page.goto('/home/chat/personal-agents');
	}

	readonly editModal = new ChatHubPersonalAgentModal(this.page.getByRole('dialog'));

	readonly agentCards = new ChatAgentCard(this.page);

	constructor(page: Page) {
		super(page);
	}

	getNewAgentButton(): Locator {
		return this.page.getByText('New Agent');
	}

	getAgentCards(): Locator {
		return this.agentCards.getCards();
	}

	getEditButtonAt(index: number): Locator {
		return this.agentCards.getEditButtonAt(index);
	}

	getMenuAt(index: number): Locator {
		return this.agentCards.getMenuAt(index);
	}

	// The delete confirmation is an ElMessageBox teleported to <body>, so scope to the page, not a container.
	async confirmDeleteAgent(): Promise<void> {
		await new MessageBox(this.page).confirmButton.click();
	}
}
