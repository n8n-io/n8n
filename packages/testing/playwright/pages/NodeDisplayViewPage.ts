import { BasePage } from './BasePage';

export class NodeDisplayViewPage extends BasePage {
	async clickBackToCanvasButton() {
		await this.clickByTestId('back-to-canvas');
	}

	getParameterByLabel(labelName: string) {
		return this.page.locator('.parameter-item').filter({ hasText: labelName });
	}

	/**
	 * Fill a parameter input field
	 * @param labelName - The label of the parameter e.g URL
	 * @param value - The value to fill in the input field e.g https://foo.bar
	 */
	async fillParameterInput(labelName: string, value: string) {
		await this.getParameterByLabel(labelName).getByTestId('parameter-input-field').fill(value);
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

	getEditPinnedDataButton() {
		return this.page.getByTestId('ndv-edit-pinned-data');
	}

	getPinDataButton() {
		return this.getOutputPanel().getByTestId('ndv-pin-data');
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

	getOutputTableRows() {
		return this.getOutputTable().locator('tr');
	}

	getOutputTableHeaders() {
		return this.getOutputTable().locator('thead th');
	}

	getOutputTableRow(row: number) {
		return this.getOutputTableRows().nth(row);
	}

	getOutputTableCell(row: number, col: number) {
		return this.getOutputTableRow(row).locator('td').nth(col);
	}

	getOutputTbodyCell(row: number, col: number) {
		return this.getOutputTableRow(row).locator('td').nth(col);
	}

	// Pin data operations
	async setPinnedData(data: object | string) {
		const pinnedData = typeof data === 'string' ? data : JSON.stringify(data);
		await this.getEditPinnedDataButton().click();

		// Wait for editor to appear and use broader selector
		const editor = this.getOutputPanel().locator('[contenteditable="true"]');
		await editor.waitFor();
		await editor.click();
		await editor.fill(pinnedData);

		await this.savePinnedData();
	}

	async pastePinnedData(data: object) {
		await this.getEditPinnedDataButton().click();

		const editor = this.getOutputPanel().locator('[contenteditable="true"]');
		await editor.waitFor();
		await editor.click();
		await editor.fill('');

		// Set clipboard data and paste
		await this.page.evaluate(async (jsonData) => {
			await navigator.clipboard.writeText(JSON.stringify(jsonData));
		}, data);
		await this.page.keyboard.press('ControlOrMeta+V');

		await this.savePinnedData();
	}

	async savePinnedData() {
		await this.getRunDataPaneHeader().locator('button:visible').filter({ hasText: 'Save' }).click();
	}

	// Assignment collection methods for advanced tests
	getAssignmentCollectionAdd(paramName: string) {
		return this.page
			.getByTestId(`assignment-collection-${paramName}`)
			.getByTestId('assignment-collection-drop-area');
	}

	getAssignmentValue(paramName: string) {
		return this.page
			.getByTestId(`assignment-collection-${paramName}`)
			.getByTestId('assignment-value');
	}

	getInlineExpressionEditorInput() {
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

	getVisiblePoppers() {
		return this.page.locator('.el-popper:visible');
	}

	async clearExpressionEditor() {
		const editor = this.getInlineExpressionEditorInput();
		await editor.click();
		await this.page.keyboard.press('ControlOrMeta+A');
		await this.page.keyboard.press('Delete');
	}

	async typeInExpressionEditor(text: string) {
		const editor = this.getInlineExpressionEditorInput();
		await editor.click();
		// We have to use type() instead of fill() because the editor is a CodeMirror editor
		await editor.type(text);
	}

	/**
	 * Get parameter input by name (for Code node and similar)
	 * @param parameterName - The name of the parameter e.g 'jsCode', 'mode'
	 */
	getParameterInput(parameterName: string) {
		return this.page.getByTestId(`parameter-input-${parameterName}`);
	}

	/**
	 * Select option in parameter dropdown
	 * @param parameterName - The parameter name
	 * @param optionText - The text of the option to select
	 */
	async selectOptionInParameterDropdown(parameterName: string, optionText: string) {
		const dropdown = this.getParameterInput(parameterName);
		await dropdown.click();
		await this.page.getByRole('option', { name: optionText }).click();
	}

	/**
	 * Click on a floating node in the NDV (for switching between connected nodes)
	 * @param nodeName - The name of the node to click
	 */
	async clickFloatingNode(nodeName: string) {
		await this.page.locator(`[data-test-id="floating-node"][data-node-name="${nodeName}"]`).click();
	}

	/**
	 * Execute the previous node (useful for providing input data)
	 */
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
}
