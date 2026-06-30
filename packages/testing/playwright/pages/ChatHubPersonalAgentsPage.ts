import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';
import { ChatAgentCard } from './components/ChatAgentCard';
import { ChatHubPersonalAgentModal } from './components/ChatHubPersonalAgentModal';

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
}
