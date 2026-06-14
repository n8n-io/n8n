import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';

/**
 * Page object for the AI Assistant (`/instance-ai`).
 *
 * Kept intentionally small: the e2e suite is a smoke test (see
 * tests/e2e/instance-ai/README.md), and the benchmark driver
 * (utils/benchmark/instance-ai-driver.ts) drives the same surface. Agent
 * behaviour is tested in the instance-ai evals, not through this page.
 */
export class InstanceAiPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	private get container(): Locator {
		return this.page.getByTestId('instance-ai-container');
	}

	async goto(): Promise<void> {
		await this.page.goto('/instance-ai');
		await this.enableInstanceAiIfPrompted();
	}

	async enableInstanceAiIfPrompted(): Promise<void> {
		const dialog = this.page.getByRole('dialog').filter({ hasText: 'Try AI Assistant' });
		try {
			await dialog.waitFor({ state: 'visible', timeout: 3_000 });
		} catch {
			return;
		}

		await dialog.getByRole('button', { name: /Enable AI Assistant on this instance/ }).click();
		await dialog.getByRole('button', { name: /^(Continue|Enable)$/ }).click();
		await dialog.waitFor({ state: 'hidden' });
	}

	getContainer(): Locator {
		return this.container;
	}

	// ── Messages ──────────────────────────────────────────────────────

	getChatInput(): Locator {
		return this.container.getByRole('textbox');
	}

	getSendButton(): Locator {
		return this.container.getByTestId('instance-ai-send-button');
	}

	getStopButton(): Locator {
		return this.container.getByTestId('instance-ai-stop-button');
	}

	getUserMessages(): Locator {
		return this.container.getByTestId('instance-ai-user-message');
	}

	getAssistantMessages(): Locator {
		return this.container.getByTestId('instance-ai-assistant-message');
	}

	getAssistantMessageText(text: string | RegExp): Locator {
		return this.getAssistantMessages().getByText(text);
	}

	getStatusBar(): Locator {
		return this.container.getByTestId('instance-ai-status-bar');
	}

	getNewThreadButton(): Locator {
		return this.page.getByTestId('instance-ai-new-thread-button');
	}

	/** "Working in the background..." indicator — visible when orchestrator is done but child agents still building. */
	getBackgroundTaskIndicator(): Locator {
		return this.container.getByText('Working in the background...');
	}

	async sendMessage(text: string): Promise<void> {
		await this.getChatInput().fill(text);
		await this.getSendButton().click();
	}

	async waitForRunComplete(timeoutMs = 180_000): Promise<void> {
		await this.getStopButton().waitFor({ state: 'hidden', timeout: timeoutMs });
	}

	// ── Confirmations ─────────────────────────────────────────────────

	private getConfirmApproveButton(): Locator {
		return this.container.getByTestId('instance-ai-panel-confirm-approve');
	}

	private getDomainAccessApprove(): Locator {
		return this.container.getByTestId('domain-access-primary');
	}

	private getCredentialContinue(): Locator {
		return this.container.getByTestId('instance-ai-credential-continue-button');
	}

	private getPlanApproveButton(): Locator {
		return this.container.getByTestId('instance-ai-plan-approve');
	}

	/**
	 * Returns a locator that matches ANY type of approve/continue button.
	 * Uses Playwright's `or()` to race between confirmation types.
	 */
	getAnyApproveButton(): Locator {
		return this.getConfirmApproveButton()
			.or(this.getDomainAccessApprove())
			.or(this.getPlanApproveButton())
			.or(this.getCredentialContinue());
	}
}
