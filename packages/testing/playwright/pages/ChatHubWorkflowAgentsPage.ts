import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';
import { ChatHubSidebar } from './components/ChatHubSidebar';

export class ChatHubWorkflowAgentsPage extends BasePage {
	readonly sidebar = new ChatHubSidebar(this.page.locator('#sidebar'));

	constructor(page: Page) {
		super(page);
	}

	async open() {
		await this.page.goto('/home/chat/workflow-agents');
	}

	getAgentCards(): Locator {
		return this.page.getByTestId('chat-agent-card');
	}

	getEmptyText(): Locator {
		return this.page.getByText('No workflow agents available.');
	}
}
