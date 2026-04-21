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

	// ── Container & Header ────────────────────────────────────────────

	getContainer(): Locator {
		return this.page.getByTestId('instance-ai-container');
	}

	getSettingsButton(): Locator {
		return this.page.getByTestId('instance-ai-settings-button');
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

	getAttachButton(): Locator {
		return this.page.getByTestId('chat-input-attach-button');
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

	getEmptyState(): Locator {
		return this.page.getByTestId('instance-ai-empty-state');
	}

	// ── Timeline & Tool Calls ─────────────────────────────────────────

	getToolCalls(): Locator {
		return this.page.getByTestId('instance-ai-tool-call');
	}

	getToolCallSteps(): Locator {
		return this.page.getByTestId('instance-ai-tool-call-step');
	}

	// ── Confirmations ─────────────────────────────────────────────────

	getConfirmationPanel(): Locator {
		return this.page.getByTestId('instance-ai-confirmation-panel');
	}

	getConfirmApproveButton(): Locator {
		return this.page.getByTestId('instance-ai-panel-confirm-approve');
	}

	getConfirmDenyButton(): Locator {
		return this.page.getByTestId('instance-ai-panel-confirm-deny');
	}

	// ── Domain Access ─────────────────────────────────────────────────

	getDomainAccessApproveButton(): Locator {
		return this.page.getByTestId('domain-access-primary');
	}

	getDomainAccessDenyButton(): Locator {
		return this.page.getByTestId('domain-access-deny');
	}

	// ── Plan Review ───────────────────────────────────────────────────

	getPlanReviewPanel(): Locator {
		return this.page.getByTestId('instance-ai-plan-review');
	}

	getPlanApproveButton(): Locator {
		return this.page.getByTestId('instance-ai-plan-approve');
	}

	getPlanRequestChangesButton(): Locator {
		return this.page.getByTestId('instance-ai-plan-request-changes');
	}

	// ── Questions ─────────────────────────────────────────────────────

	getQuestionsPanel(): Locator {
		return this.page.getByTestId('instance-ai-questions');
	}

	getQuestionOptions(): Locator {
		return this.getQuestionsPanel().getByRole('button');
	}

	getQuestionsNextButton(): Locator {
		return this.page.getByTestId('instance-ai-questions-next');
	}

	getQuestionsSkipButton(): Locator {
		return this.page.getByTestId('instance-ai-questions-skip');
	}

	getQuestionsBackButton(): Locator {
		return this.page.getByTestId('instance-ai-questions-back');
	}

	getQuestionsForwardButton(): Locator {
		return this.page.getByTestId('instance-ai-questions-forward');
	}

	// ── Feedback ──────────────────────────────────────────────────────

	getMessageRating(): Locator {
		return this.page.getByTestId('instance-ai-message-rating');
	}

	getThumbsUpButton(): Locator {
		return this.page.getByTestId('message-thumbs-up-button');
	}

	getThumbsDownButton(): Locator {
		return this.page.getByTestId('message-thumbs-down-button');
	}

	getFeedbackSuccess(): Locator {
		return this.page.getByTestId('instance-ai-feedback-success');
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

	// ── Settings ──────────────────────────────────────────────────────

	getSettingsContainer(): Locator {
		return this.page.getByTestId('n8n-agent-settings');
	}

	getSettingsEnableToggle(): Locator {
		return this.page.getByTestId('n8n-agent-enable-toggle');
	}

	// ── Workflow Setup ────────────────────────────────────────────────

	getWorkflowSetupCard(): Locator {
		return this.page.getByTestId('instance-ai-workflow-setup-card');
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

	// ── Artifacts ─────────────────────────────────────────────────────

	getArtifactCards(): Locator {
		return this.page.locator('.card').filter({ has: this.page.getByTestId('card-content') });
	}

	getArtifactsPanelToggle(): Locator {
		return this.page.getByTestId('instance-ai-artifacts-toggle');
	}

	getArtifactsPanel(): Locator {
		return this.page.getByTestId('instance-ai-artifacts-panel');
	}

	getArtifactsPanelRows(): Locator {
		return this.page.getByTestId('instance-ai-artifact-row');
	}

	// ── Response Group Summaries ─────────────────────────────────────

	getSubagentSummaries(): Locator {
		return this.getAssistantMessages()
			.locator('button')
			.filter({ hasText: /subagent/i });
	}

	getToolCallSummaries(): Locator {
		return this.getAssistantMessages()
			.locator('button')
			.filter({ hasText: /tool call/i });
	}

	// ── Timeline Details ──────────────────────────────────────────────

	getToolCallTrigger(toolCall: Locator): Locator {
		return toolCall.getByRole('button').first();
	}

	getToolCallExpandedContent(toolCall: Locator): Locator {
		return toolCall.locator('[data-state="open"]');
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
}
