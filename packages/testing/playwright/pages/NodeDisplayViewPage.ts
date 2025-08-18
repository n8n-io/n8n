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

	getParameterExpressionPreviewValue() {
		return this.page.getByTestId('parameter-expression-preview-value');
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
