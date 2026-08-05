import { expect, type Locator, type Page } from '@playwright/test';

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
		this.credentialModal = CredentialModal.fromPage(page);
	}

	private get container(): Locator {
		return this.page.getByTestId('instance-ai-container');
	}

	async goto(): Promise<void> {
		await this.page.goto('/');
		await this.enableInstanceAiIfPrompted();
		await this.getChatInput()
			.waitFor({ state: 'visible', timeout: 10_000 })
			.catch(async () => {
				const aiMenuItem = this.page.getByRole('menuitem', { name: 'AI Assistant' });
				await aiMenuItem.click({ timeout: 10_000 });
				await this.enableInstanceAiIfPrompted();
			});
		await expect(this.getChatInput()).toBeVisible({ timeout: 30_000 });
		await expect(this.getSendButton()).toBeVisible({ timeout: 30_000 });
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

	async gotoThread(threadId: string): Promise<void> {
		await this.page.goto(`/assistant/${threadId}`);
	}

	getContainer(): Locator {
		return this.container;
	}

	getSidebarToggle(): Locator {
		return this.getContainer().getByTestId('instance-ai-sidebar-toggle');
	}

	/**
	 * Expand the chat-history sidebar if it isn't already open. The sidebar
	 * starts collapsed by default, so any test that needs to query thread
	 * items must open it first. Idempotent — does nothing if already open.
	 *
	 * Waits for the thread-list to become visible so callers can immediately
	 * query thread items without racing the 200ms slide-in transition.
	 */
	async openSidebar(): Promise<void> {
		const threadList = this.page.getByTestId('instance-ai-thread-list');
		if (!(await threadList.isVisible())) {
			await this.getSidebarToggle().click({ timeout: 10_000 });
		}
		await threadList.waitFor({ state: 'visible' });
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

	/** Tailored out-of-credits error callout shown when a run fails due to exhausted quota. */
	getOutOfCreditsError(): Locator {
		return this.container.getByTestId('instance-ai-out-of-credits');
	}

	getOutOfCreditsUpgradeButton(): Locator {
		return this.container.getByTestId('instance-ai-out-of-credits-upgrade');
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

	// ── Attachments ────────────────────────────────────────────────────

	getFileInput(): Locator {
		return this.getContainer().locator('input[type="file"]');
	}

	getAttachmentsAt(messageIndex: number): Locator {
		return this.getUserMessages().nth(messageIndex).getByTestId('chat-file');
	}

	// ── Confirmations ─────────────────────────────────────────────────

	getConfirmApproveButton(): Locator {
		return this.container.getByTestId('instance-ai-panel-confirm-approve');
	}

	getConfirmAlwaysAllowButton(): Locator {
		return this.container.getByTestId('instance-ai-panel-confirm-always-allow');
	}

	getConfirmDenyButton(): Locator {
		return this.container.getByTestId('instance-ai-panel-confirm-deny');
	}

	getDomainAccessApprove(): Locator {
		return this.container.getByTestId('domain-access-allow-once');
	}

	getDomainAccessAlwaysAllow(): Locator {
		return this.container.getByTestId('domain-access-allow-domain');
	}

	getGatewayDecisionApprove(): Locator {
		return this.container.getByTestId('gateway-decision-approve');
	}

	getCredentialContinue(): Locator {
		return this.container.getByTestId('instance-ai-credential-continue-button');
	}

	getConfirmationText(text: string): Locator {
		return this.page.getByText(text, { exact: false });
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
	//
	// The artifact preview mounts the workflow editor directly in the page
	// (no iframe), rooted at `[data-test-id="workflow-canvas-host"]`. Scope
	// everything to that root so we don't accidentally match canvas elements
	// that belong to the main editor on the same document.

	private getPreviewCanvas(): Locator {
		return this.container.getByTestId('workflow-canvas-host');
	}

	getPreviewCanvasNodes(): Locator {
		return this.getPreviewCanvas().locator('[data-test-id="canvas-node"]');
	}

	getPreviewRunningNodes(): Locator {
		return this.getPreviewCanvas().locator(
			'[data-test-id="canvas-node"].running, [data-test-id="canvas-node"].waiting',
		);
	}

	getPreviewSuccessIndicators(): Locator {
		return this.getPreviewCanvas().locator('[data-test-id="canvas-node-status-success"]');
	}

	getPreviewToggleButton(): Locator {
		return this.getPreviewPanel().getByTestId('instance-ai-artifacts-preview-toggle');
	}

	getShowPreviewButton(): Locator {
		return this.container.locator(
			'[data-test-id="instance-ai-artifacts-preview-toggle"][aria-pressed="false"]',
		);
	}

	getPreviewPanel(): Locator {
		return this.container.getByTestId('instance-ai-preview-panel');
	}

	getPreviewTabByName(name: string | RegExp): Locator {
		return this.getPreviewPanel().getByRole('tab', { name });
	}

	/**
	 * Resolves to the preview's canvas root. Used by tests to assert the
	 * preview is hidden (collapsing the panel removes the host from the DOM
	 * via `v-if`, so the locator becomes hidden).
	 */
	getPreviewIframeLocator(): Locator {
		return this.getPreviewCanvas();
	}

	getPreviewRunWorkflowButton(): Locator {
		return this.getPreviewCanvas().getByTestId('execute-workflow-button');
	}

	async runPreviewWorkflow(): Promise<void> {
		const runButton = this.getPreviewRunWorkflowButton();
		const approvalButton = this.getConfirmApproveButton();
		let action: 'approve' | 'run' | undefined;
		await expect
			.poll(
				async () => {
					if (await approvalButton.isVisible().catch(() => false)) {
						action = 'approve';
						return action;
					}
					if (await runButton.isEnabled().catch(() => false)) {
						action = 'run';
						return action;
					}
					return undefined;
				},
				{ intervals: [500, 1_000, 2_000], timeout: 120_000 },
			)
			.toBeDefined();

		if (action === 'approve') {
			await approvalButton.dispatchEvent('click');
		} else {
			await runButton.click();
		}
	}

	async waitForPreviewCanvasNode(nodeName?: string, timeout = 150_000): Promise<void> {
		const node = nodeName
			? this.getPreviewNodeByName(nodeName)
			: this.getPreviewCanvasNodes().first();
		await expect
			.poll(
				async () => {
					for (const button of [
						this.getConfirmAlwaysAllowButton(),
						this.getDomainAccessAlwaysAllow(),
						this.getConfirmApproveButton(),
						this.getPlanApproveButton(),
						this.getDomainAccessApprove(),
						this.getGatewayDecisionApprove(),
						this.getCredentialContinue(),
					]) {
						if (
							(await button.isVisible().catch(() => false)) &&
							(await button.isEnabled().catch(() => false))
						) {
							await button.dispatchEvent('click');
							return false;
						}
					}

					if (await node.isVisible().catch(() => false)) return true;

					const showPreviewButton = this.getShowPreviewButton();
					if (
						(await showPreviewButton.isVisible().catch(() => false)) &&
						(await showPreviewButton.isEnabled().catch(() => false))
					) {
						await showPreviewButton.dispatchEvent('click');
					}

					return await node.isVisible().catch(() => false);
				},
				{ intervals: [500, 1_000, 2_000, 5_000], timeout },
			)
			.toBe(true);
		await expect(node).toBeVisible({ timeout: 10_000 });
	}

	getPreviewNodeByName(nodeName: string): Locator {
		return this.getPreviewCanvas().locator(
			`[data-test-id="canvas-node"][data-node-name="${nodeName}"]`,
		);
	}

	async openLastPreviewNode(): Promise<void> {
		const node = this.getPreviewCanvasNodes().last();
		await node.waitFor({ state: 'visible', timeout: 10_000 });
		await node.dblclick();
	}

	async openPreviewNodeByName(nodeName: string): Promise<void> {
		const node = this.getPreviewNodeByName(nodeName);
		await node.waitFor({ state: 'visible', timeout: 10_000 });
		await node.dblclick();
	}

	getPreviewExecuteNodeButton(nodeName: string): Locator {
		return this.getPreviewNodeByName(nodeName).getByRole('button', { name: 'Execute step' });
	}

	async executePreviewNodeByName(nodeName: string): Promise<void> {
		const executeNodeButton = this.getPreviewExecuteNodeButton(nodeName);
		await executeNodeButton.waitFor({ state: 'visible', timeout: 5_000 });
		await executeNodeButton.dispatchEvent('click');
	}

	getPreviewNodeSuccessIndicator(nodeName: string): Locator {
		return this.getPreviewNodeByName(nodeName).locator(
			'[data-test-id="canvas-node-status-success"]',
		);
	}

	/**
	 * NDV is rendered through a `<Teleport :to="#app-modals">`, and `#app-modals`
	 * is mounted in `App.vue` as a sibling of the router view — i.e. OUTSIDE both
	 * `workflow-canvas-host` and `instance-ai-container`. So unlike the canvas
	 * content above, this must be page-scoped, not scoped to the preview canvas.
	 * The rendered NDV uses a native dialog, so narrow the page-scoped lookup
	 * through that dialog to avoid stale page-level matches.
	 */
	getPreviewNdvOutputPanel(): Locator {
		return this.page.getByRole('dialog').getByTestId('output-panel');
	}

	// ── Artifacts ─────────────────────────────────────────────────────

	getArtifactPanelLinkByName(name: string | RegExp): Locator {
		return this.container.getByTestId('instance-ai-artifacts-sidebar').getByRole('link', { name });
	}

	// ── Convenience Actions ───────────────────────────────────────────

	async sendMessage(text: string): Promise<void> {
		await expect(this.getChatInput()).toBeVisible({ timeout: 30_000 });
		await this.getChatInput().fill(text);
		await expect(this.getSendButton()).toBeEnabled({ timeout: 30_000 });
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

	/**
	 * Wait for the plan-review panel to appear and approve it. Since the
	 * planning guardrails (#31984), the planner only engages for coordinated
	 * multi-artifact work or when the prompt explicitly asks to review a plan
	 * first — single-workflow builds skip plan review entirely, so only call
	 * this from tests whose prompt requests a plan.
	 */
	async approveBuildPlan(timeout = 120_000): Promise<void> {
		await this.getPlanApproveButton().waitFor({ state: 'visible', timeout });
		await this.getPlanApproveButton().click();
	}
}
