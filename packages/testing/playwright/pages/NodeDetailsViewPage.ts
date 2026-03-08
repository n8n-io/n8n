import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from './BasePage';
import { RunDataPanel } from './components/RunDataPanel';
import { ClipboardHelper } from '../helpers/ClipboardHelper';
import { NodeParameterHelper } from '../helpers/NodeParameterHelper';
import { EditFieldsNode } from './nodes/EditFieldsNode';
import { locatorByIndex } from '../utils/index-helper';

export class NodeDetailsViewPage extends BasePage {
	readonly setupHelper: NodeParameterHelper;
	readonly editFields: EditFieldsNode;
	readonly clipboard: ClipboardHelper;
	readonly inputPanel = new RunDataPanel(this.page.getByTestId('ndv-input-panel'));
	readonly outputPanel = new RunDataPanel(this.page.getByTestId('output-panel'));

	constructor(page: Page) {
		super(page);
		this.setupHelper = new NodeParameterHelper(this);
		this.editFields = new EditFieldsNode(page);
		this.clipboard = new ClipboardHelper(page);
	}

	getNodeCredentialsSelect() {
		return this.page.getByTestId('node-credentials-select');
	}

	credentialDropdownCreateNewCredential() {
		return this.page.getByText('Create new credential');
	}

	getCredentialOptionByText(text: string) {
		return this.page.getByText(text);
	}

	getCredentialDropdownOptions() {
		return this.page.getByRole('option');
	}

	getCredentialSelect() {
		return this.page.getByRole('combobox', { name: 'Select Credential' });
	}

	getCredentialSelectInput() {
		return this.getNodeCredentialsSelect().locator('input');
	}

	async clickBackToCanvasButton() {
		await this.clickByTestId('ndv-close-button');
	}

	getParameterByLabel(labelName: string) {
		return this.getContainer().locator('.parameter-item').filter({ hasText: labelName });
	}

	async fillParameterInput(labelName: string, value: string, index?: number) {
		await locatorByIndex(this.getParameterByLabel(labelName), index)
			.getByTestId('parameter-input-field')
			.fill(value);
	}

	async selectWorkflowResource(createItemText: string, searchText: string = '') {
		await this.clickByTestId('rlc-input');

		if (searchText) {
			await this.fillByTestId('rlc-search', searchText);
		}

		await this.clickByText(createItemText);
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
		return this.page.getByTestId('output-panel');
	}

	getContainer() {
		return this.page.getByTestId('ndv');
	}

	getInputPanel() {
		return this.page.getByTestId('ndv-input-panel');
	}

	getParameterExpressionPreviewValue() {
		return this.page.getByTestId('parameter-expression-preview-value');
	}

	getParameterExpressionPreviewOutput() {
		return this.page.getByTestId('parameter-expression-preview-output');
	}

	getInlineExpressionEditorPreview() {
		return this.page.getByTestId('inline-expression-editor-output');
	}

	async activateParameterExpressionEditor(parameterName: string) {
		const parameterInput = this.getParameterInput(parameterName);
		await parameterInput.click();
		await this.page
			.getByTestId(`${parameterName}-parameter-input-options-container`)
			.getByTestId('radio-button-expression')
			.click();
	}

	getEditPinnedDataButton() {
		return this.page.getByTestId('ndv-edit-pinned-data');
	}

	getRunDataPaneHeader() {
		return this.page.getByTestId('run-data-pane-header');
	}

	getOutputDataContainer() {
		return this.getOutputPanel().getByTestId('ndv-data-container');
	}

	async setPinnedData(data: object | string) {
		const pinnedData = typeof data === 'string' ? data : JSON.stringify(data);
		await this.getEditPinnedDataButton().click();

		const editor = this.outputPanel.get().locator('[contenteditable="true"]');
		await editor.waitFor();
		await editor.click();
		await editor.fill(pinnedData);

		await this.savePinnedData();
	}

	async savePinnedData() {
		await this.getRunDataPaneHeader().locator('button:visible').filter({ hasText: 'Save' }).click();
	}

	getAssignmentCollectionAdd(paramName: string) {
		return this.page
			.getByTestId(`assignment-collection-${paramName}`)
			.getByTestId('assignment-collection-drop-area');
	}

	getAssignmentCollectionDropArea() {
		return this.page.getByTestId('assignment-collection-drop-area');
	}

	async clickAssignmentCollectionDropArea() {
		await this.getAssignmentCollectionDropArea().click();
	}

	getAssignmentValue(paramName: string) {
		return this.page
			.getByTestId(`assignment-collection-${paramName}`)
			.getByTestId('assignment-value');
	}

	/**
	 * Get the inline expression editor input
	 * @param parameterName - The name of the parameter to get the inline expression editor input for. If not set, gets the first inline expression editor input on page
	 * @returns The inline expression editor input
	 */
	getInlineExpressionEditorInput(parameterName?: string) {
		if (parameterName) {
			const parameterInput = this.getParameterInput(parameterName);
			return parameterInput.getByTestId('inline-expression-editor-input');
		}
		return this.page.getByTestId('inline-expression-editor-input');
	}

	getNodeParameters() {
		return this.page.getByTestId('node-parameters');
	}

	getParameterInputHint() {
		return this.page.getByTestId('parameter-input-hint');
	}

	getInputLabel() {
		return this.page.getByTestId('input-label');
	}

	getNthParameter(index: number) {
		return this.getNodeParameters().locator('.parameter-item').nth(index);
	}

	getCredentialsLabel() {
		return this.page.getByTestId('credentials-label');
	}

	async makeWebhookRequest(path: string) {
		return await this.page.request.get(path);
	}

	async clearExpressionEditor(parameterName?: string) {
		const editor = this.getInlineExpressionEditorInput(parameterName);
		await editor.click();
		await this.page.keyboard.press('ControlOrMeta+A');
		await this.page.keyboard.press('Delete');
	}

	async typeInExpressionEditor(text: string, parameterName?: string) {
		const editor = this.getInlineExpressionEditorInput(parameterName);
		await editor.click();
		await editor.type(text);
	}

	getParameterInput(parameterName: string, index?: number) {
		return locatorByIndex(this.page.getByTestId(`parameter-input-${parameterName}`), index);
	}

	getParameterInputField(parameterName: string, index?: number) {
		return this.getParameterInput(parameterName, index).locator('input');
	}

	getParameterEditor(parameterName: string, index?: number) {
		// CodeMirror editor
		return this.getParameterInput(parameterName, index).locator('.cm-content');
	}

	async selectOptionInParameterDropdown(parameterName: string, optionText: string, index = 0) {
		await this.clickParameterDropdown(parameterName, index);
		await this.selectFromVisibleDropdown(optionText);
	}

	async clickParameterDropdown(parameterName: string, index = 0): Promise<void> {
		await locatorByIndex(this.page.getByTestId(`parameter-input-${parameterName}`), index).click();
	}

	async selectFromVisibleDropdown(optionText: string): Promise<void> {
		await this.page.getByRole('option', { name: optionText }).click();
	}

	async fillParameterInputByName(parameterName: string, value: string, index = 0): Promise<void> {
		const input = this.getParameterInputField(parameterName, index);
		await input.click();
		await input.fill(value);
	}

	async clickParameterOptions(): Promise<void> {
		await this.page.getByTestId('collection-parameter-add').click();
	}

	async addParameterOptionByName(optionName: string): Promise<void> {
		await this.clickParameterOptions();
		await this.selectFromVisibleDropdown(optionName);
	}

	async clickFloatingNode(nodeName: string) {
		await this.page.locator(`[data-test-id="floating-node"][data-node-name="${nodeName}"]`).click();
	}

	async executePrevious() {
		await this.clickByTestId('execute-previous-node');
	}

	async clickAskAiTab() {
		await this.page.locator('#tab-ask-ai').click();
	}

	getAskAiTabPanel() {
		return this.page.getByTestId('code-node-tab-ai');
	}

	getAskAiCtaButton() {
		return this.page.getByTestId('ask-ai-cta');
	}

	getAskAiPromptInput() {
		return this.page.getByTestId('ask-ai-prompt-input');
	}

	getAskAiPromptCounter() {
		return this.page.getByTestId('ask-ai-prompt-counter');
	}

	getAskAiCtaTooltipNoInputData() {
		return this.page.getByTestId('ask-ai-cta-tooltip-no-input-data');
	}

	getAskAiCtaTooltipNoPrompt() {
		return this.page.getByTestId('ask-ai-cta-tooltip-no-prompt');
	}

	getAskAiCtaTooltipPromptTooShort() {
		return this.page.getByTestId('ask-ai-cta-tooltip-prompt-too-short');
	}

	getCodeTabPanel() {
		return this.page.getByTestId('code-node-tab-code');
	}

	getCodeTab() {
		return this.page.locator('#tab-code');
	}

	getCodeEditor() {
		return this.getParameterInput('jsCode').locator('.cm-content');
	}

	getLintErrors() {
		return this.getParameterInput('jsCode').locator('.cm-lintRange-error');
	}

	getLintTooltip() {
		return this.page.locator('.cm-tooltip-lint');
	}

	getPlaceholderText(text: string) {
		return this.page.getByText(text);
	}

	getHeyAiText() {
		return this.page.locator('text=Hey AI, generate JavaScript');
	}

	getCodeGenerationCompletedText() {
		return this.page.locator('text=Code generation completed');
	}

	getErrorMessageText(message: string) {
		return this.page.locator(`text=${message}`);
	}

	async setParameterDropdown(parameterName: string, optionText: string): Promise<void> {
		await this.getParameterInput(parameterName).click();

		await this.page.getByRole('option', { name: optionText }).click();
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
		return this.page.getByTestId(`assignment-collection-${paramName}`);
	}

	async selectInputNode(nodeName: string) {
		const inputSelect = this.inputPanel.getNodeInputOptions();
		await inputSelect.click();
		await this.page.getByRole('option', { name: nodeName }).click();
	}

	getAssignmentName(paramName: string, index = 0) {
		return this.getAssignmentCollectionContainer(paramName)
			.getByTestId('assignment')
			.nth(index)
			.getByTestId('assignment-name');
	}

	getResourceMapperFieldsContainer() {
		return this.page.getByTestId('mapping-fields-container');
	}

	getResourceMapperParameterInputs() {
		return this.getResourceMapperFieldsContainer().getByTestId('parameter-input');
	}

	getResourceMapperSelectColumn() {
		return this.page.getByTestId('matching-column-select');
	}

	getResourceMapperColumnsOptionsButton() {
		return this.page.getByTestId('columns-parameter-input-options-container');
	}

	getResourceMapperRemoveFieldButton(fieldName: string) {
		return this.page.getByTestId(`remove-field-button-${fieldName}`);
	}

	getResourceMapperRemoveAllFieldsOption() {
		return this.page.getByTestId('action-removeAllFields');
	}

	async refreshResourceMapperColumns() {
		const selectColumn = this.getResourceMapperSelectColumn();
		await selectColumn.hover();
		await selectColumn.getByTestId('action-toggle').click();
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

	/**
	 * Get the N8nInput container element for a parameter.
	 * Use this for checking border styles since N8nInput has border on container, not input.
	 */
	getParameterInputContainer(parameterName: string) {
		return this.getParameterInput(parameterName).locator('input[type="text"]').locator('..');
	}

	getInlineExpressionEditorContent() {
		return this.getInlineExpressionEditorInput().locator('.cm-content');
	}

	getInlineExpressionEditorOutput() {
		return this.page.getByTestId('inline-expression-editor-output');
	}

	getInlineExpressionEditorItemInput() {
		return this.page.getByTestId('inline-expression-editor-item-input').locator('input');
	}

	getInlineExpressionEditorItemPrevButton() {
		return this.page.getByTestId('inline-expression-editor-item-prev');
	}

	getInlineExpressionEditorItemNextButton() {
		return this.page.getByTestId('inline-expression-editor-item-next');
	}

	async expressionSelectNextItem() {
		await this.getInlineExpressionEditorItemNextButton().click();
	}

	async expressionSelectPrevItem() {
		await this.getInlineExpressionEditorItemPrevButton().click();
	}

	async openExpressionEditorModal(parameterName: string) {
		await this.activateParameterExpressionEditor(parameterName);
		const parameter = this.getParameterInput(parameterName);
		await parameter.click();
		const expander = parameter.getByTestId('expander');
		await expander.click();

		await this.page.getByTestId('expression-modal-input').waitFor({ state: 'visible' });
	}

	getExpressionEditorModalInput() {
		return this.page.getByTestId('expression-modal-input').getByRole('textbox');
	}

	async fillExpressionEditorModalInput(text: string) {
		const input = this.getExpressionEditorModalInput();
		await input.clear();
		await input.click();
		await input.fill(text);
	}

	getExpressionEditorModalOutput() {
		return this.page.getByTestId('expression-modal-output');
	}

	getAddFieldToSortByButton() {
		return this.getNodeParameters().getByText('Add Field To Sort By');
	}

	async toggleCodeMode(switchTo: 'Run Once for Each Item' | 'Run Once for All Items') {
		await this.getParameterInput('mode').click();
		await this.page.getByRole('option', { name: switchTo }).click();
		// eslint-disable-next-line playwright/no-wait-for-timeout
		await this.page.waitForTimeout(2500);
	}

	getOutputPagination() {
		return this.outputPanel.get().getByTestId('ndv-data-pagination');
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
		return this.page.getByTestId('run-data-callout');
	}

	async checkParameterCheckboxInputByName(name: string): Promise<void> {
		const checkbox = this.getParameterInput(name).locator('.el-switch.switch-input');
		await checkbox.click();
	}

	// Credentials modal helpers
	async clickCreateNewCredential(eq: number = 0): Promise<void> {
		await this.page.getByTestId('node-credentials-select').nth(eq).click();
		await this.page.getByTestId('node-credentials-select-item-new').nth(eq).click();
	}

	// Run selector and linking helpers
	getInputRunSelector() {
		return this.page.locator('[data-test-id="ndv-input-panel"] [data-test-id="run-selector"]');
	}

	getOutputRunSelector() {
		return this.page.locator('[data-test-id="output-panel"] [data-test-id="run-selector"]');
	}

	getInputRunSelectorInput() {
		return this.getInputRunSelector().locator('input');
	}

	async toggleInputRunLinking(): Promise<void> {
		await this.getInputPanel().getByTestId('link-run').click();
	}

	getNodeRunErrorMessage() {
		return this.page.getByTestId('node-error-message');
	}

	getNodeRunErrorDescription() {
		return this.page.getByTestId('node-error-description');
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
		await this.page.getByRole('option', { name: value }).click();
	}

	async changeOutputRunSelector(value: string) {
		const selector = this.outputPanel.getRunSelector();
		await selector.click();
		await this.page.getByRole('option', { name: value }).click();
	}

	async getInputRunSelectorValue() {
		return await this.inputPanel.getRunSelectorInput().inputValue();
	}

	async getOutputRunSelectorValue() {
		return await this.outputPanel.getRunSelectorInput().inputValue();
	}

	getExecuteNodeButton() {
		return this.page.getByTestId('node-execute-button');
	}

	getTriggerPanelExecuteButton() {
		return this.page.getByTestId('trigger-execute-button');
	}

	async openCodeEditorFullscreen() {
		await this.page.getByTestId('code-editor-fullscreen-button').click();
	}

	getCodeEditorFullscreen() {
		return this.page.getByTestId('code-editor-fullscreen').locator('.cm-content');
	}

	getCodeEditorDialog() {
		return this.page.locator('.el-dialog');
	}

	async closeCodeEditorDialog() {
		await this.getCodeEditorDialog().locator('.el-dialog__close').click();
	}

	getNodeRunSuccessIndicator() {
		return this.page.getByTestId('node-run-status-success');
	}

	getNodeRunErrorIndicator() {
		return this.page.getByTestId('node-run-status-danger');
	}

	getNodeRunTooltipIndicator() {
		return this.page.getByTestId('node-run-info');
	}

	getStaleNodeIndicator() {
		return this.page.getByTestId('node-run-info-stale');
	}

	getExecuteStepButton() {
		return this.page.getByTestId('node-execute-button');
	}

	async clickExecuteStep() {
		await this.getExecuteStepButton().click();
	}

	async openSettings() {
		await this.page.getByTestId('tab-settings').click();
	}

	getNodeVersion() {
		return this.page.getByTestId('node-version');
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
		return this.page.locator(`[data-node-placement="${position}"]`);
	}

	getNodeNameContainer() {
		return this.getContainer().getByTestId('node-title-container');
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
		return this.page.getByTestId(`add-subnode-${connectionType}-${index}`);
	}

	getNodesWithIssues() {
		return this.page.locator('[class*="hasIssues"]');
	}

	async connectAISubNode(connectionType: string, nodeName: string, index: number = 0) {
		await this.getAddSubNodeButton(connectionType, index).click();
		await this.page.getByText(nodeName).click();
		await this.getFloatingNode().click();
	}

	getFloatingNode() {
		return this.page.getByTestId('floating-node');
	}

	async addItemToFixedCollection(collectionName: string) {
		await this.page.getByTestId(`fixed-collection-${collectionName}`).click();
	}

	getFixedCollectionPropertyPicker(index?: number) {
		const pickers = this.getNodeParameters().getByTestId('fixed-collection-add-property');
		return index !== undefined ? pickers.nth(index) : pickers.first();
	}

	async addFixedCollectionProperty(propertyName: string, index?: number) {
		const picker = this.getFixedCollectionPropertyPicker(index);
		await picker.locator('input').click();
		await this.page.getByRole('option', { name: propertyName, exact: true }).click();
	}

	getParameterItemWithText(text: string) {
		return this.page.getByTestId('parameter-item').getByText(text);
	}

	getParameterInputWithIssues(parameterPath: string) {
		return this.page.locator(
			`[data-test-id="parameter-input-field"][title*="${parameterPath}"][title*="has issues"]`,
		);
	}

	getResourceLocator(paramName: string) {
		return this.page.getByTestId(`resource-locator-${paramName}`);
	}

	getResourceLocatorInput(paramName: string) {
		return this.getResourceLocator(paramName).getByTestId('rlc-input-container');
	}

	getResourceLocatorModeSelector(paramName: string) {
		return this.getResourceLocator(paramName).getByTestId('rlc-mode-selector');
	}

	getResourceLocatorModeSelectorInput(paramName: string) {
		return this.getResourceLocatorModeSelector(paramName).locator('input');
	}

	getResourceLocatorErrorMessage(paramName: string) {
		return this.getResourceLocator(paramName).getByTestId('rlc-error-container');
	}

	getResourceLocatorAddCredentials(paramName: string) {
		return this.getResourceLocatorErrorMessage(paramName).locator('a');
	}

	getResourceLocatorSearch(paramName: string) {
		return this.getResourceLocator(paramName).getByTestId('rlc-search');
	}

	getParameterInputIssues() {
		return this.page.getByTestId('parameter-issues');
	}

	getResourceLocatorItems() {
		return this.page.getByTestId('rlc-item');
	}

	getAddResourceItem() {
		return this.page.getByTestId('rlc-item-add-resource');
	}

	getExpressionModeToggle(index: number = 1) {
		return this.page.getByTestId('radio-button-expression').nth(index);
	}

	async setRLCValue(paramName: string, value: string, index = 0): Promise<void> {
		await this.getResourceLocatorModeSelector(paramName).click();
		await this.page.getByTestId('mode-id').nth(index).click();
		const input = this.getResourceLocatorInput(paramName).locator('input');
		await input.fill(value);
	}

	async clickNodeCreatorInsertOneButton() {
		await this.page.getByText('Insert one').click();
	}

	getInputSelect() {
		return this.page.getByTestId('ndv-input-select').locator('input');
	}

	getOutputRunSelectorInput() {
		return this.getOutputPanel().locator('[data-test-id="run-selector"] input');
	}

	getAiOutputModeToggle() {
		return this.page.getByTestId('ai-output-mode-select');
	}

	getCredentialLabel(credentialType: string) {
		return this.page.getByText(credentialType);
	}

	getFilterComponent(paramName: string) {
		return this.page.getByTestId(`filter-${paramName}`);
	}

	getFilterConditions(paramName: string) {
		return this.getFilterComponent(paramName).getByTestId('filter-condition');
	}

	getFilterConditionLeft(paramName: string, index: number = 0) {
		return this.getFilterComponent(paramName).getByTestId('filter-condition-left').nth(index);
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
		return this.page.getByText('Listening for test event');
	}

	getAddOptionDropdown() {
		return this.page.getByRole('combobox', { name: 'Add option' });
	}

	async setInvalidExpression({
		fieldName,
		invalidExpression,
	}: {
		fieldName: string;
		invalidExpression?: string;
	}): Promise<void> {
		await this.activateParameterExpressionEditor(fieldName);
		const editor = this.getInlineExpressionEditorInput(fieldName);
		await editor.click();
		await this.page.keyboard.type(invalidExpression ?? '{{ =()');
	}

	/**
	 * Opens a resource locator dropdown for a given parameter
	 * @param paramName - The parameter name for the resource locator
	 */
	async openResourceLocator(paramName: string): Promise<void> {
		await this.getResourceLocator(paramName).waitFor({ state: 'visible' });
		await this.getResourceLocatorInput(paramName).click();
	}
}
