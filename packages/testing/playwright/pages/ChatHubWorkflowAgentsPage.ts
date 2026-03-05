import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';

export class ChatHubWorkflowAgentsPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	getAgentCards(): Locator {
		return this.page.getByTestId('chat-agent-card');
	}

	getEmptyText(): Locator {
		return this.page.getByText('No workflow agents available.');
	}
}
