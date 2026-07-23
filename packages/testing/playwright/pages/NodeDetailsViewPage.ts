import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from './BasePage';
import { ClipboardHelper } from '../helpers/ClipboardHelper';
import { NodeParameterHelper } from '../helpers/NodeParameterHelper';
import { CodeNodeEditor } from './components/CodeNodeEditor';
import { dialogCloseIconIn, dialogRootIn } from './components/dialogLocators';
import { InlineExpressionEditor } from './components/InlineExpressionEditor';
import { NodeCreator } from './components/NodeCreator';
import { NodeCredentials } from './components/NodeCredentials';
import { EditFieldsNode } from './components/nodes/EditFieldsNode';
import { ResourceLocator } from './components/ResourceLocator';
import { RunDataPanel } from './components/RunDataPanel';
import { locatorByIndex } from '../utils/index-helper';

export class NodeDetailsViewPage extends BasePage {
	readonly setupHelper: NodeParameterHelper;
	readonly editFields: EditFieldsNode;
	readonly clipboard: ClipboardHelper;
	readonly inputPanel = new RunDataPanel(this.container.getByTestId('ndv-input-panel'));
	readonly outputPanel = new RunDataPanel(this.container.getByTestId('output-panel'));
	readonly credentials = new NodeCredentials(this.container);
	readonly inlineExpressionEditor = new InlineExpressionEditor(this.container);
	readonly resourceLocator = new ResourceLocator(this.container);
	readonly codeNodeEditor = new CodeNodeEditor(this.container);
	readonly nodeCreator = new NodeCreator(this.page);

	constructor(page: Page) {
		super(page);
		this.setupHelper = new NodeParameterHelper(this);
		this.editFields = new EditFieldsNode(page);
		this.clipboard = new ClipboardHelper(page);
	}

	getNodeCredentialsSelect() {
		return this.credentials.getSelect();
	}

	getNodeCredentialsEmptyState() {
		return this.credentials.getEmptyState();
	}

	getNodeCredentialsQuickConnectEmptyState() {
		return this.credentials.getQuickConnectEmptyState();
	}

	credentialDropdownCreateNewCredential() {
		return this.credentials.getCreateNewOption();
	}

	getCredentialOptionByText(text: string) {
		return this.credentials.getOptionByText(text);
	}

	getCredentialDropdownOptions() {
		return this.credentials.getDropdownOptions();
	}

	getCredentialSelect() {
		return this.credentials.getCombobox();
	}

	async clickBackToCanvasButton() {
		await this.clickByTestId('ndv-close-button');
	}

	getParameterByLabel(labelName: string) {
		return this.container.locator('.parameter-item').filter({ hasText: labelName });
	}

	getParameterTextboxByLabel(labelName: string) {
		return this.getParameterByLabel(labelName).getByRole('textbox');
	}

	async fillParameterInput(labelName: string, value: string, index?: number) {
		await locatorByIndex(this.getParameterByLabel(labelName), index)
			.getByTestId('parameter-input-field')
			.fill(value);
	}

	async selectWorkflowResource(createItemText: string, searchText: string = '') {
		await this.resourceLocator.selectResource(createItemText, searchText);
	}

	async togglePinData() {
		await this.clickByTestId('ndv-pin-data');
	}

	async close() {
		await this.clickBackToCanvasButton();
	}

	async addFixedCollectionItem() {
		await this.clickByTestId('fixed-collection-add');
	}

	async execute() {
		await this.clickByTestId('node-execute-button');
	}

	getOutputPanel() {
		return this.container.getByTestId('output-panel');
	}

	get container() {
		return this.page.getByTestId('ndv');
	}

	getInputPanel() {
		return this.container.getByTestId('ndv-input-panel');
	}

	getParameterExpressionPreviewValue() {
		return this.container.getByTestId('parameter-expression-preview-value');
	}

	getParameterExpressionPreviewOutput() {
		return this.container.getByTestId('parameter-expression-preview-output');
	}

	getInlineExpressionEditorPreview() {
		return this.inlineExpressionEditor.getPreview();
	}

	async activateParameterExpressionEditor(parameterName: string) {
		await this.inlineExpressionEditor.activate(parameterName);
	}

	getEditPinnedDataButton() {
		return this.container.getByTestId('ndv-edit-pinned-data');
	}

	getRunDataPaneHeader() {
		return this.container.getByTestId('run-data-pane-header');
	}

	getEditOutputButton() {
		return this.getRunDataPaneHeader().getByRole('button', { name: 'Edit Output' });
	}

	getOutputDataContainer() {
		return this.getOutputPanel().getByTestId('ndv-data-container');
	}

	getOutputDataValues() {
		return this.getOutputDataContainer().locator('[class*=value_]');
	}

	async setPinnedData(data: object | string) {
		const pinnedData = typeof data === 'string' ? data : JSON.stringify(data);
		await this.getEditPinnedDataButton().click();

		const editor = this.outputPanel.getContentEditableEditor();
		await editor.waitFor();
		await editor.click();
		await editor.fill(pinnedData);

		await this.savePinnedData();
	}

	async savePinnedData() {
		await this.getRunDataPaneHeader().locator('button:visible').filter({ hasText: 'Save' }).click();
	}

	getAssignmentCollectionAdd(paramName: string) {
		return this.container
			.getByTestId(`assignment-collection-${paramName}`)
			.getByTestId('assignment-collection-drop-area');
	}

	getAssignmentCollectionDropArea() {
		return this.container.getByTestId('assignment-collection-drop-area');
	}

	async clickAssignmentCollectionDropArea() {
		await this.getAssignmentCollectionDropArea().click();
	}

	getAssignmentValue(paramName: string) {
		return this.container
			.getByTestId(`assignment-collection-${paramName}`)
			.getByTestId('assignment-value');
	}

	getAssignmentExpressionToggle(paramName: string) {
		return this.getAssignmentValue(paramName).getByText('Expression');
	}

	async clickAssignmentExpressionToggle(paramName: string) {
		await this.getAssignmentExpressionToggle(paramName).click();
	}

	/**
	 * Get the inline expression editor input
	 * @param parameterName - The name of the parameter to get the inline expression editor input for. If not set, gets the first inline expression editor input on page
	 * @returns The inline expression editor input
	 */
	getInlineExpressionEditorInput(parameterName?: string) {
		return this.inlineExpressionEditor.getInput(parameterName);
	}

	getNodeParameters() {
		return this.container.getByTestId('node-parameters');
	}

	getParameterInputHint() {
		return this.container.getByTestId('parameter-input-hint');
	}

	getInputLabel() {
		return this.container.getByTestId('input-label');
	}

	getNthParameter(index: number) {
		return this.getNodeParameters().locator('.parameter-item').nth(index);
	}

	getCredentialsLabel() {
		return this.credentials.getLabel();
	}

	async makeWebhookRequest(path: string) {
		return await this.page.request.get(path);
	}

	async clearExpressionEditor(parameterName?: string) {
		await this.inlineExpressionEditor.clear(parameterName);
	}

	async typeInExpressionEditor(text: string, parameterName?: string) {
		await this.inlineExpressionEditor.type(text, parameterName);
	}

	getParameterInput(parameterName: string, index?: number) {
		return locatorByIndex(this.container.getByTestId(`parameter-input-${parameterName}`), index);
	}

	getParameterInputTextbox(parameterName: string, index?: number) {
		return this.getParameterInput(parameterName, index).getByRole('textbox');
	}

	getParameterInputField(parameterName: string, index?: number) {
		return this.getParameterInput(parameterName, index).locator('input');
	}

	getParameterEditor(parameterName: string, index?: number) {
		// CodeMirror editor
		return this.getParameterInput(parameterName, index).locator('.cm-content');
	}

	getParameterTextarea(parameterName: string, index?: number) {
		return this.getParameterInput(parameterName, index).locator('textarea');
	}

	async selectOptionInParameterDropdown(parameterName: string, optionText: string, index = 0) {
		await this.clickParameterDropdown(parameterName, index);
		await this.selectFromVisibleDropdown(optionText);
	}

	async clickParameterDropdown(parameterName: string, index = 0): Promise<void> {
		await locatorByIndex(
			this.container.getByTestId(`parameter-input-${parameterName}`),
			index,
		).click();
	}

	async selectFromVisibleDropdown(optionText: string): Promise<void> {
		await this.getVisiblePopoverOption(optionText).click();
	}

	async fillParameterInputByName(parameterName: string, value: string, index = 0): Promise<void> {
		const input = this.getParameterInputField(parameterName, index);
		await input.click();
		await input.fill(value);
	}

	async clickParameterOptions(): Promise<void> {
		await this.container.getByTestId('collection-parameter-add').click();
	}

	async addParameterOptionByName(optionName: string): Promise<void> {
		await this.clickParameterOptions();
		await this.selectFromVisibleDropdown(optionName);
	}

	async clickFloatingNode(nodeName: string) {
		await this.container
			.locator(`[data-test-id="floating-node"][data-node-name="${nodeName}"]`)
			.click();
	}

	async executePrevious() {
		await this.clickByTestId('execute-previous-node');
	}

	async clickAskAiTab() {
		await this.codeNodeEditor.clickAskAiTab();
	}

	getAskAiTabPanel() {
		return this.codeNodeEditor.getAskAiTabPanel();
	}

	getAskAiCtaButton() {
		return this.codeNodeEditor.getAskAiCtaButton();
	}

	getAskAiPromptInput() {
		return this.codeNodeEditor.getAskAiPromptInput();
	}

	getAskAiPromptCounter() {
		return this.codeNodeEditor.getAskAiPromptCounter();
	}

	getAskAiCtaTooltipNoInputData() {
		return this.codeNodeEditor.getAskAiCtaTooltipNoInputData();
	}

	getAskAiCtaTooltipNoPrompt() {
		return this.codeNodeEditor.getAskAiCtaTooltipNoPrompt();
	}

	getAskAiCtaTooltipPromptTooShort() {
		return this.codeNodeEditor.getAskAiCtaTooltipPromptTooShort();
	}

	getCodeTabPanel() {
		return this.codeNodeEditor.getCodeTabPanel();
	}

	getCodeTab() {
		return this.codeNodeEditor.getCodeTab();
	}

	getCodeEditor() {
		return this.codeNodeEditor.getCodeEditor();
	}

	getLintErrors() {
		return this.codeNodeEditor.getLintErrors();
	}

	getLintTooltip() {
		return this.codeNodeEditor.getLintTooltip();
	}

	getPlaceholderText(text: string) {
		return this.page.getByText(text);
	}

	getHeyAiText() {
		return this.codeNodeEditor.getHeyAiText();
	}

	getCodeGenerationCompletedText() {
		return this.codeNodeEditor.getCodeGenerationCompletedText();
	}

	getErrorMessageText(message: string) {
		return this.codeNodeEditor.getErrorMessageText(message);
	}

	async setParameterDropdown(parameterName: string, optionText: string): Promise<void> {
		await this.getParameterInput(parameterName).click();

		await this.getVisiblePopoverOption(optionText).click();
	}

	async changeNodeOperation(operationName: string): Promise<void> {
		await this.setParameterDropdown('operation', operationName);
	}

	async setParameterInput(parameterName: string, value: string): Promise<void> {
		await this.fillParameterInputByName(parameterName, value);
	}

	async setParameterSwitch(parameterName: string, enabled: boolean): Promise<void> {
		const switchElement = this.getParameterInput(parameterName).locator('.el-switch');
		const isCurrentlyEnabled = (await switchElement.getAttribute('aria-checked')) === 'true';
		if (isCurrentlyEnabled !== enabled) {
			await switchElement.click();
		}
	}

	getAssignmentCollectionContainer(paramName: string) {
		return this.container.getByTestId(`assignment-collection-${paramName}`);
	}

	async selectInputNode(nodeName: string) {
		const inputSelect = this.inputPanel.getNodeInputOptions();
		await inputSelect.click();
		await this.getVisiblePopoverOption(nodeName).click();
	}

	getAssignments(paramName: string) {
		return this.getAssignmentCollectionContainer(paramName).getByTestId('assignment');
	}

	getAssignmentName(paramName: string, index = 0) {
		return this.getAssignments(paramName).nth(index).getByTestId('assignment-name');
	}

	getAssignmentNameTextbox(paramName: string, index = 0) {
		return this.getAssignmentName(paramName, index).getByRole('textbox');
	}

	getResourceMapperFieldsContainer() {
		return this.container.getByTestId('mapping-fields-container');
	}

	getResourceMapperParameterInputs() {
		return this.getResourceMapperFieldsContainer().getByTestId('parameter-input');
	}

	getResourceMapperSelectColumn() {
		return this.container.getByTestId('matching-column-select');
	}

	getResourceMapperColumnsOptionsButton() {
		return this.container.getByTestId('columns-parameter-input-options-container');
	}

	getResourceMapperRemoveFieldButton(fieldName: string) {
		return this.container.getByTestId(`remove-field-button-${fieldName}`);
	}

	getResourceMapperRemoveAllFieldsOption() {
		return this.page.getByTestId('action-removeAllFields');
	}

	async refreshResourceMapperColumns() {
		const selectColumn = this.getResourceMapperSelectColumn();
		await selectColumn.hover();
		await selectColumn.getByTestId('action-toggle').getByRole('button').click();
		await expect(this.getVisiblePopper().getByTestId('action-refreshFieldList')).toBeVisible();
		await this.getVisiblePopper().getByTestId('action-refreshFieldList').click();
	}

	getAddValueButton() {
		return this.getNodeParameters().locator('input[placeholder*="Add Value"]');
	}

	getParameterSwitch(parameterName: string) {
		return this.getParameterInput(parameterName).locator('.el-switch');
	}

	getParameterTextInput(parameterName: string) {
		return this.getParameterInput(parameterName).locator('input[type="text"]');
	}

	getInlineExpressionEditorContent() {
		return this.inlineExpressionEditor.getContent();
	}

	getInlineExpressionEditorOutput() {
		return this.inlineExpressionEditor.getOutput();
	}

	getInlineExpressionEditorItemInput() {
		return this.inlineExpressionEditor.getItemInput();
	}

	getInlineExpressionEditorItemPrevButton() {
		return this.inlineExpressionEditor.getItemPrevButton();
	}

	getInlineExpressionEditorItemNextButton() {
		return this.inlineExpressionEditor.getItemNextButton();
	}

	async expressionSelectNextItem() {
		await this.inlineExpressionEditor.selectNextItem();
	}

	async expressionSelectPrevItem() {
		await this.inlineExpressionEditor.selectPrevItem();
	}

	async openExpressionEditorModal(parameterName: string) {
		await this.inlineExpressionEditor.openModal(parameterName);
	}

	getExpressionEditorModalInput() {
		return this.inlineExpressionEditor.getModalInput();
	}

	async fillExpressionEditorModalInput(text: string) {
		await this.inlineExpressionEditor.fillModalInput(text);
	}

	getExpressionEditorModalOutput() {
		return this.inlineExpressionEditor.getModalOutput();
	}

	getAddFieldToSortByButton() {
		return this.getNodeParameters().getByText('Add Field To Sort By');
	}

	async toggleCodeMode(switchTo: 'Run Once for Each Item' | 'Run Once for All Items') {
		await this.getParameterInput('mode').click();
		await this.getVisiblePopoverOption(switchTo).click();
		// eslint-disable-next-line playwright/no-wait-for-timeout
		await this.page.waitForTimeout(2500);
	}

	getCopyInputButton() {
		return this.container.getByTestId('copy-input');
	}

	getOutputPagination() {
		return this.outputPanel.getPagination();
	}

	getOutputPaginationPages() {
		return this.getOutputPagination().locator('.el-pager li.number');
	}

	async navigateToOutputPage(pageNumber: number): Promise<void> {
		const pages = this.getOutputPaginationPages();
		await pages.nth(pageNumber - 1).click();
	}

	async setParameterInputValue(parameterName: string, value: string): Promise<void> {
		const input = this.getParameterInput(parameterName).locator('input');
		await input.clear();
		await input.fill(value);
	}

	/** Waits for parameter input debounce (100ms) to flush. */
	async waitForDebounce(): Promise<void> {
		// eslint-disable-next-line playwright/no-wait-for-timeout
		await this.page.waitForTimeout(150);
	}

	getRunDataInfoCallout() {
		return this.container.getByTestId('run-data-callout');
	}

	async checkParameterCheckboxInputByName(name: string): Promise<void> {
		const checkbox = this.getParameterInput(name).locator('.el-switch.switch-input');
		await checkbox.click();
	}

	// Credentials modal helpers
	async clickCreateNewCredential(eq: number = 0): Promise<void> {
		await this.credentials.clickCreateNew(eq);
	}

	// Run selector and linking helpers
	getInputRunSelector() {
		return this.getInputPanel().getByTestId('run-selector');
	}

	getOutputRunSelector() {
		return this.getOutputPanel().getByTestId('run-selector');
	}

	getInputRunSelectorInput() {
		return this.getInputRunSelector().locator('input');
	}

	async toggleInputRunLinking(): Promise<void> {
		await this.getInputPanel().getByTestId('link-run').click();
	}

	getNodeRunErrorMessage() {
		return this.container.getByTestId('node-error-message');
	}

	getNodeRunErrorDescription() {
		return this.container.getByTestId('node-error-description');
	}

	async isOutputRunLinkingEnabled() {
		const linkButton = this.outputPanel.getLinkRun();
		const classList = await linkButton.getAttribute('class');
		return classList?.includes('linked') ?? false;
	}

	async ensureOutputRunLinking(shouldBeLinked: boolean = true) {
		const isLinked = await this.isOutputRunLinkingEnabled();
		if (isLinked !== shouldBeLinked) {
			await this.outputPanel.getLinkRun().click();
		}
	}

	async changeInputRunSelector(value: string) {
		const selector = this.inputPanel.getRunSelector();
		await selector.click();
		await this.getVisiblePopoverOption(value).click();
	}

	async changeOutputRunSelector(value: string) {
		const selector = this.outputPanel.getRunSelector();
		await selector.click();
		await this.getVisiblePopoverOption(value).click();
	}

	async getInputRunSelectorValue() {
		return await this.inputPanel.getRunSelectorInput().inputValue();
	}

	async getOutputRunSelectorValue() {
		return await this.outputPanel.getRunSelectorInput().inputValue();
	}

	getExecuteNodeButton() {
		return this.container.getByTestId('node-execute-button');
	}

	getTriggerPanelExecuteButton() {
		return this.container.getByTestId('trigger-execute-button');
	}

	async openCodeEditorFullscreen() {
		await this.codeNodeEditor.openFullscreen();
	}

	getCodeEditorFullscreen() {
		return this.codeNodeEditor.getFullscreenEditor();
	}

	getCodeEditorDialog() {
		return dialogRootIn(this.page);
	}

	async closeCodeEditorDialog() {
		await dialogCloseIconIn(this.getCodeEditorDialog()).click();
	}

	getNodeRunSuccessIndicator() {
		return this.container.getByTestId('node-run-status-success');
	}

	getNodeRunErrorIndicator() {
		return this.container.getByTestId('node-run-status-danger');
	}

	getNodeRunTooltipIndicator() {
		return this.container.getByTestId('node-run-info');
	}

	getStaleNodeIndicator() {
		return this.container.getByTestId('node-run-info-stale');
	}

	getExecuteStepButton() {
		return this.container.getByTestId('node-execute-button');
	}

	async clickExecuteStep() {
		await this.getExecuteStepButton().click();
	}

	async openSettings() {
		await this.container.getByTestId('tab-settings').click();
	}

	getNodeVersion() {
		return this.container.getByTestId('node-version');
	}

	async searchOutputData(searchTerm: string) {
		// Focus the search input to expand it (it has opacity:0 when collapsed)
		const searchInput = this.outputPanel.getSearchInput();
		await searchInput.focus();
		// Wait for the search input to become visible after focus triggers expansion
		await searchInput.waitFor({ state: 'visible' });
		await searchInput.fill(searchTerm);
	}

	/**
	 * Type multiple values into the first available text parameter field
	 * Useful for testing multiple parameter changes
	 */
	async fillFirstAvailableTextParameterMultipleTimes(values: string[]) {
		const firstTextField = this.getNodeParameters().locator('input[type="text"]').first();
		await firstTextField.click();

		for (const value of values) {
			await firstTextField.fill(value);
		}
	}

	getFloatingNodeByPosition(position: 'inputMain' | 'outputMain' | 'inputSub' | 'outputSub') {
		return this.container.locator(`[data-node-placement="${position}"]`);
	}

	getNodeNameContainer() {
		return this.container.getByTestId('node-title-container');
	}

	async clickFloatingNodeByPosition(
		position: 'inputMain' | 'outputMain' | 'inputSub' | 'outputSub',
	) {
		// eslint-disable-next-line playwright/no-force-option
		await this.getFloatingNodeByPosition(position).click({ force: true });
	}

	async navigateToNextFloatingNodeWithKeyboard() {
		await this.page.keyboard.press('Shift+Meta+Alt+ArrowRight');
	}

	async navigateToPreviousFloatingNodeWithKeyboard() {
		await this.page.keyboard.press('Shift+Meta+Alt+ArrowLeft');
	}

	async verifyFloatingNodeName(
		position: 'inputMain' | 'outputMain' | 'inputSub' | 'outputSub',
		nodeName: string,
		index: number = 0,
	) {
		const floatingNode = this.getFloatingNodeByPosition(position).nth(index);
		await expect(floatingNode).toHaveAttribute('data-node-name', nodeName);
	}

	async getFloatingNodeCount(position: 'inputMain' | 'outputMain' | 'inputSub' | 'outputSub') {
		return await this.getFloatingNodeByPosition(position).count();
	}

	getAddSubNodeButton(connectionType: string, index: number = 0) {
		return this.container.getByTestId(`add-subnode-${connectionType}-${index}`);
	}

	getNodesWithIssues() {
		return this.container.locator('[class*="hasIssues"]');
	}

	async connectAISubNode(connectionType: string, nodeName: string, index: number = 0) {
		await this.getAddSubNodeButton(connectionType, index).click();
		await this.nodeCreator.selectItem(nodeName);
		await this.getFloatingNode().click();
	}

	getFloatingNode() {
		return this.container.getByTestId('floating-node');
	}

	async addItemToFixedCollection(collectionName: string) {
		const collection = this.container.getByTestId(`fixed-collection-${collectionName}`);
		const explicitAddControl = collection
			.locator(
				[
					'[data-test-id="fixed-collection-add-top-level-button"]',
					'[data-test-id="fixed-collection-add-top-level-dropdown"]',
					'[data-test-id="fixed-collection-add-header"]',
					'[data-test-id="fixed-collection-add-header-nested"]',
					'[data-test-id="fixed-collection-add"]',
				].join(', '),
			)
			.first();

		if ((await explicitAddControl.count()) > 0 && (await explicitAddControl.isVisible())) {
			await explicitAddControl.click();
			return;
		}

		const addButtonByName = collection.getByRole('button', { name: /^Add / }).first();
		if ((await addButtonByName.count()) > 0 && (await addButtonByName.isVisible())) {
			await addButtonByName.click();
			return;
		}

		// Fallback for legacy behavior where clicking the wrapper would add an item.
		await collection.click();
	}

	getFixedCollectionPropertyPicker(index?: number) {
		const pickers = this.getNodeParameters().getByTestId('fixed-collection-add-property');
		return index !== undefined ? pickers.nth(index) : pickers.first();
	}

	async addFixedCollectionProperty(propertyName: string, index?: number) {
		const picker = this.getFixedCollectionPropertyPicker(index);
		await picker.locator('input').click();
		await this.getVisiblePopoverOption(propertyName, { exact: true }).click();
	}

	getParameterItemWithText(text: string) {
		return this.container.getByTestId('parameter-item').getByText(text);
	}

	getParameterInputWithIssues(parameterPath: string) {
		return this.container.locator(
			`[data-test-id="parameter-input-field"][title*="${parameterPath}"][title*="has issues"]`,
		);
	}

	getResourceLocator(paramName: string) {
		return this.resourceLocator.getContainer(paramName);
	}

	getResourceLocatorInput(paramName: string) {
		return this.resourceLocator.getInput(paramName);
	}

	getResourceLocatorInputField(paramName: string) {
		return this.resourceLocator.getInputField(paramName);
	}

	getResourceLocatorLink(paramName: string) {
		return this.resourceLocator.getLink(paramName);
	}

	getResourceLocatorModeSelector(paramName: string) {
		return this.resourceLocator.getModeSelector(paramName);
	}

	getResourceLocatorModeSelectorInput(paramName: string) {
		return this.resourceLocator.getModeSelectorInput(paramName);
	}

	getResourceLocatorErrorMessage(paramName: string) {
		return this.resourceLocator.getErrorMessage(paramName);
	}

	getResourceLocatorAddCredentials(paramName: string) {
		return this.resourceLocator.getAddCredentials(paramName);
	}

	getResourceLocatorSearch(paramName: string) {
		return this.resourceLocator.getSearch(paramName);
	}

	getParameterInputIssues() {
		return this.container.getByTestId('parameter-issues');
	}

	getResourceLocatorItems() {
		return this.resourceLocator.getItems();
	}

	getAddResourceItem() {
		return this.resourceLocator.getAddResourceItem();
	}

	getAddResourceCreateOption() {
		return this.resourceLocator.getAddResourceCreateOption();
	}

	getExpressionModeToggle(index: number = 1) {
		return this.container.getByTestId('radio-button-expression').nth(index);
	}

	async setRLCValue(paramName: string, value: string, index = 0): Promise<void> {
		await this.resourceLocator.setValue(paramName, value, index);
	}

	async clickNodeCreatorInsertOneButton() {
		await this.nodeCreator.clickInsertOneLink();
	}

	getInputSelect() {
		return this.container.getByTestId('ndv-input-select').locator('input');
	}

	getOutputRunSelectorInput() {
		return this.getOutputPanel().locator('[data-test-id="run-selector"] input');
	}

	getAiOutputModeToggle() {
		return this.container.getByTestId('ai-output-mode-select');
	}

	getAiOutputModeRadios() {
		return this.getAiOutputModeToggle().locator('[role="radio"]');
	}

	getWebhookUrlsContainer() {
		return this.container.getByText('Webhook URLs').locator('..');
	}

	getCredentialLabel(credentialType: string) {
		return this.credentials.getLabelByText(credentialType);
	}

	getFilterComponent(paramName: string) {
		return this.container.getByTestId(`filter-${paramName}`);
	}

	getFilterConditions(paramName: string) {
		return this.getFilterComponent(paramName).getByTestId('filter-condition');
	}

	getFilterConditionLeft(paramName: string, index: number = 0) {
		return this.getFilterComponent(paramName).getByTestId('filter-condition-left').nth(index);
	}

	getFilterConditionLeftInput(paramName: string, index: number = 0) {
		return this.getFilterConditionLeft(paramName, index).locator('input');
	}

	getFilterConditionOperator(paramName: string, index: number = 0) {
		return this.getFilterComponent(paramName).getByTestId('filter-operator-select').nth(index);
	}

	getFilterConditionRemove(paramName: string, index: number = 0) {
		return this.getFilterComponent(paramName).getByTestId('filter-remove-condition').nth(index);
	}

	getFilterConditionAdd(paramName: string) {
		return this.getFilterComponent(paramName).getByTestId('filter-add-condition');
	}

	async addFilterCondition(paramName: string) {
		await this.getFilterConditionAdd(paramName).click();
	}

	async removeFilterCondition(paramName: string, index: number) {
		await this.getFilterConditionRemove(paramName, index).click();
	}

	getWebhookTestEvent() {
		return this.container.getByText('Listening for test event');
	}

	async setInvalidExpression(args: {
		fieldName: string;
		invalidExpression?: string;
	}): Promise<void> {
		await this.inlineExpressionEditor.setInvalid(args);
	}

	/**
	 * Opens a resource locator dropdown for a given parameter
	 * @param paramName - The parameter name for the resource locator
	 */
	async openResourceLocator(paramName: string): Promise<void> {
		await this.resourceLocator.open(paramName);
	}
}
