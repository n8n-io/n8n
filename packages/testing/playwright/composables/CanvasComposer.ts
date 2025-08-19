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
}
