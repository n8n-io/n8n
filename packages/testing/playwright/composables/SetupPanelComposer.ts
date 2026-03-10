import { expect } from '@playwright/test';

import type { n8nPage } from '../pages/n8nPage';

export class SetupPanelComposer {
	constructor(private readonly n8n: n8nPage) {}

	private get panel() {
		return this.n8n.canvas.setupPanel;
	}

	/**
	 * Open the setup panel by setting localStorage for the current workflow
	 * and reloading. Must be called after navigating to a workflow.
	 */
	async openSetupPanel(): Promise<void> {
		const url = this.n8n.canvas.getPageUrl();
		const match = url.match(/\/workflow\/([^/?#]+)/);
		if (!match) throw new Error(`Cannot extract workflow ID from URL: ${url}`);
		const workflowId = match[1];

		await this.panel.activateForWorkflow(workflowId);
		await expect(this.panel.getContainer()).toBeVisible({ timeout: 10_000 });
	}

	/**
	 * Import a workflow and open the setup panel on it.
	 */
	async fromImportedWorkflowWithSetupPanel(workflowFile: string) {
		const result = await this.n8n.start.fromImportedWorkflow(workflowFile);
		await this.openSetupPanel();
		return result;
	}

	/**
	 * Wait for a card to show the complete checkmark icon (collapsed state).
	 */
	async waitForCardComplete(cardNodeName: string): Promise<void> {
		const card = this.panel.getCardByNodeName(cardNodeName);
		await expect(this.panel.getCardCredentialSelect(card)).toBeHidden({ timeout: 10_000 });
	}

	/**
	 * Wait for the "Everything configured" message to appear.
	 */
	async waitForAllComplete(): Promise<void> {
		await expect(this.panel.getCompleteMessage()).toBeVisible({ timeout: 10_000 });
	}

	/**
	 * Collapse an expanded card by clicking its header.
	 */
	async collapseCard(cardNodeName: string): Promise<void> {
		const card = this.panel.getCardByNodeName(cardNodeName);
		await this.panel.clickCardHeader(card);
	}

	/**
	 * Expand a collapsed card by clicking its header.
	 */
	async expandCard(cardNodeName: string): Promise<void> {
		const card = this.panel.getCardByNodeName(cardNodeName);
		await this.panel.clickCardHeader(card);
	}

	/**
	 * Get the count of visible setup cards.
	 */
	async getVisibleCardCount(): Promise<number> {
		return await this.panel.getCards().count();
	}
}
