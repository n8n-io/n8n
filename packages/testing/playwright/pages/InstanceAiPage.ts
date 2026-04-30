import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';
import { CredentialModal } from './components/CredentialModal';
import { InstanceAiSidebar } from './components/InstanceAiSidebar';
import { InstanceAiWorkflowSetup } from './components/InstanceAiWorkflowSetup';

export class InstanceAiPage extends BasePage {
	readonly sidebar: InstanceAiSidebar;
	readonly workflowSetup: InstanceAiWorkflowSetup;
	readonly credentialModal: CredentialModal;

	constructor(page: Page) {
		super(page);
		this.sidebar = new InstanceAiSidebar(page.getByTestId('instance-ai-thread-list'));
		this.workflowSetup = new InstanceAiWorkflowSetup(
			page.getByTestId('instance-ai-workflow-setup'),
		);
		this.credentialModal = new CredentialModal(page.getByTestId('editCredential-modal'));
	}

	private get container(): Locator {
		return this.page.getByTestId('instance-ai-container');
	}

	async goto(): Promise<void> {
		await this.page.goto('/instance-ai');
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

	getStatusBar(): Locator {
		return this.container.getByTestId('instance-ai-status-bar');
	}

	/** "Working in the background..." indicator — visible when orchestrator is done but child agents still building. */
	getBackgroundTaskIndicator(): Locator {
		return this.container.getByText('Working in the background...');
	}

	getEmptyState(): Locator {
		return this.container.getByTestId('instance-ai-empty-state');
	}

	// ── Confirmations ─────────────────────────────────────────────────

	getConfirmApproveButton(): Locator {
		return this.container.getByTestId('instance-ai-panel-confirm-approve');
	}

	getConfirmDenyButton(): Locator {
		return this.container.getByTestId('instance-ai-panel-confirm-deny');
	}

	getDomainAccessApprove(): Locator {
		return this.container.getByTestId('domain-access-primary');
	}

	getCredentialContinue(): Locator {
		return this.container.getByTestId('instance-ai-credential-continue-button');
	}

	// ── Plan Review ───────────────────────────────────────────────────

	getPlanApproveButton(): Locator {
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

	// ── Preview ───────────────────────────────────────────────────────

	getPreviewIframe() {
		return this.getPreviewIframeLocator().contentFrame();
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
		return this.container.getByTestId('instance-ai-preview-close');
	}

	getPreviewIframeLocator(): Locator {
		return this.container.getByTestId('workflow-preview-iframe');
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

	// ── Artifacts ─────────────────────────────────────────────────────

	getArtifactCards(): Locator {
		return this.container.getByTestId('instance-ai-artifact-card');
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
