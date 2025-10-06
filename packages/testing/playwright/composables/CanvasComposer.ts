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
	 * Execute a node and wait for success toast notification
	 * @param nodeName - The node to execute
	 */
	async executeNodeAndWaitForToast(nodeName: string): Promise<void> {
		await this.n8n.canvas.executeNode(nodeName);
		await this.n8n.notifications.waitForNotificationAndClose('Node executed successfully');
	}

	/**
	 * Copy selected nodes and verify success toast
	 */
	async copySelectedNodesWithToast(): Promise<void> {
		await this.n8n.canvas.copyNodes();
		await this.n8n.notifications.waitForNotificationAndClose('Copied to clipboard');
	}

	/**
	 * Select all nodes and copy them
	 */
	async selectAllAndCopy(): Promise<void> {
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
		await this.n8n.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
		await this.n8n.canvas.selectAll();
		await this.n8n.canvas.copyNodes();
		const workflowJSON = await this.n8n.page.evaluate(() => navigator.clipboard.readText());
		return JSON.parse(workflowJSON);
	}

	/**
	 * Switch between editor and workflow history and back
	 */
	async switchBetweenEditorAndHistory(): Promise<void> {
		await this.n8n.page.getByTestId('workflow-history-button').click();
		await this.n8n.page.getByTestId('workflow-history-close-button').click();
		await this.n8n.page.waitForLoadState();
		await expect(this.n8n.canvas.getCanvasNodes().first()).toBeVisible();
		await expect(this.n8n.canvas.getCanvasNodes().last()).toBeVisible();
	}

	/**
	 * Switch between editor and workflow list and back
	 */
	async switchBetweenEditorAndWorkflowList(): Promise<void> {
		await this.n8n.page.getByTestId('menu-item').first().click();
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
	 * Delay workflow GET request to simulate loading during page reload.
	 * Useful for testing save-blocking behavior during real loading states.
	 *
	 * @param workflowId - The workflow ID to delay loading for
	 * @param delayMs - Delay in milliseconds (default: 2000)
	 */
	async delayWorkflowLoad(workflowId: string, delayMs: number = 2000): Promise<void> {
		await this.n8n.page.route(`**/rest/workflows/${workflowId}`, async (route) => {
			if (route.request().method() === 'GET') {
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
			await route.continue();
		});
	}

	/**
	 * Remove the workflow load delay route handler.
	 * Should be called after delayWorkflowLoad() when testing is complete.
	 *
	 * @param workflowId - The workflow ID to stop delaying
	 */
	async undelayWorkflowLoad(workflowId: string): Promise<void> {
		await this.n8n.page.unroute(`**/rest/workflows/${workflowId}`);
	}
}
