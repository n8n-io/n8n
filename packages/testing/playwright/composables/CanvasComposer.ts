import { expect } from '@playwright/test';

import type { n8nPage } from '../pages/n8nPage';

export class CanvasComposer {
	constructor(private readonly n8n: n8nPage) {}

	/**
	 * Pin the data on a node. Then close the node.
	 * @param nodeName - The name of the node to pin the data on.
	 */
	async pinNodeData(nodeName: string) {
		await this.n8n.canvas.openNode(nodeName);
		await this.n8n.ndv.togglePinData();
		await this.n8n.ndv.close();
	}

	/**
	 * Copy selected nodes and verify success toast
	 */
	async copySelectedNodesWithToast(): Promise<void> {
		await this.n8n.clipboard.grant();
		await this.n8n.canvas.copyNodes();
		await this.n8n.notifications.waitForNotificationAndClose('Copied to clipboard');
	}

	/**
	 * Select all nodes and copy them
	 */
	async selectAllAndCopy(): Promise<void> {
		await this.n8n.clipboard.grant();
		await this.n8n.canvas.selectAll();
		await this.copySelectedNodesWithToast();
	}

	/**
	 * Get workflow JSON from clipboard
	 * Grants permissions, selects all, copies, and returns parsed workflow
	 * @returns The parsed workflow object from clipboard
	 */
	async getWorkflowFromClipboard(): Promise<{
		nodes: Array<{ credentials?: Record<string, unknown> }>;
		meta?: Record<string, unknown>;
	}> {
		await this.n8n.clipboard.grant();
		await this.n8n.canvas.selectAll();
		await this.n8n.canvas.copyNodes();
		const workflowJSON = await this.n8n.clipboard.readText();
		return JSON.parse(workflowJSON);
	}

	/**
	 * Switch between editor and workflow history and back
	 */
	async switchBetweenEditorAndHistory(): Promise<void> {
		await this.n8n.canvas.openWorkflowHistory();
		await this.n8n.canvas.closeWorkflowHistory();
		await this.n8n.page.waitForLoadState();
		await expect(this.n8n.canvas.getCanvasNodes().first()).toBeVisible();
		await expect(this.n8n.canvas.getCanvasNodes().last()).toBeVisible();
	}

	/**
	 * Switch between editor and workflow list and back
	 */
	async switchBetweenEditorAndWorkflowList(): Promise<void> {
		await this.n8n.sideBar.clickHomeButton();
		await this.n8n.workflows.cards.getWorkflows().first().click();
		await expect(this.n8n.canvas.getCanvasNodes().first()).toBeVisible();
		await expect(this.n8n.canvas.getCanvasNodes().last()).toBeVisible();
	}

	/**
	 * Zoom in and validate that zoom functionality works
	 */
	async zoomInAndCheckNodes(): Promise<void> {
		await this.n8n.canvas.getCanvasNodes().first().waitFor();

		const initialNodeSize = await this.n8n.page.evaluate(() => {
			const firstNode = document.querySelector('[data-test-id="canvas-node"]');
			if (!firstNode) {
				throw new Error('Canvas node not found during initial measurement');
			}
			return firstNode.getBoundingClientRect().width;
		});

		for (let i = 0; i < 4; i++) {
			await this.n8n.canvas.clickZoomInButton();
		}

		const finalNodeSize = await this.n8n.page.evaluate(() => {
			const firstNode = document.querySelector('[data-test-id="canvas-node"]');
			if (!firstNode) {
				throw new Error('Canvas node not found during final measurement');
			}
			return firstNode.getBoundingClientRect().width;
		});

		// Validate zoom increased node sizes by at least 50%
		const zoomWorking = finalNodeSize > initialNodeSize * 1.5;

		if (!zoomWorking) {
			throw new Error(
				"Zoom functionality not working: nodes didn't scale properly. " +
					`Initial: ${initialNodeSize.toFixed(1)}px, Final: ${finalNodeSize.toFixed(1)}px`,
			);
		}
	}

	/**
	 * Rename a node using keyboard shortcut
	 * @param oldName - The current name of the node
	 * @param newName - The new name for the node
	 */
	async renameNodeViaShortcut(oldName: string, newName: string): Promise<void> {
		await this.n8n.canvas.nodeByName(oldName).click();
		await this.n8n.page.keyboard.press('F2');
		await expect(this.n8n.canvas.getRenamePrompt()).toBeVisible();
		await this.n8n.page.keyboard.type(newName);
		await this.n8n.page.keyboard.press('Enter');
	}

	/**
	 * Reload the page and wait for canvas to be ready
	 */
	async reloadAndWaitForCanvas(): Promise<void> {
		await this.n8n.page.reload();
		await expect(this.n8n.canvas.getNodeViewLoader()).toBeHidden();
		await expect(this.n8n.canvas.getLoadingMask()).toBeHidden();
	}

	/**
	 * Wait for workflow save to complete and URL to be updated with the workflow ID.
	 * Use this when you need the workflow URL/ID immediately after saving.
	 * @returns The workflow URL after save
	 */
	async waitForWorkflowSaveAndUrl(): Promise<string> {
		const isNewWorkflow = this.n8n.page.url().includes('/workflow/new');

		if (isNewWorkflow) {
			await this.n8n.canvas.waitForSaveWorkflowCompleted();
			// Wait for URL to update after response
			await this.n8n.page.waitForURL(/\/workflow\/[a-zA-Z0-9]+$/);
		} else {
			await this.n8n.canvas.waitForSaveWorkflowCompleted();
		}

		return this.n8n.page.url();
	}
}
