import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from './BasePage';
import { RunDataPanel } from './components/RunDataPanel';
import { NodeParameterHelper } from '../helpers/NodeParameterHelper';
import { EditFieldsNode } from './nodes/EditFieldsNode';
import { locatorByIndex } from '../utils/index-helper';

export class NodeDetailsViewPage extends BasePage {
	readonly setupHelper: NodeParameterHelper;
	readonly editFields: EditFieldsNode;
	readonly inputPanel = new RunDataPanel(this.page.getByTestId('ndv-input-panel'));
	readonly outputPanel = new RunDataPanel(this.page.getByTestId('output-panel'));

	constructor(page: Page) {
		super(page);
		this.setupHelper = new NodeParameterHelper(this);
		this.editFields = new EditFieldsNode(page);
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

	async clickBackToCanvasButton() {
		await this.clickByTestId('back-to-canvas');
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

	getOutputTable() {
		return this.getOutputPanel().getByTestId('ndv-data-container').locator('table');
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

	async pastePinnedData(data: object) {
		await this.getEditPinnedDataButton().click();

		const editor = this.outputPanel.get().locator('[contenteditable="true"]');
		await editor.waitFor();
		await editor.click();
		await editor.fill('');

		await this.page.evaluate(async (jsonData) => {
			await navigator.clipboard.writeText(JSON.stringify(jsonData));
		}, data);
		await this.page.keyboard.press('ControlOrMeta+V');

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

	async makeWebhookRequest(path: string) {
		return await this.page.request.get(path);
	}

	getWebhookUrl() {
		return this.page.locator('.webhook-url').textContent();
	}

	getVisiblePoppers() {
		return this.page.locator('.el-popper:visible');
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
		await this.page.locator('.param-options').click();
	}

	async addParameterOptionByName(optionName: string): Promise<void> {
		await this.clickParameterOptions();
		await this.selectFromVisibleDropdown(optionName);
	}

	getVisiblePopper() {
		return this.page.locator('.el-popper:visible');
	}

	async waitForParameterDropdown(parameterName: string): Promise<void> {
		const dropdown = this.getParameterInput(parameterName);
		await dropdown.waitFor({ state: 'visible' });
		await expect(dropdown).toBeEnabled();
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

	async setMultipleParameters(
		parameters: Record<string, string | number | boolean>,
	): Promise<void> {
		for (const [parameterName, value] of Object.entries(parameters)) {
			if (typeof value === 'string') {
				const parameterType = await this.setupHelper.detectParameterType(parameterName);
				if (parameterType === 'dropdown') {
					await this.setParameterDropdown(parameterName, value);
				} else {
					await this.setParameterInput(parameterName, value);
				}
			} else if (typeof value === 'boolean') {
				await this.setParameterSwitch(parameterName, value);
			} else if (typeof value === 'number') {
				await this.setParameterInput(parameterName, value.toString());
			}
		}
	}

	async getParameterValue(parameterName: string): Promise<string> {
		const parameterType = await this.setupHelper.detectParameterType(parameterName);

		switch (parameterType) {
			case 'text':
				return await this.getTextParameterValue(parameterName);
			case 'dropdown':
				return await this.getDropdownParameterValue(parameterName);
			case 'switch':
				return await this.getSwitchParameterValue(parameterName);
			default:
				return (await this.getParameterInput(parameterName).textContent()) ?? '';
		}
	}

	private async getTextParameterValue(parameterName: string): Promise<string> {
		const parameterContainer = this.getParameterInput(parameterName);
		const input = parameterContainer.locator('input').first();
		return await input.inputValue();
	}

	private async getDropdownParameterValue(parameterName: string): Promise<string> {
		const selectedOption = this.getParameterInput(parameterName).locator('.el-select__tags-text');
		return (await selectedOption.textContent()) ?? '';
	}

	private async getSwitchParameterValue(parameterName: string): Promise<string> {
		const switchElement = this.getParameterInput(parameterName).locator('.el-switch');
		const isEnabled = (await switchElement.getAttribute('aria-checked')) === 'true';
		return isEnabled ? 'true' : 'false';
	}

	async validateParameter(parameterName: string, expectedValue: string): Promise<void> {
		const actualValue = await this.getParameterValue(parameterName);
		if (actualValue !== expectedValue) {
			throw new Error(
				`Parameter ${parameterName} has value "${actualValue}", expected "${expectedValue}"`,
			);
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

	getInputTableHeader(index: number = 0) {
		return this.getInputPanel().locator('table th').nth(index);
	}

	getInputTbodyCell(row: number, col: number) {
		return this.getInputPanel().locator('table tbody tr').nth(row).locator('td').nth(col);
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

	getCollectionAddOptionSelect() {
		return this.getNodeParameters().getByTestId('collection-add-option-select');
	}

	getParameterSwitch(parameterName: string) {
		return this.getParameterInput(parameterName).locator('.el-switch');
	}

	getParameterTextInput(parameterName: string) {
		return this.getParameterInput(parameterName).locator('input[type="text"]');
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

	async typeIntoParameterInput(parameterName: string, content: string): Promise<void> {
		const input = this.getParameterInput(parameterName);
		await input.type(content);
	}

	getInputTable() {
		return this.getInputPanel().locator('table');
	}

	getInputTableCellSpan(row: number, col: number, dataName: string) {
		return this.getInputTbodyCell(row, col).locator(`span[data-name="${dataName}"]`).first();
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

	async getCurrentOutputPage(): Promise<number> {
		const activePage = this.getOutputPagination().locator('.el-pager li.is-active').first();
		const pageText = await activePage.textContent();
		return parseInt(pageText ?? '1', 10);
	}

	async setParameterInputValue(parameterName: string, value: string): Promise<void> {
		const input = this.getParameterInput(parameterName).locator('input');
		await input.clear();
		await input.fill(value);
	}

	async clickGetBackToCanvas(): Promise<void> {
		await this.clickBackToCanvasButton();
	}

	getRunDataInfoCallout() {
		return this.page.getByTestId('run-data-callout');
	}

	getOutputPanelTable() {
		return this.getOutputTable();
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

	async expandSchemaItem(itemText: string) {
		const item = this.outputPanel.getSchemaItem(itemText);
		await item.locator('.toggle').click();
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

	getWebhookTriggerListening() {
		return this.page.getByTestId('trigger-listening');
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
		return this.page.getByRole('button').filter({ hasText: 'Execute step' });
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
		const searchInput = this.outputPanel.getSearchInput();
		await searchInput.click();
		await searchInput.fill(searchTerm);
	}

	async searchInputData(searchTerm: string) {
		const searchInput = this.inputPanel.getSearchInput();
		await searchInput.click();
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

	getSubNodeConnectionGroup(connectionType: string, index: number = 0) {
		return this.page.getByTestId(`subnode-connection-group-${connectionType}-${index}`);
	}

	getFloatingSubNodes(connectionType: string, index: number = 0) {
		return this.getSubNodeConnectionGroup(connectionType, index).getByTestId('floating-subnode');
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

	async getNodesWithIssuesCount() {
		return await this.getNodesWithIssues().count();
	}

	async addItemToFixedCollection(collectionName: string) {
		await this.page.getByTestId(`fixed-collection-${collectionName}`).click();
	}

	async clickParameterItemAction(actionText: string) {
		await this.page.getByTestId('parameter-item').getByText(actionText).click();
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

	async setRLCValue(paramName: string, value: string): Promise<void> {
		await this.getResourceLocatorModeSelector(paramName).click();

		const visibleOptions = this.page.locator('.el-popper:visible .el-select-dropdown__item');
		await visibleOptions.last().click();

		const input = this.getResourceLocatorInput(paramName).locator('input');
		await input.fill(value);
	}

	async clickNodeCreatorInsertOneButton() {
		await this.page.getByText('Insert one').click();
	}

	getInputSelect() {
		return this.page.getByTestId('ndv-input-select').locator('input');
	}

	getInputTableRows() {
		return this.getInputTable().locator('tr');
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

	getFilterCondition(paramName: string, index: number = 0) {
		return this.getFilterComponent(paramName).getByTestId('filter-condition').nth(index);
	}

	getFilterConditionLeft(paramName: string, index: number = 0) {
		return this.getFilterComponent(paramName).getByTestId('filter-condition-left').nth(index);
	}

	getFilterConditionRight(paramName: string, index: number = 0) {
		return this.getFilterComponent(paramName).getByTestId('filter-condition-right').nth(index);
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

	/**
	 * Adds an optional parameter from a collection dropdown
	 * @param optionDisplayName - The display name of the option to add (e.g., 'Response Code')
	 * @param parameterName - The parameter name to set after adding (e.g., 'responseCode')
	 * @param parameterValue - The value to set for the parameter
	 */
	async setOptionalParameter(
		optionDisplayName: string,
		parameterName: string,
		parameterValue: string | boolean,
	): Promise<void> {
		await this.getAddOptionDropdown().click();

		// Step 2: Select the option by display name
		await this.page.getByRole('option', { name: optionDisplayName }).click();

		// Step 3: Set the parameter value
		await this.setupHelper.setParameter(parameterName, parameterValue);
	}
}
