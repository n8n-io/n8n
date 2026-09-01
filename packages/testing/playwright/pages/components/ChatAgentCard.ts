import type { Locator, Page } from '@playwright/test';

/**
 * Shared component for chat agent cards, rendered on both the personal and
 * workflow agent listing pages. Owns the `chat-agent-card` test-id so it is
 * declared in a single place.
 */
export class ChatAgentCard {
	constructor(private readonly page: Page) {}

	getCards(): Locator {
		return this.page.getByTestId('chat-agent-card');
	}

	getEditButtonAt(index: number): Locator {
		return this.getCards().nth(index).getByTitle('Edit');
	}

	getMenuAt(index: number): Locator {
		return this.getCards().nth(index).getByTitle('More options');
	}
}
