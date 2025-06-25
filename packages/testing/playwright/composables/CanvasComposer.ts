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
}
