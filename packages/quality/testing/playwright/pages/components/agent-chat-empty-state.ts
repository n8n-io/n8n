import type { Locator } from '@playwright/test';

export class AgentChatEmptyState {
	constructor(private readonly root: Locator) {}

	getDescription(): Locator {
		return this.root.locator('[data-testid="agent-n8n-chat-description"]');
	}
}
