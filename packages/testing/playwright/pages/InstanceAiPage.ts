import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';

/**
 * Page object for the Instance AI chat interface.
 * This is separate from ChatHubChatPage — instance-ai has its own UI at /instance-ai.
 */
export class InstanceAiPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	// --- Container ---

	getContainer(): Locator {
		return this.page.getByTestId('instance-ai-container');
	}

	getEmptyState(): Locator {
		return this.page.getByTestId('instance-ai-empty-state');
	}

	// --- Thread management ---

	getNewThreadButton(): Locator {
		return this.page.getByTestId('instance-ai-new-thread-button');
	}

	getThreadItems(): Locator {
		return this.page.getByTestId('instance-ai-thread-item');
	}

	// --- Chat input ---

	/** The chat textarea input. Instance-ai uses a custom input, not a <form>. */
	getChatInput(): Locator {
		return this.page.getByTestId('instance-ai-container').getByRole('textbox');
	}

	getSendButton(): Locator {
		return this.page.getByTestId('instance-ai-send-button');
	}

	getStopButton(): Locator {
		return this.page.getByTestId('instance-ai-stop-button');
	}

	// --- Messages ---

	getUserMessages(): Locator {
		return this.page.getByTestId('instance-ai-user-message');
	}

	getAssistantMessages(): Locator {
		return this.page.getByTestId('instance-ai-assistant-message');
	}

	getStatusBar(): Locator {
		return this.page.getByTestId('instance-ai-status-bar');
	}

	/** "Working in the background..." indicator — visible when orchestrator is done but child agents still building. */
	getBackgroundTaskIndicator(): Locator {
		return this.page.getByText('Working in the background...');
	}

	/**
	 * Combined locator matching ANY activity indicator: stop button, status bar,
	 * background task spinner, or blinking cursor.
	 * When none of these are visible, the build is truly complete.
	 */
	getAnyActivityIndicator(): Locator {
		return this.getStopButton().or(this.getStatusBar()).or(this.getBackgroundTaskIndicator());
	}

	// --- Streaming state ---

	async isStreaming(): Promise<boolean> {
		return await this.getStopButton().isVisible();
	}

	async waitForRunComplete(timeoutMs = 180_000): Promise<void> {
		await this.getStopButton().waitFor({ state: 'hidden', timeout: timeoutMs });
	}

	// --- HITL Confirmations ---

	getConfirmationPanel(): Locator {
		return this.page.getByTestId('instance-ai-confirmation-panel');
	}

	getApproveButton(): Locator {
		return this.page.getByTestId('instance-ai-panel-confirm-approve');
	}

	getDenyButton(): Locator {
		return this.page.getByTestId('instance-ai-panel-confirm-deny');
	}

	getDomainAccessApprove(): Locator {
		return this.page.getByTestId('domain-access-primary');
	}

	getPlanApproveButton(): Locator {
		return this.page.getByTestId('instance-ai-plan-approve');
	}

	getCredentialContinue(): Locator {
		return this.page.getByTestId('instance-ai-credential-continue-button');
	}

	getWorkflowSetupConfirm(): Locator {
		return this.page.getByTestId('instance-ai-workflow-setup-confirm');
	}

	/**
	 * Returns a locator that matches ANY type of approve/continue button.
	 * Uses Playwright's `or()` to race between confirmation types.
	 */
	getAnyApproveButton(): Locator {
		return this.getApproveButton()
			.or(this.getDomainAccessApprove())
			.or(this.getPlanApproveButton())
			.or(this.getCredentialContinue())
			.or(this.getWorkflowSetupConfirm());
	}
}
