import { expect } from '@playwright/test';

import type { n8nPage } from '../pages/n8nPage';

/**
 * A class for partial execution testing workflows that involve
 * complex multi-step scenarios across pages.
 */
export class PartialExecutionComposer {
	constructor(private readonly n8n: n8nPage) {}

	/**
	 * Sets up partial execution version 2 in localStorage
	 * This enables the v2 partial execution feature
	 */
	async enablePartialExecutionV2(): Promise<void> {
		await this.n8n.page.evaluate(() => {
			window.localStorage.setItem('PartialExecution.version', '2');
		});
	}

	/**
	 * Executes a full workflow and verifies all nodes show success status
	 * @param nodeNames - Array of node names to verify
	 */
	async executeFullWorkflowAndVerifySuccess(nodeNames: string[]): Promise<void> {
		await this.n8n.canvas.clickExecuteWorkflowButton();

		// Verify all nodes show success status
		for (const nodeName of nodeNames) {
			await expect(this.n8n.canvas.getNodeSuccessStatusIndicator(nodeName)).toBeVisible();
		}
	}

	/**
	 * Captures output data from a node for later comparison
	 * @param nodeName - The node to capture data from
	 * @returns The captured text content
	 */
	async captureNodeOutputData(nodeName: string): Promise<string> {
		await this.n8n.canvas.openNode(nodeName);
		await this.n8n.ndv.outputPanel.getTable().waitFor();
		// Note: Using row 0 for tbody (equivalent to row 1 in Cypress which includes header)
		const cell = this.n8n.ndv.outputPanel.getTbodyCell(0, 0);
		await expect(cell).toHaveText(/.+/);
		const beforeText = await cell.textContent();
		await this.n8n.ndv.close();

		return beforeText!;
	}

	/**
	 * Modifies a node parameter to trigger stale state
	 * @param nodeName - The node to modify
	 */
	async modifyNodeToTriggerStaleState(nodeName: string): Promise<void> {
		await this.n8n.canvas.openNode(nodeName);
		await this.n8n.ndv.clickAssignmentCollectionDropArea();

		// Verify stale node indicator appears after parameter change
		await expect(this.n8n.ndv.getStaleNodeIndicator()).toBeVisible();
		await this.n8n.ndv.close();
	}

	/**
	 * Verifies node states after parameter change for partial execution v2
	 * @param unchangedNodes - Nodes that should still show success
	 * @param modifiedNodes - Nodes that should show warning (need re-execution)
	 */
	async verifyNodeStatesAfterChange(
		unchangedNodes: string[],
		modifiedNodes: string[],
	): Promise<void> {
		// Verify unchanged nodes still show success
		for (const nodeName of unchangedNodes) {
			await expect(this.n8n.canvas.getNodeSuccessStatusIndicator(nodeName)).toBeVisible();
		}

		// Verify modified nodes show warning status
		for (const nodeName of modifiedNodes) {
			await expect(this.n8n.canvas.getNodeWarningStatusIndicator(nodeName)).toBeVisible();
		}
	}

	/**
	 * Performs partial execution on a node and verifies all nodes return to success
	 * @param targetNodeName - The node to execute from
	 * @param allNodeNames - All nodes that should show success after partial execution
	 */
	async performPartialExecutionAndVerifySuccess(
		targetNodeName: string,
		allNodeNames: string[],
	): Promise<void> {
		// Perform partial execution by clicking execute button on target node
		await this.n8n.canvas.executeNode(targetNodeName);

		// Verify all nodes show success status after partial execution
		for (const nodeName of allNodeNames) {
			await expect(this.n8n.canvas.getNodeSuccessStatusIndicator(nodeName)).toBeVisible();
		}
	}

	/**
	 * Opens a node for data verification (test should handle the assertion)
	 * @param nodeName - The node to open for verification
	 * @returns Promise that resolves when node is open and ready for verification
	 */
	async openNodeForDataVerification(nodeName: string): Promise<void> {
		await this.n8n.canvas.openNode(nodeName);
		await this.n8n.ndv.outputPanel.getTable().waitFor();
	}
}
