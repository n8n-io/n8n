import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';

export class LogsPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	/**
	 * Accessors
	 */

	getOverviewStatus(): Locator {
		return this.page.getByTestId('logs-overview-status');
	}

	getClearExecutionButton(): Locator {
		return this.page
			.getByTestId('logs-overview-header')
			.locator('button')
			.filter({ hasText: 'Clear execution' });
	}

	getLogEntries(): Locator {
		return this.page.getByTestId('logs-overview-body').getByRole('treeitem');
	}

	getSelectedLogEntry(): Locator {
		return this.page.getByTestId('logs-overview-body').getByRole('treeitem', { selected: true });
	}

	getInputPanel(): Locator {
		return this.page.getByTestId('log-details-input');
	}

	getInputTableRows(): Locator {
		return this.getInputPanel().locator('table tr');
	}

	getInputTbodyCell(row: number, col: number): Locator {
		return this.getInputPanel().locator('table tbody tr').nth(row).locator('td').nth(col);
	}

	getNodeErrorMessageHeader(): Locator {
		return this.getOutputPanel().getByTestId('node-error-message');
	}

	getOutputPanel(): Locator {
		return this.page.getByTestId('log-details-output');
	}

	getOutputTbodyCell(row: number, col: number): Locator {
		return this.getOutputPanel().locator('table tbody tr').nth(row).locator('td').nth(col);
	}

	/**
	 * Actions
	 */

	async openLogsPanel(): Promise<void> {
		await this.page.getByTestId('logs-overview-header').click();
	}

	async clickLogEntryAtRow(rowIndex: number): Promise<void> {
		await this.getLogEntries().nth(rowIndex).click();
	}

	async toggleInputPanel(): Promise<void> {
		await this.page.getByTestId('log-details-header').getByText('Input').click();
	}

	async clickOpenNdvAtRow(rowIndex: number): Promise<void> {
		await this.getLogEntries().nth(rowIndex).hover();
		await this.getLogEntries().nth(rowIndex).getByLabel('Open...').click();
	}

	async clickTriggerPartialExecutionAtRow(rowIndex: number): Promise<void> {
		await this.getLogEntries().nth(rowIndex).hover();
		await this.getLogEntries().nth(rowIndex).getByLabel('Execute step').click();
	}

	async setInputDisplayMode(mode: 'table' | 'ai' | 'json' | 'schema'): Promise<void> {
		await this.getInputPanel().hover();
		await this.getInputPanel().getByTestId(`radio-button-${mode}`).click();
	}

	async setOutputDisplayMode(mode: 'table' | 'ai' | 'json' | 'schema'): Promise<void> {
		await this.getOutputPanel().hover();
		await this.getOutputPanel().getByTestId(`radio-button-${mode}`).click();
	}
}
