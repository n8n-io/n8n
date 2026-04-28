import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';
import { InstanceAiSidebar } from './components/InstanceAiSidebar';

export class InstanceAiPage extends BasePage {
	readonly sidebar: InstanceAiSidebar;

	constructor(page: Page) {
		super(page);
		this.sidebar = new InstanceAiSidebar(page.getByTestId('instance-ai-thread-list'));
	}

	async goto(): Promise<void> {
		await this.page.goto('/instance-ai');
	}

	getContainer(): Locator {
		return this.page.getByTestId('instance-ai-container');
	}

	// ── Messages ──────────────────────────────────────────────────────

	getChatInput(): Locator {
		return this.page.getByRole('textbox');
	}

	getSendButton(): Locator {
		return this.page.getByTestId('instance-ai-send-button');
	}

	getStopButton(): Locator {
		return this.page.getByTestId('instance-ai-stop-button');
	}

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

	getEmptyState(): Locator {
		return this.page.getByTestId('instance-ai-empty-state');
	}

	// ── Confirmations ─────────────────────────────────────────────────

	getConfirmApproveButton(): Locator {
		return this.page.getByTestId('instance-ai-panel-confirm-approve');
	}

	getConfirmDenyButton(): Locator {
		return this.page.getByTestId('instance-ai-panel-confirm-deny');
	}

	getDomainAccessApprove(): Locator {
		return this.page.getByTestId('domain-access-primary');
	}

	getCredentialContinue(): Locator {
		return this.page.getByTestId('instance-ai-credential-continue-button');
	}

	// ── Plan Review ───────────────────────────────────────────────────

	getPlanApproveButton(): Locator {
		return this.page.getByTestId('instance-ai-plan-approve');
	}

	/**
	 * Returns a locator that matches ANY type of approve/continue button.
	 * Uses Playwright's `or()` to race between confirmation types.
	 * Workflow setup is always skipped to avoid blocking the benchmark on credential dialogs.
	 */
	getAnyApproveButton(): Locator {
		return this.getConfirmApproveButton()
			.or(this.getDomainAccessApprove())
			.or(this.getPlanApproveButton())
			.or(this.getCredentialContinue())
			.or(this.getWorkflowSetupSkip());
	}

	// ── Preview ───────────────────────────────────────────────────────

	getPreviewIframe() {
		return this.page.getByTestId('workflow-preview-iframe').contentFrame();
	}

	getPreviewCanvasNodes(): Locator {
		return this.getPreviewIframe().locator('[data-test-id="canvas-node"]');
	}

	getPreviewRunningNodes(): Locator {
		return this.getPreviewIframe().locator(
			'[data-test-id="canvas-node"].running, [data-test-id="canvas-node"].waiting',
		);
	}

	getPreviewSuccessIndicators(): Locator {
		return this.getPreviewIframe().locator('[data-test-id="canvas-node-status-success"]');
	}

	getPreviewCloseButton(): Locator {
		return this.page.getByTestId('instance-ai-preview-close');
	}

	getPreviewIframeLocator(): Locator {
		return this.page.getByTestId('workflow-preview-iframe');
	}

	getPreviewRunWorkflowButton(): Locator {
		return this.getPreviewIframe().getByTestId('execute-workflow-button');
	}

	getPreviewNodeByName(nodeName: string): Locator {
		return this.getPreviewIframe().locator(
			`[data-test-id="canvas-node"][data-node-name="${nodeName}"]`,
		);
	}

	getPreviewExecuteNodeButton(nodeName: string): Locator {
		return this.getPreviewNodeByName(nodeName).getByRole('button', { name: 'Execute step' });
	}

	getPreviewNodeSuccessIndicator(nodeName: string): Locator {
		return this.getPreviewNodeByName(nodeName).locator(
			'[data-test-id="canvas-node-status-success"]',
		);
	}

	getPreviewNdvOutputPanel(): Locator {
		return this.getPreviewIframe().getByTestId('output-panel');
	}

	// ── Workflow Setup ────────────────────────────────────────────────

	getWorkflowSetupCard(): Locator {
		return this.page.getByTestId('instance-ai-workflow-setup-card');
	}

	getWorkflowSetupStepCounter(): Locator {
		return this.getWorkflowSetupCard().getByTestId('instance-ai-workflow-setup-step-counter');
	}

	getWorkflowSetupPrevButton(): Locator {
		return this.getWorkflowSetupCard().getByTestId('instance-ai-workflow-setup-prev');
	}

	getWorkflowSetupNextButton(): Locator {
		return this.getWorkflowSetupCard().getByTestId('instance-ai-workflow-setup-next');
	}

	getWorkflowSetupLaterButton(): Locator {
		return this.page.getByTestId('instance-ai-workflow-setup-later');
	}

	getWorkflowSetupApplyButton(): Locator {
		return this.page.getByTestId('instance-ai-workflow-setup-apply-button');
	}

	getWorkflowSetupStepCheck(): Locator {
		return this.getWorkflowSetupCard().getByTestId('instance-ai-workflow-setup-step-check');
	}

	getWorkflowSetupParameterIssues(): Locator {
		return this.getWorkflowSetupCard().getByTestId('parameter-issues');
	}

	/** The editable `<input>` / `<textarea>` of the nth `parameter-item` in the setup card. */
	getWorkflowSetupParameterInput(index = 0): Locator {
		return this.getWorkflowSetupCard()
			.getByTestId('parameter-item')
			.nth(index)
			.locator('input, textarea')
			.first();
	}

	getWorkflowSetupSkip(): Locator {
		return this.page.getByTestId('instance-ai-workflow-setup-later');
	}

	// ── Artifacts ─────────────────────────────────────────────────────

	getArtifactCards(): Locator {
		return this.page.locator('.card').filter({ has: this.page.getByTestId('card-content') });
	}

	// ── Convenience Actions ───────────────────────────────────────────

	async sendMessage(text: string): Promise<void> {
		await this.getChatInput().fill(text);
		await this.getSendButton().click();
	}

	async waitForAssistantResponse(timeout = 60_000): Promise<void> {
		await this.getAssistantMessages().first().waitFor({ state: 'visible', timeout });
	}

	/**
	 * Wait for the agent to finish responding. The send button reappears (replacing
	 * the stop button) only after `isStreaming` becomes `false`, so its visibility
	 * is the most reliable completion signal.
	 */
	async waitForResponseComplete(timeout = 120_000): Promise<void> {
		await this.getAssistantMessages().first().waitFor({ state: 'visible', timeout });
		await this.getSendButton().waitFor({ state: 'visible', timeout });
	}

	async waitForRunComplete(timeoutMs = 180_000): Promise<void> {
		await this.getStopButton().waitFor({ state: 'hidden', timeout: timeoutMs });
	}
}
