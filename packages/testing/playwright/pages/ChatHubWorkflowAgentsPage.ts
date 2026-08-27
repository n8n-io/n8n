import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';
import { ChatAgentCard } from './components/ChatAgentCard';

export class ChatHubWorkflowAgentsPage extends BasePage {
	async goto() {
		await this.page.goto('/home/chat/workflow-agents');
	}

	readonly agentCards = new ChatAgentCard(this.page);

	constructor(page: Page) {
		super(page);
	}

	getAgentCards(): Locator {
		return this.agentCards.getCards();
	}

	getEmptyText(): Locator {
		return this.page.getByText('No workflow agents available.');
	}
}
