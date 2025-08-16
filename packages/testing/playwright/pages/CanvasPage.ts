import type { Locator } from '@playwright/test';
import { nanoid } from 'nanoid';

import { BasePage } from './BasePage';
import { resolveFromRoot } from '../utils/path-helper';

export class CanvasPage extends BasePage {
	saveWorkflowButton(): Locator {
		return this.page.getByRole('button', { name: 'Save' });
	}

	workflowSaveButton(): Locator {
		return this.page.getByTestId('workflow-save-button');
	}

	canvasAddButton(): Locator {
		return this.page.getByTestId('canvas-add-button');
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

	nodeDisableButton(nodeName: string): Locator {
		return this.nodeToolbar(nodeName).getByTestId('disable-node-button');
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

	async addNodeAndCloseNDV(text: string, subItemText?: string): Promise<void> {
		if (subItemText) {
			await this.addNodeToCanvasWithSubItem(text, subItemText);
		} else {
			await this.addNode(text);
		}
		await this.page.keyboard.press('Escape');
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
	async setWorkflowName(name: string): Promise<void> {
		await this.clickByTestId('inline-edit-preview');
		await this.fillByTestId('inline-edit-input', name);
	}

	/**
	 * Import a workflow from a fixture file
	 * @param fixtureKey - The key of the fixture file to import
	 * @param workflowName - The name of the workflow to import
	 * Naming the file causes the workflow to save so we don't need to click save
	 */
	async importWorkflow(fixtureKey: string, workflowName: string) {
		await this.clickByTestId('workflow-menu');

		const [fileChooser] = await Promise.all([
			this.page.waitForEvent('filechooser'),
			this.clickByText('Import from File...'),
		]);
		await fileChooser.setFiles(resolveFromRoot('workflows', fixtureKey));

		await this.clickByTestId('inline-edit-preview');
		await this.fillByTestId('inline-edit-input', workflowName);
		await this.page.getByTestId('inline-edit-input').press('Enter');
	}

	getWorkflowTags() {
		return this.page.getByTestId('workflow-tags').locator('.el-tag');
	}
	async activateWorkflow() {
		const responsePromise = this.page.waitForResponse(
			(response) =>
				response.url().includes('/rest/workflows/') && response.request().method() === 'PATCH',
		);
		await this.page.getByTestId('workflow-activate-switch').click();
		await responsePromise;
	}

	async clickZoomToFitButton(): Promise<void> {
		await this.clickByTestId('zoom-to-fit');
	}

	/**
	 * Get node issues for a specific node
	 */
	getNodeIssuesByName(nodeName: string) {
		return this.nodeByName(nodeName).getByTestId('node-issues');
	}

	/**
	 * Add tags to the workflow
	 * @param count - The number of tags to add
	 * @returns An array of tag names
	 */
	async addTags(count: number = 1): Promise<string[]> {
		const tags: string[] = [];

		for (let i = 0; i < count; i++) {
			const tag = `tag-${nanoid(8)}-${i}`;
			tags.push(tag);

			if (i === 0) {
				await this.clickByText('Add tag');
			} else {
				await this.page
					.getByTestId('tags-dropdown')
					.getByText(tags[i - 1])
					.click();
			}

			await this.page.getByRole('combobox').first().fill(tag);
			await this.page.getByRole('combobox').first().press('Enter');
		}

		await this.page.click('body');

		return tags;
	}

	// Production Checklist methods
	getProductionChecklistButton(): Locator {
		return this.page.getByTestId('suggested-action-count');
	}

	getProductionChecklistPopover(): Locator {
		return this.page.locator('[data-reka-popper-content-wrapper=""]').filter({ hasText: /./ });
	}

	getProductionChecklistActionItem(text?: string): Locator {
		const items = this.page.getByTestId('suggested-action-item');
		if (text) {
			return items.getByText(text);
		}
		return items;
	}

	getProductionChecklistIgnoreAllButton(): Locator {
		return this.page.getByTestId('suggested-action-ignore-all');
	}

	getErrorActionItem(): Locator {
		return this.getProductionChecklistActionItem('Set up error notifications');
	}

	getTimeSavedActionItem(): Locator {
		return this.getProductionChecklistActionItem('Track time saved');
	}

	getEvaluationsActionItem(): Locator {
		return this.getProductionChecklistActionItem('Test reliability of AI steps');
	}

	async clickProductionChecklistButton(): Promise<void> {
		await this.getProductionChecklistButton().click();
	}

	async clickProductionChecklistIgnoreAll(): Promise<void> {
		await this.getProductionChecklistIgnoreAllButton().click();
	}

	async clickProductionChecklistAction(actionText: string): Promise<void> {
		await this.getProductionChecklistActionItem(actionText).click();
	}

	getCanvasNodes() {
		return this.page.getByTestId('canvas-node');
	}
}
