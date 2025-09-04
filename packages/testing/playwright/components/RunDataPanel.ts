import type { Locator } from '@playwright/test';

export class RunDataPanel {
	constructor(private root: Locator) {}

	getRunSelectorInput() {
		return this.root.locator('[data-test-id="run-selector"] input');
	}

	getItemsCount() {
		return this.root.getByTestId('ndv-items-count');
	}

	getSearchInput() {
		return this.root.getByTestId('ndv-search');
	}

	getTable() {
		return this.root.locator('table');
	}

	getTableHeader(index: number = 0) {
		return this.root.locator('table th').nth(index);
	}

	getTableRows() {
		return this.root.locator('tr');
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

	getSchemaItem(text: string) {
		return this.root
			.getByTestId('run-data-schema-item')
			.locator('span')
			.filter({ hasText: new RegExp(`^${text}$`) })
			.first();
	}

	getNodeInputOptions() {
		return this.root.getByTestId('ndv-input-select');
	}

	getRunSelector() {
		return this.root.getByTestId('run-selector');
	}

	getLinkRun() {
		return this.root.getByTestId('link-run');
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
