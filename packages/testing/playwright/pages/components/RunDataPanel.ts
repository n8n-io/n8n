import type { Locator } from '@playwright/test';

/**
 * Page object for the run data view with configurable root element.
 *
 * @example
 * // Include in a page
 * class ExamplePage {
 *   readonly runDataPanel = new RunDataPanel(this.page.getByTestId('run-data'));
 * }
 *
 * // Usage in a test
 * await n8n.example.runDataPanel.getRunSelector().click();
 */
export class RunDataPanel {
	constructor(private root: Locator) {}

	get() {
		return this.root;
	}

	getRunSelector() {
		return this.root.getByTestId('run-selector');
	}

	getRunSelectorInput() {
		return this.root.locator('[data-test-id="run-selector"] input');
	}

	getItemsCount() {
		return this.root.getByTestId('ndv-items-count');
	}

	getSearchInput() {
		return this.root.getByTestId('ndv-search');
	}

	getDataContainer() {
		return this.root.getByTestId('ndv-data-container');
	}

	getPinDataButton() {
		return this.root.getByTestId('ndv-pin-data');
	}

	getTable() {
		return this.root.locator('table');
	}

	getTableHeaders() {
		return this.root.locator('table th');
	}

	getTableHeader(index: number) {
		return this.root.locator('table th').nth(index);
	}

	getTableRows() {
		return this.root.locator('tr');
	}

	getTableRow(index: number) {
		return this.root.locator('tr').nth(index);
	}

	getTbodyCell(row: number, col: number) {
		return this.root.locator('table tbody tr').nth(row).locator('td').nth(col);
	}

	getTableCellSpan(row: number, col: number, dataName: string) {
		return this.getTbodyCell(row, col).locator(`span[data-name="${dataName}"]`).first();
	}

	getJsonDataContainer() {
		return this.root.locator('.json-data');
	}

	getJsonProperty(propertyName: string) {
		return this.root
			.locator('.json-data')
			.locator('span')
			.filter({ hasText: new RegExp(`^"${propertyName}"$`) })
			.first();
	}

	getJsonPropertyContaining(text: string) {
		return this.root
			.locator('.json-data')
			.locator('span')
			.filter({ hasText: `"${text}"` })
			.first();
	}

	getSchemaItems() {
		return this.root.getByTestId('run-data-schema-item');
	}

	getSchemaItem(text: string) {
		return this.getSchemaItems().filter({ hasText: text }).first();
	}

	getSchemaItemText(text: string) {
		return this.getSchemaItems().locator('span').filter({ hasText: text }).first();
	}

	getNodeInputOptions() {
		return this.root.getByTestId('ndv-input-select');
	}

	getLinkRun() {
		return this.root.getByTestId('link-run');
	}

	getRelatedExecutionLink() {
		return this.root.getByTestId('related-execution-link');
	}

	getNodeErrorMessageHeader(): Locator {
		return this.root.getByTestId('node-error-message');
	}

	async toggleInputRunLinking() {
		await this.root.getByTestId('link-run').click();
	}

	async switchDisplayMode(mode: 'table' | 'ai' | 'json' | 'schema' | 'binary'): Promise<void> {
		await this.root.getByTestId(`radio-button-${mode}`).click();
	}
}
