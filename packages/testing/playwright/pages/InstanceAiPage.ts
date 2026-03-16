import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';

export class InstanceAiPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	// --- Container ---

	getContainer(): Locator {
		return this.page.getByTestId('instance-ai-container');
	}

	// --- Empty State ---

	getEmptyState(): Locator {
		return this.page.getByTestId('instance-ai-empty-state');
	}

	getSuggestionCards(): Locator {
		return this.page.getByTestId('instance-ai-suggestion-card');
	}

	// --- Input ---

	getInput(): Locator {
		// ChatInputBase wraps an N8nInput textarea
		return this.page.getByTestId('instance-ai-container').locator('textarea');
	}

	getSendButton(): Locator {
		return this.page.getByTestId('instance-ai-send-button');
	}

	getStopButton(): Locator {
		return this.page.getByTestId('instance-ai-stop-button');
	}

	getResearchToggle(): Locator {
		return this.page.getByTestId('instance-ai-research-toggle');
	}

	// --- Messages ---

	getUserMessages(): Locator {
		return this.page.getByTestId('instance-ai-user-message');
	}

	getAssistantMessages(): Locator {
		return this.page.getByTestId('instance-ai-assistant-message');
	}

	// --- Thread List ---

	getThreadList(): Locator {
		return this.page.getByTestId('instance-ai-thread-list');
	}

	getNewThreadButton(): Locator {
		return this.page.getByTestId('instance-ai-new-thread-button');
	}

	getThreadItems(): Locator {
		return this.page.getByTestId('instance-ai-thread-item');
	}

	// --- Tool Calls ---

	getToolCalls(): Locator {
		return this.page.getByTestId('instance-ai-tool-call');
	}

	getConfirmApproveButton(): Locator {
		return this.page.getByTestId('instance-ai-confirm-approve');
	}

	getConfirmDenyButton(): Locator {
		return this.page.getByTestId('instance-ai-confirm-deny');
	}

	// --- Status ---

	getStatusBar(): Locator {
		return this.page.getByTestId('instance-ai-status-bar');
	}

	// --- Actions ---

	async sendMessage(message: string): Promise<void> {
		await this.getInput().fill(message);
		await this.getSendButton().click();
	}

	async waitForResponseComplete(options?: { timeout?: number }): Promise<void> {
		const timeout = options?.timeout ?? 30_000;
		await this.getAssistantMessages().first().waitFor({ state: 'visible', timeout });
		await this.getSendButton().waitFor({ state: 'visible', timeout });
	}
}
