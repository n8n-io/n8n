import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class CanvasPage extends BasePage {
	saveWorkflowButton(): Locator {
		return this.page.getByRole('button', { name: 'Save' });
	}

	nodeCreatorItemByName(text: string): Locator {
		return this.page.getByTestId('node-creator-item-name').getByText(text, { exact: true });
	}

	nodeCreatorSubItem(subItemText: string): Locator {
		return this.page.getByTestId('node-creator-item-name').getByText(subItemText, { exact: true });
	}

	nodeByName(nodeName: string): Locator {
		return this.page.locator(`[data-test-id="canvas-node"][data-node-name="${nodeName}"]`);
	}

	nodeToolbar(nodeName: string): Locator {
		return this.nodeByName(nodeName).getByTestId('canvas-node-toolbar');
	}

	nodeDeleteButton(nodeName: string): Locator {
		return this.nodeToolbar(nodeName).getByTestId('delete-node-button');
	}

	async clickCanvasPlusButton(): Promise<void> {
		await this.clickByTestId('canvas-plus-button');
	}

	async clickNodeCreatorPlusButton(): Promise<void> {
		await this.clickByTestId('node-creator-plus-button');
	}

	async clickSaveWorkflowButton(): Promise<void> {
		await this.clickButtonByName('Save');
	}

	async fillNodeCreatorSearchBar(text: string): Promise<void> {
		await this.fillByTestId('node-creator-search-bar', text);
	}

	async clickNodeCreatorItemName(text: string): Promise<void> {
		await this.nodeCreatorItemByName(text).click();
	}

	async addNode(text: string): Promise<void> {
		await this.clickNodeCreatorPlusButton();
		await this.fillNodeCreatorSearchBar(text);
		await this.clickNodeCreatorItemName(text);
	}

	async addNodeToCanvasWithSubItem(searchText: string, subItemText: string): Promise<void> {
		await this.addNode(searchText);
		await this.nodeCreatorSubItem(subItemText).click();
	}

	async deleteNodeByName(nodeName: string): Promise<void> {
		await this.nodeDeleteButton(nodeName).click();
	}

	async saveWorkflow(): Promise<void> {
		await this.clickSaveWorkflowButton();
	}

	async clickExecuteWorkflowButton(): Promise<void> {
		await this.page.getByTestId('execute-workflow-button').click();
	}

	async clickDebugInEditorButton(): Promise<void> {
		await this.page.getByRole('button', { name: 'Debug in editor' }).click();
	}

	async pinNodeByNameUsingContextMenu(nodeName: string): Promise<void> {
		await this.nodeByName(nodeName).click({ button: 'right' });
		await this.page.getByTestId('context-menu').getByText('Pin').click();
	}

	async unpinNodeByNameUsingContextMenu(nodeName: string): Promise<void> {
		await this.nodeByName(nodeName).click({ button: 'right' });
		await this.page.getByText('Unpin').click();
	}

	async openNode(nodeName: string): Promise<void> {
		await this.nodeByName(nodeName).dblclick();
	}

	/**
	 * Get the names of all pinned nodes on the canvas.
	 * @returns An array of node names.
	 */
	async getPinnedNodeNames(): Promise<string[]> {
		const pinnedNodesLocator = this.page
			.getByTestId('canvas-node')
			.filter({ has: this.page.getByTestId('canvas-node-status-pinned') });

		const names: string[] = [];
		const count = await pinnedNodesLocator.count();

		for (let i = 0; i < count; i++) {
			const node = pinnedNodesLocator.nth(i);
			const name = await node.getAttribute('data-node-name');
			if (name) {
				names.push(name);
			}
		}

		return names;
	}

	async clickExecutionsTab(): Promise<void> {
		await this.page.getByRole('radio', { name: 'Executions' }).click();
	}
}
