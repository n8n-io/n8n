import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';
import { ChatHubPersonalAgentModal } from './components/ChatHubPersonalAgentModal';

export class ChatHubPersonalAgentsPage extends BasePage {
	readonly editModal = new ChatHubPersonalAgentModal(this.page.getByRole('dialog'));

	constructor(page: Page) {
		super(page);
	}

	getNewAgentButton(): Locator {
		return this.page.getByText('New Agent');
	}

	getAgentCards(): Locator {
		return this.page.getByTestId('chat-agent-card');
	}

	getEditButtonAt(index: number): Locator {
		return this.page.getByTestId('chat-agent-card').nth(index).getByTitle('Edit');
	}

	getMenuAt(index: number): Locator {
		return this.page.getByTestId('chat-agent-card').nth(index).getByTitle('More options');
	}
}
