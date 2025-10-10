import type { Locator } from '@playwright/test';
import { nanoid } from 'nanoid';

import { BasePage } from './BasePage';
import { ROUTES } from '../config/constants';
import { resolveFromRoot } from '../utils/path-helper';
import { CredentialModal } from './components/CredentialModal';
import { FocusPanel } from './components/FocusPanel';
import { LogsPanel } from './components/LogsPanel';
import { NodeCreator } from './components/NodeCreator';
import { SaveChangesModal } from './components/SaveChangesModal';
import { StickyComponent } from './components/StickyComponent';
import { TagsManagerModal } from './components/TagsManagerModal';

export class CanvasPage extends BasePage {
	readonly sticky = new StickyComponent(this.page);
	readonly logsPanel = new LogsPanel(this.page.getByTestId('logs-panel'));
	readonly focusPanel = new FocusPanel(this.page.getByTestId('focus-panel'));
	readonly credentialModal = new CredentialModal(this.page.getByTestId('editCredential-modal'));
	readonly nodeCreator = new NodeCreator(this.page);
	readonly saveChangesModal = new SaveChangesModal(this.page.locator('.el-overlay'));
	readonly tagsManagerModal = new TagsManagerModal(
		this.page.getByRole('dialog').filter({ hasText: 'Manage tags' }),
	);

	saveWorkflowButton(): Locator {
		return this.page.getByRole('button', { name: 'Save' });
	}

	nodeCreatorItemByName(text: string): Locator {
		return this.page.getByTestId('node-creator-item-name').getByText(text, { exact: true });
	}

	nodeCreatorSubItem(subItemText: string): Locator {
		return this.page.getByTestId('node-creator-item-name').getByText(subItemText, { exact: true });
	}

	getNthCreatorItem(index: number): Locator {
		return this.page.getByTestId('node-creator-item').nth(index);
	}

	getNodeCreatorHeader(text?: string) {
		const header = this.page.getByTestId('nodes-list-header');
		return text ? header.filter({ hasText: text }) : header.first();
	}

	async selectNodeCreatorItemByText(nodeName: string) {
		await this.page.getByText(nodeName).click();
	}

	nodeByName(nodeName: string): Locator {
		return this.page.locator(`[data-test-id="canvas-node"][data-node-name="${nodeName}"]`);
	}

	nodeIssuesBadge(nodeName: string) {
		return this.nodeByName(nodeName).getByTestId('node-issues');
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

	getCanvasNodes() {
		return this.page.getByTestId('canvas-node');
	}

	async clickNodeCreatorPlusButton(): Promise<void> {
		await this.clickByTestId('node-creator-plus-button');
	}

	async clickSaveWorkflowButton(): Promise<void> {
		await this.saveWorkflowButton().click();
	}

	async fillNodeCreatorSearchBar(text: string): Promise<void> {
		await this.nodeCreatorSearchBar().fill(text);
	}

	async clickNodeCreatorItemName(text: string): Promise<void> {
		await this.nodeCreatorItemByName(text).click();
	}

	async clickAddToWorkflowButton(): Promise<void> {
		await this.page.getByText('Add to workflow').click();
	}

	/**
	 * Add a node to the canvas with flexible options
	 * @param nodeName - The name of the node to search for and add
	 * @param options - Configuration options for node addition
	 * @param options.closeNDV - Whether to close the NDV after adding (default: false, keeps open)
	 * @param options.action - Specific action to select (Actions tab is default)
	 * @param options.trigger - Specific trigger to select (will switch to Triggers)
	 * @example
	 * // Basic node addition
	 * await canvas.addNode('Code');
	 *
	 * // Add with specific action
	 * await canvas.addNode('Linear', { action: 'Create an issue' });
	 *
	 * // Add with trigger
	 * await canvas.addNode('Jira', { trigger: 'On issue created' });
	 *
	 * // Add and explicitly close with back button
	 * await canvas.addNode('Code', { closeNDV: true });
	 */
	async addNode(
		nodeName: string,
		options?: {
			closeNDV?: boolean;
			action?: string;
			trigger?: string;
		},
	): Promise<void> {
		// Always start with canvas plus button
		await this.clickNodeCreatorPlusButton();

		// Search for and select the node, works on exact name match only
		await this.fillNodeCreatorSearchBar(nodeName);
		await this.clickNodeCreatorItemName(nodeName);

		if (options?.action) {
			// Check if Actions category is collapsed and expand if needed
			const actionsCategory = this.page
				.getByTestId('node-creator-category-item')
				.getByText('Actions');
			if ((await actionsCategory.getAttribute('data-category-collapsed')) === 'true') {
				await actionsCategory.click();
			}
			await this.nodeCreatorSubItem(options.action).click();
		} else if (options?.trigger) {
			// Check if Triggers category is collapsed and expand if needed
			const triggersCategory = this.page
				.getByTestId('node-creator-category-item')
				.getByText('Triggers');
			if ((await triggersCategory.getAttribute('data-category-collapsed')) === 'true') {
				await triggersCategory.click();
			}
			await this.nodeCreatorSubItem(options.trigger).click();
		}
		if (options?.closeNDV) {
			await this.page.getByTestId('back-to-canvas').click();
		}
	}

	async deleteNodeByName(nodeName: string): Promise<void> {
		await this.nodeDeleteButton(nodeName).click();
	}

	async saveWorkflow(): Promise<void> {
		await this.clickSaveWorkflowButton();
	}

	getExecuteWorkflowButton(triggerNodeName?: string): Locator {
		const testId = triggerNodeName
			? `execute-workflow-button-${triggerNodeName}`
			: 'execute-workflow-button';
		return this.page.getByTestId(testId);
	}

	async clickExecuteWorkflowButton(triggerNodeName?: string): Promise<void> {
		await this.getExecuteWorkflowButton(triggerNodeName).click();
	}

	async clickDebugInEditorButton(): Promise<void> {
		await this.page.getByRole('button', { name: 'Debug in editor' }).click();
	}

	async pinNode(nodeName: string): Promise<void> {
		await this.nodeByName(nodeName).click({ button: 'right' });
		await this.page.getByTestId('context-menu').getByText('Pin').click();
	}

	async unpinNode(nodeName: string): Promise<void> {
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

	async clickEditorTab(): Promise<void> {
		await this.page.getByRole('radio', { name: 'Editor' }).click();
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
			this.clickByTestId('workflow-menu-item-import-from-file'),
		]);
		await fileChooser.setFiles(resolveFromRoot('workflows', fixtureKey));

		await this.clickByTestId('inline-edit-preview');
		await this.fillByTestId('inline-edit-input', workflowName);
		await this.page.getByTestId('inline-edit-input').press('Enter');
	}

	// Import workflow locators
	getImportURLInput(): Locator {
		return this.page.getByTestId('workflow-url-import-input');
	}

	// Import workflow actions
	async clickWorkflowMenu(): Promise<void> {
		await this.clickByTestId('workflow-menu');
	}

	async clickImportFromURL(): Promise<void> {
		await this.clickByTestId('workflow-menu-item-import-from-url');
	}

	async clickImportFromFile(): Promise<void> {
		await this.clickByTestId('workflow-menu-item-import-from-file');
	}

	async fillImportURLInput(url: string): Promise<void> {
		await this.getImportURLInput().fill(url);
	}

	async clickConfirmImportURL(): Promise<void> {
		await this.clickByTestId('confirm-workflow-import-url-button');
	}

	async clickCancelImportURL(): Promise<void> {
		await this.clickByTestId('cancel-workflow-import-url-button');
	}

	async clickOutsideModal(): Promise<void> {
		await this.page.locator('body').click({ position: { x: 0, y: 0 } });
	}

	getWorkflowTags() {
		return this.page.getByTestId('workflow-tags').locator('.el-tag');
	}
	async activateWorkflow() {
		const switchElement = this.page.getByTestId('workflow-activate-switch');
		const statusElement = this.page.getByTestId('workflow-activator-status');

		const responsePromise = this.page.waitForResponse(
			(response) =>
				response.url().includes('/rest/workflows/') && response.request().method() === 'PATCH',
		);

		await switchElement.click();
		await statusElement.locator('span').filter({ hasText: 'Active' }).waitFor({ state: 'visible' });
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

	async clickCreateTagButton(): Promise<void> {
		await this.page.getByTestId('new-tag-link').click();
	}

	async clickNthTagPill(index: number): Promise<void> {
		await this.page.getByTestId('workflow-tags-container').locator('.el-tag').nth(index).click();
	}

	async clickWorkflowTagsArea(): Promise<void> {
		await this.page.getByTestId('workflow-tags').click();
	}

	async clickWorkflowTagsContainer(): Promise<void> {
		await this.page.getByTestId('workflow-tags-container').click();
	}

	getTagPills(): Locator {
		return this.page
			.getByTestId('workflow-tags-container')
			.locator('.el-tag:not(.count-container)');
	}

	getTagsDropdown(): Locator {
		return this.page.getByTestId('tags-dropdown');
	}

	async typeInTagInput(text: string): Promise<void> {
		const input = this.page.getByTestId('workflow-tags-container').locator('input').first();
		await input.fill(text);
	}

	async openTagManagerModal(): Promise<void> {
		await this.clickCreateTagButton();
		await this.page.getByTestId('tags-dropdown').click();
		await this.page.locator('.manage-tags').click();
	}

	async pressEnterToCreateTag(): Promise<void> {
		const responsePromise = this.waitForRestResponse('/rest/tags', 'POST');
		await this.page.keyboard.press('Enter');
		await responsePromise;
	}

	// Tag dropdown getters
	getVisibleDropdown(): Locator {
		return this.page.locator('.el-select-dropdown:visible');
	}

	getTagItemsInDropdown(): Locator {
		return this.getVisibleDropdown().locator('[data-test-id="tag"].tag');
	}

	getTagItemInDropdownByName(name: string): Locator {
		return this.getVisibleDropdown().locator(`[data-test-id="tag"].tag:has-text("${name}")`);
	}

	getSelectedTagItems(): Locator {
		return this.getVisibleDropdown().locator('[data-test-id="tag"].tag.selected');
	}

	getWorkflowSaveButton(): Locator {
		return this.page.getByTestId('workflow-save-button');
	}

	getWorkflowActivatorSwitch(): Locator {
		return this.page.getByTestId('workflow-activate-switch');
	}

	getLoadingMask(): Locator {
		return this.page.locator('.el-loading-mask');
	}

	getWorkflowIdFromUrl(): string {
		const url = new URL(this.page.url());
		const workflowId = url.pathname.split('/workflow/')[1]?.split('/')[0];
		if (!workflowId) throw new Error('Workflow ID not found in URL');
		return workflowId;
	}

	/**
	 * Get the "Set up template" button that appears when credential setup is incomplete
	 * @returns Locator for the setup workflow credentials button
	 */
	getSetupWorkflowCredentialsButton(): Locator {
		return this.page.getByRole('button', { name: 'Set up template' });
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

	async duplicateNode(nodeName: string): Promise<void> {
		await this.nodeByName(nodeName).click({ button: 'right' });
		await this.page.getByTestId('context-menu').getByText('Duplicate').click();
	}

	nodeConnections(): Locator {
		return this.page.locator('[data-test-id="edge"]');
	}

	getConnectionBetweenNodes(sourceNodeName: string, targetNodeName: string): Locator {
		return this.connectionBetweenNodes(sourceNodeName, targetNodeName);
	}

	canvasNodePlusEndpointByName(nodeName: string): Locator {
		return this.page
			.locator(
				`[data-test-id="canvas-node-output-handle"][data-node-name="${nodeName}"] [data-test-id="canvas-handle-plus"]`,
			)
			.first();
	}

	nodeCreatorSearchBar(): Locator {
		return this.page.getByTestId('node-creator-search-bar');
	}

	nodeCreatorNodeItems(): Locator {
		return this.page.getByTestId('node-creator-item-name');
	}

	nodeCreatorActionItems(): Locator {
		return this.page.getByTestId('node-creator-action-item');
	}

	nodeCreatorCategoryItems(): Locator {
		return this.page.getByTestId('node-creator-category-item');
	}

	selectedNodes(): Locator {
		return this.page
			.locator('[data-test-id="canvas-node"]')
			.locator('xpath=..')
			.locator('.selected');
	}

	disabledNodes(): Locator {
		return this.page.locator('[data-canvas-node-render-type][class*="disabled"]');
	}

	nodeExecuteButton(nodeName: string): Locator {
		return this.nodeToolbar(nodeName).getByTestId('execute-node-button');
	}

	getArchivedTag(): Locator {
		return this.page.getByTestId('workflow-archived-tag');
	}

	getNodeCreatorPlusButton(): Locator {
		return this.page.getByTestId('node-creator-plus-button');
	}

	canvasPane(): Locator {
		return this.page.getByTestId('canvas-wrapper');
	}

	canvasBody(): Locator {
		return this.page.getByTestId('canvas');
	}

	toggleFocusPanelButton(): Locator {
		return this.page.getByTestId('toggle-focus-panel-button');
	}

	stopExecutionButton(): Locator {
		return this.page.getByTestId('stop-execution-button');
	}

	// Actions

	async addInitialNodeToCanvas(nodeName: string): Promise<void> {
		await this.clickCanvasPlusButton();
		await this.fillNodeCreatorSearchBar(nodeName);
		await this.clickNodeCreatorItemName(nodeName);
	}

	async clickNodePlusEndpoint(nodeName: string): Promise<void> {
		await this.canvasNodePlusEndpointByName(nodeName).click();
	}

	async executeNode(nodeName: string): Promise<void> {
		await this.nodeByName(nodeName).hover();
		await this.nodeExecuteButton(nodeName).click();
	}

	async selectAll(): Promise<void> {
		// Establish proper selection context first
		await this.getCanvasNodes().first().click();
		await this.page.keyboard.press('ControlOrMeta+a');
	}

	async copyNodes(): Promise<void> {
		await this.page.keyboard.press('ControlOrMeta+c');
	}

	async deselectAll(): Promise<void> {
		await this.canvasPane().click({ position: { x: 10, y: 10 } });
	}

	getNodeLeftPosition(nodeLocator: Locator): Promise<number> {
		return nodeLocator.evaluate((el) => el.getBoundingClientRect().left);
	}

	// Connection helpers
	connectionBetweenNodes(sourceNodeName: string, targetNodeName: string): Locator {
		return this.page.locator(
			`[data-test-id="edge"][data-source-node-name="${sourceNodeName}"][data-target-node-name="${targetNodeName}"]`,
		);
	}

	connectionToolbarBetweenNodes(sourceNodeName: string, targetNodeName: string): Locator {
		return this.page.locator(
			`[data-test-id="edge-label"][data-source-node-name="${sourceNodeName}"][data-target-node-name="${targetNodeName}"] [data-test-id="canvas-edge-toolbar"]`,
		);
	}

	// Canvas action helpers
	async addNodeBetweenNodes(
		sourceNodeName: string,
		targetNodeName: string,
		newNodeName: string,
	): Promise<void> {
		const specificConnection = this.connectionBetweenNodes(sourceNodeName, targetNodeName);
		// eslint-disable-next-line playwright/no-force-option
		await specificConnection.hover({ force: true });

		const addNodeButton = this.connectionToolbarBetweenNodes(
			sourceNodeName,
			targetNodeName,
		).getByTestId('add-connection-button');

		await addNodeButton.click();
		await this.fillNodeCreatorSearchBar(newNodeName);
		await this.clickNodeCreatorItemName(newNodeName);
		await this.page.keyboard.press('Escape');
	}

	async deleteConnectionBetweenNodes(
		sourceNodeName: string,
		targetNodeName: string,
	): Promise<void> {
		const specificConnection = this.connectionBetweenNodes(sourceNodeName, targetNodeName);
		// eslint-disable-next-line playwright/no-force-option
		await specificConnection.hover({ force: true });

		const deleteButton = this.connectionToolbarBetweenNodes(
			sourceNodeName,
			targetNodeName,
		).getByTestId('delete-connection-button');

		await deleteButton.click();
	}

	async navigateNodesWithArrows(direction: 'left' | 'right' | 'up' | 'down'): Promise<void> {
		const keyMap = {
			left: 'ArrowLeft',
			right: 'ArrowRight',
			up: 'ArrowUp',
			down: 'ArrowDown',
		};
		await this.canvasPane().focus();
		await this.page.keyboard.press(keyMap[direction]);
	}

	async extendSelectionWithArrows(direction: 'left' | 'right' | 'up' | 'down'): Promise<void> {
		const keyMap = {
			left: 'Shift+ArrowLeft',
			right: 'Shift+ArrowRight',
			up: 'Shift+ArrowUp',
			down: 'Shift+ArrowDown',
		};
		await this.canvasPane().focus();
		await this.page.keyboard.press(keyMap[direction]);
	}

	/**
	 * Visit the workflow page with a specific timestamp for NPS survey testing.
	 * Uses Playwright's clock API to set a fixed time.
	 */
	async visitWithTimestamp(timestamp: number): Promise<void> {
		// Set fixed time using Playwright's clock API
		await this.page.clock.setFixedTime(timestamp);

		await this.openNewWorkflow();
	}

	async addNodeWithSubItem(searchText: string, subItemText: string): Promise<void> {
		await this.addNode(searchText);
		await this.nodeCreatorSubItem(subItemText).click();
	}

	async openNewWorkflow() {
		await this.page.goto(ROUTES.NEW_WORKFLOW_PAGE);
	}

	getRagCalloutTip(): Locator {
		return this.page.getByText('Tip: Get a feel for vector stores in n8n with our');
	}

	getRagTemplateLink(): Locator {
		return this.page.getByText('RAG starter template');
	}

	async clickRagTemplateLink(): Promise<void> {
		await this.getRagTemplateLink().click();
	}

	async rightClickNode(nodeName: string): Promise<void> {
		await this.nodeByName(nodeName).click({ button: 'right' });
	}

	async clickContextMenuAction(actionText: string): Promise<void> {
		await this.page.getByTestId('context-menu').getByText(actionText).click();
	}

	async executeNodeFromContextMenu(nodeName: string): Promise<void> {
		await this.rightClickNode(nodeName);
		await this.clickContextMenuAction('execute');
	}

	clearExecutionDataButton(): Locator {
		return this.page.getByTestId('clear-execution-data-button');
	}

	async clearExecutionData(): Promise<void> {
		await this.clearExecutionDataButton().click();
	}

	getManualChatModal(): Locator {
		return this.page.getByTestId('canvas-chat');
	}

	getManualChatInput(): Locator {
		return this.getManualChatModal().locator('.chat-inputs textarea');
	}

	getManualChatMessages(): Locator {
		return this.getManualChatModal().locator('.chat-messages-list .chat-message');
	}

	getManualChatLatestBotMessage(): Locator {
		return this.getManualChatModal()
			.locator('.chat-messages-list .chat-message.chat-message-from-bot')
			.last();
	}

	getNodesWithSpinner(): Locator {
		return this.page.getByTestId('canvas-node').filter({
			has: this.page.locator('[data-icon=refresh-cw]'),
		});
	}

	getWaitingNodes(): Locator {
		return this.page.getByTestId('canvas-node').filter({
			has: this.page.locator('[data-icon=clock]'),
		});
	}

	/**
	 * Get all currently selected nodes on the canvas
	 */
	getSelectedNodes() {
		return this.page.locator('[data-test-id="canvas-node"].selected');
	}

	// Disable node via context menu
	async disableNodeFromContextMenu(nodeName: string): Promise<void> {
		await this.rightClickNode(nodeName);
		await this.page
			.getByTestId('context-menu')
			.getByTestId('context-menu-item-toggle_activation')
			.click();
	}

	/**
	 * Toggle node enabled/disabled state using keyboard shortcut
	 * @param nodeName - The name of the node to toggle
	 */
	async toggleNodeEnabled(nodeName: string): Promise<void> {
		await this.nodeByName(nodeName).click();
		await this.page.keyboard.press('d');
	}

	// Chat open/close buttons (manual chat)
	async clickManualChatButton(): Promise<void> {
		await this.page.getByTestId('workflow-chat-button').click();
		await this.getManualChatModal().waitFor({ state: 'visible' });
	}

	async closeManualChatModal(): Promise<void> {
		// Same toggle button closes the chat
		await this.page.getByTestId('workflow-chat-button').click();
	}

	// Input plus endpoints (to add supplemental nodes to parent inputs)
	getInputPlusEndpointByType(nodeName: string, endpointType: string) {
		return this.page
			.locator(
				`[data-test-id="canvas-node-input-handle"][data-connection-type="${endpointType}"][data-node-name="${nodeName}"] [data-test-id="canvas-handle-plus"]`,
			)
			.first();
	}

	// Generic supplemental node addition, then wrappers for specific types
	async addSupplementalNodeToParent(
		childNodeName: string,
		endpointType:
			| 'main'
			| 'ai_chain'
			| 'ai_document'
			| 'ai_embedding'
			| 'ai_languageModel'
			| 'ai_memory'
			| 'ai_outputParser'
			| 'ai_tool'
			| 'ai_retriever'
			| 'ai_textSplitter'
			| 'ai_vectorRetriever'
			| 'ai_vectorStore',
		parentNodeName: string,
		{ closeNDV = false, exactMatch = false }: { closeNDV?: boolean; exactMatch?: boolean } = {},
	): Promise<void> {
		await this.getInputPlusEndpointByType(parentNodeName, endpointType).click();

		if (exactMatch) {
			await this.nodeCreatorNodeItems().getByText(childNodeName, { exact: true }).click();
		} else {
			await this.nodeCreatorNodeItems().filter({ hasText: childNodeName }).first().click();
		}

		if (closeNDV) {
			await this.page.keyboard.press('Escape');
		}
	}

	async openExecutions() {
		await this.page.getByTestId('radio-button-executions').click();
	}

	async clickZoomInButton(): Promise<void> {
		await this.clickByTestId('zoom-in-button');
	}

	async clickZoomOutButton(): Promise<void> {
		await this.clickByTestId('zoom-out-button');
	}

	/**
	 * Get the current zoom level of the canvas
	 * @returns The current zoom/scale factor as a number
	 */
	async getCanvasZoomLevel(): Promise<number> {
		return await this.page.evaluate(() => {
			const canvasViewport = document.querySelector('.vue-flow__viewport');
			if (canvasViewport) {
				const transform = window.getComputedStyle(canvasViewport).transform;
				if (transform && transform !== 'none') {
					const matrix = transform.match(/matrix\(([^)]+)\)/);
					if (matrix) {
						const values = matrix[1].split(',').map((v) => v.trim());
						return parseFloat(values[0]); // First value is scaleX
					}
				}
			}

			// Fallback: return default zoom level
			return 1.0;
		});
	}

	waitingForTriggerEvent() {
		return this.getExecuteWorkflowButton().getByText('Waiting for trigger event');
	}

	getNodeSuccessStatusIndicator(nodeName: string): Locator {
		return this.nodeByName(nodeName).getByTestId('canvas-node-status-success');
	}

	getNodeWarningStatusIndicator(nodeName: string): Locator {
		return this.nodeByName(nodeName).getByTestId('canvas-node-status-warning');
	}

	getNodeRunningStatusIndicator(nodeName: string): Locator {
		return this.nodeByName(nodeName).locator('[data-icon="refresh-cw"]');
	}

	stopExecutionWaitingForWebhookButton(): Locator {
		return this.page.getByTestId('stop-execution-waiting-for-webhook-button');
	}

	getExecuteWorkflowButtonSpinner(): Locator {
		return this.getExecuteWorkflowButton().locator('.n8n-spinner');
	}

	getCanvasPlusButton(): Locator {
		return this.page.getByTestId('canvas-plus-button');
	}

	async hitUndo(): Promise<void> {
		await this.page.keyboard.press('ControlOrMeta+z');
	}

	async hitRedo(): Promise<void> {
		await this.page.keyboard.press('ControlOrMeta+Shift+z');
	}

	async hitPaste(): Promise<void> {
		await this.page.keyboard.press('ControlOrMeta+V');
	}

	async hitSaveWorkflow(): Promise<void> {
		await this.page.keyboard.press('ControlOrMeta+s');
	}

	async hitExecuteWorkflow(): Promise<void> {
		await this.page.keyboard.press('ControlOrMeta+Enter');
	}

	async getNodePosition(nodeName: string): Promise<{ x: number; y: number }> {
		const node = this.nodeByName(nodeName);
		const boundingBox = await node.boundingBox();
		if (!boundingBox) throw new Error(`Node ${nodeName} not found or not visible`);
		return { x: boundingBox.x, y: boundingBox.y };
	}

	async dragNodeToRelativePosition(
		nodeName: string,
		deltaX: number,
		deltaY: number,
	): Promise<void> {
		const node = this.nodeByName(nodeName);
		const currentBox = await node.boundingBox();
		if (!currentBox) throw new Error(`Node ${nodeName} not found`);

		// Calculate center of node for drag start
		const startX = currentBox.x + currentBox.width / 2;
		const startY = currentBox.y + currentBox.height / 2;

		// Use mouse events for precise control
		await this.page.mouse.move(startX, startY);
		await this.page.mouse.down();
		await this.page.mouse.move(startX + deltaX, startY + deltaY, { steps: 10 });
		await this.page.mouse.up();
	}

	async deleteNodeFromContextMenu(nodeName: string): Promise<void> {
		await this.nodeByName(nodeName).click({ button: 'right' });
		await this.page.getByTestId('context-menu').getByText('Delete').click();
	}

	async hitDeleteAllNodes(): Promise<void> {
		await this.selectAll();
		await this.page.keyboard.press('Backspace');
	}

	getNodeInputHandles(nodeName: string): Locator {
		return this.page.locator(
			`[data-test-id="canvas-node-input-handle"][data-node-name="${nodeName}"]`,
		);
	}

	getWorkflowName(): Locator {
		return this.page.getByTestId('workflow-name-input');
	}

	getWorkflowNameInput(): Locator {
		return this.page.getByTestId('inline-edit-input');
	}
}
