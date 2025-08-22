import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from './BasePage';
import { NodeParameterHelper } from '../helpers/NodeParameterHelper';

export class NodeDetailsViewPage extends BasePage {
	readonly setupHelper: NodeParameterHelper;

	constructor(page: Page) {
		super(page);
		this.setupHelper = new NodeParameterHelper(this);
	}

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

	getInlineExpressionEditorInput() {
		return this.page.getByTestId('inline-expression-editor-input');
	}

	getNodeParameters() {
		return this.page.getByTestId('node-parameters');
	}

	getParameterInputHint() {
		return this.page.getByTestId('parameter-input-hint');
	}

	async makeWebhookRequest(
		path: string,
		options?: {
			method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
			data?: unknown;
			headers?: Record<string, string>;
			auth?: { user: string; pass: string };
			failOnStatusCode?: boolean;
		},
	) {
		const { method = 'GET', data, headers, auth, failOnStatusCode = true } = options ?? {};

		const requestOptions: Parameters<typeof this.page.request.fetch>[1] = {
			method,
			headers,
			failOnStatusCode,
		};

		if (data) {
			requestOptions.data = data;
		}

		if (auth) {
			requestOptions.headers = {
				...requestOptions.headers,
				Authorization: `Basic ${Buffer.from(`${auth.user}:${auth.pass}`).toString('base64')}`,
			};
		}

		return await this.page.request.fetch(path, requestOptions);
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
	 * Get parameter input field
	 * @param parameterName - The name of the parameter
	 */
	getParameterInputField(parameterName: string) {
		return this.getParameterInput(parameterName).getByTestId('parameter-input-field');
	}

	/**
	 * Select option in parameter dropdown (improved with Playwright best practices)
	 * @param parameterName - The parameter name
	 * @param optionText - The text of the option to select
	 */
	async selectOptionInParameterDropdown(parameterName: string, optionText: string) {
		const dropdown = this.getParameterInput(parameterName);
		await dropdown.click();

		// Wait for dropdown to be visible and select option - following Playwright best practices
		await this.page.getByRole('option', { name: optionText }).click();
	}

	/**
	 * Click parameter dropdown by name (test-id based selector)
	 * @param parameterName - The parameter name e.g 'httpMethod', 'authentication'
	 */
	async clickParameterDropdown(parameterName: string): Promise<void> {
		await this.clickByTestId(`parameter-input-${parameterName}`);
	}

	/**
	 * Select option from visible dropdown using Playwright role-based selectors
	 * This follows the pattern used in working n8n tests
	 * @param optionText - The text of the option to select
	 */
	async selectFromVisibleDropdown(optionText: string): Promise<void> {
		// Use Playwright's role-based selector - this is more reliable than CSS selectors
		await this.page.getByRole('option', { name: optionText }).click();
	}

	/**
	 * Fill parameter input field by parameter name
	 * @param parameterName - The parameter name e.g 'path', 'url'
	 * @param value - The value to fill
	 */
	async fillParameterInputByName(parameterName: string, value: string): Promise<void> {
		const input = this.getParameterInputField(parameterName);
		await input.click();
		await input.fill(value);
	}

	/**
	 * Click parameter options expansion (e.g. for Response Code)
	 */
	async clickParameterOptions(): Promise<void> {
		await this.page.locator('.param-options').click();
	}

	/**
	 * Get visible Element UI popper (dropdown/popover)
	 * Ported from Cypress pattern with Playwright selectors
	 */
	getVisiblePopper() {
		return this.page
			.locator('.el-popper')
			.filter({ hasNot: this.page.locator('[aria-hidden="true"]') });
	}

	/**
	 * Wait for parameter dropdown to be visible and ready for interaction
	 * @param parameterName - The parameter name
	 */
	async waitForParameterDropdown(parameterName: string): Promise<void> {
		const dropdown = this.getParameterInput(parameterName);
		await dropdown.waitFor({ state: 'visible' });
		await expect(dropdown).toBeEnabled();
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

	async setParameterDropdown(parameterName: string, optionText: string): Promise<void> {
		await this.getParameterInput(parameterName).click();
		await this.page.getByRole('option', { name: optionText }).click();
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
				// Fallback for unknown types
				return (await this.getParameterInput(parameterName).textContent()) ?? '';
		}
	}

	/**
	 * Get value from a text parameter - simplified approach
	 */
	private async getTextParameterValue(parameterName: string): Promise<string> {
		const parameterContainer = this.getParameterInput(parameterName);
		const input = parameterContainer.locator('input').first();
		return await input.inputValue();
	}

	/**
	 * Get value from a dropdown parameter
	 */
	private async getDropdownParameterValue(parameterName: string): Promise<string> {
		const selectedOption = this.getParameterInput(parameterName).locator('.el-select__tags-text');
		return (await selectedOption.textContent()) ?? '';
	}

	/**
	 * Get value from a switch parameter
	 */
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

	// ===== EDIT FIELDS HELPER METHODS =====

	// Basic selectors
	getAssignmentCollectionContainer(paramName: string) {
		return this.page.getByTestId(`assignment-collection-${paramName}`);
	}

	getAssignmentCollectionAddButton(paramName: string) {
		return this.getAssignmentCollectionContainer(paramName).getByTestId(
			'assignment-collection-drop-area',
		);
	}

	getAssignment(paramName: string, index = 0) {
		return this.getAssignmentCollectionContainer(paramName).getByTestId('assignment').nth(index);
	}

	getAssignmentName(paramName: string, index = 0) {
		return this.getAssignment(paramName, index).getByTestId('assignment-name');
	}

	getAssignmentType(paramName: string, index = 0) {
		return this.getAssignment(paramName, index).getByTestId('assignment-type-select');
	}

	getAssignmentValue(paramName: string, index = 0) {
		return this.getAssignment(paramName, index).getByTestId('assignment-value');
	}

	// Main configuration methods
	/**
	 * Sets multiple fields in Edit Fields node
	 * @param fields Array of field configurations with name, type, and value
	 * @param paramName Parameter name for the assignment collection (default: 'assignments')
	 */
	async setEditFieldsValues(
		fields: Array<{
			name: string;
			type: 'string' | 'number' | 'boolean' | 'array' | 'object';
			value: string | number | boolean;
		}>,
		paramName = 'assignments',
	): Promise<void> {
		for (let i = 0; i < fields.length; i++) {
			const field = fields[i];

			// Add a new field if this isn't the first one
			if (i > 0) {
				await this.getAssignmentCollectionAddButton(paramName).click();
			} else {
				// For the first field, ensure we have at least one field
				const existingFields = await this.getAssignmentCollectionContainer(paramName)
					.getByTestId('assignment')
					.count();
				if (existingFields === 0) {
					await this.getAssignmentCollectionAddButton(paramName).click();
				}
			}

			// Set field name
			const nameInput = this.getAssignmentName(paramName, i).locator('input');
			await nameInput.fill(field.name);
			await nameInput.blur();

			// Set field type
			await this.getAssignmentType(paramName, i).click();
			const typeOptionText = this.getTypeOptionText(field.type);
			await this.page.getByRole('option', { name: typeOptionText }).click();

			// Set field value based on type
			await this.setFieldValue(paramName, i, field.type, field.value);
		}
	}

	async setEditFieldValue(
		name: string,
		type: 'string' | 'number' | 'boolean' | 'array' | 'object',
		value: string | number | boolean,
		paramName = 'assignments',
	): Promise<void> {
		await this.setEditFieldsValues([{ name, type, value }], paramName);
	}

	// Private helper methods
	private getTypeOptionText(type: string): string {
		const typeMap: Record<string, string> = {
			string: 'String',
			number: 'Number',
			boolean: 'Boolean',
			array: 'Array',
			object: 'Object',
		};
		return typeMap[type] || 'String';
	}

	private async setFieldValue(
		paramName: string,
		index: number,
		type: string,
		value: string | number | boolean,
	): Promise<void> {
		const valueContainer = this.getAssignmentValue(paramName, index);

		switch (type) {
			case 'string':
			case 'number':
			case 'array':
			case 'object': {
				const input = valueContainer.locator('input, textarea, [contenteditable]').first();
				await input.fill(String(value));
				break;
			}
			case 'boolean': {
				await valueContainer.click();
				const booleanValue = value ? 'True' : 'False';
				await this.page.getByRole('option', { name: booleanValue }).click();
				break;
			}
		}
	}

	// Advanced selectors by field name
	/**
	 * Finds assignment element by field name instead of index
	 * Loops through all assignments to find one with matching field name
	 * @throws Error if field name is not found
	 */
	async getAssignmentByFieldName(paramName = 'assignments', fieldName: string) {
		const assignments = this.getAssignmentCollectionContainer(paramName).getByTestId('assignment');
		const count = await assignments.count();

		for (let i = 0; i < count; i++) {
			const nameInput = this.getAssignmentName(paramName, i).locator('input');
			const currentValue = await nameInput.inputValue();
			if (currentValue === fieldName) {
				return this.getAssignment(paramName, i);
			}
		}

		throw new Error(`Field with name "${fieldName}" not found in assignments`);
	}

	async getAssignmentNameByFieldName(paramName = 'assignments', fieldName: string) {
		const assignment = await this.getAssignmentByFieldName(paramName, fieldName);
		return assignment.getByTestId('assignment-name');
	}

	async getAssignmentTypeByFieldName(paramName = 'assignments', fieldName: string) {
		const assignment = await this.getAssignmentByFieldName(paramName, fieldName);
		return assignment.getByTestId('assignment-type-select');
	}

	async getAssignmentValueByFieldName(paramName = 'assignments', fieldName: string) {
		const assignment = await this.getAssignmentByFieldName(paramName, fieldName);
		return assignment.getByTestId('assignment-value');
	}

	// Utility methods
	async getAssignmentFieldNames(paramName = 'assignments'): Promise<string[]> {
		const assignments = this.getAssignmentCollectionContainer(paramName).getByTestId('assignment');
		const count = await assignments.count();
		const fieldNames: string[] = [];

		for (let i = 0; i < count; i++) {
			const nameInput = this.getAssignmentName(paramName, i).locator('input');
			const value = await nameInput.inputValue();
			fieldNames.push(value);
		}

		return fieldNames;
	}

	async hasAssignmentField(paramName = 'assignments', fieldName: string): Promise<boolean> {
		try {
			await this.getAssignmentByFieldName(paramName, fieldName);
			return true;
		} catch {
			return false;
		}
	}
}
