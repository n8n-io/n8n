import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';

export class LogsPage extends BasePage {
	constructor(page: Page) {
		super(page);
	}

	/**
	 * Accessors
	 */

	getOverviewPanel(): Locator {
		return this.page.getByTestId('logs-overview');
	}

	getOverviewPanelBody(): Locator {
		return this.page.getByTestId('logs-overview-body');
	}

	getOverviewStatus(): Locator {
		return this.page.getByTestId('logs-overview-status');
	}

	getLogEntries(): Locator {
		return this.page.getByTestId('logs-overview-body').locator('[role=treeitem]');
	}

	getSelectedLogEntry(): Locator {
		return this.page
			.getByTestId('logs-overview-body')
			.locator('[role=treeitem][aria-selected=true]');
	}

	getInputPanel(): Locator {
		return this.page.getByTestId('log-details-input');
	}

	getInputTableRows(): Locator {
		return this.page.getByTestId('log-details-input').locator('table tr');
	}

	getInputTbodyCell(row: number, col: number): Locator {
		return this.page
			.getByTestId('log-details-input')
			.locator('table tr')
			.nth(row)
			.locator('td')
			.nth(col);
	}

	getNodeErrorMessageHeader(): Locator {
		return this.page.getByTestId('log-details-output').getByTestId('node-error-message');
	}

	getOutputPanel(): Locator {
		return this.page.getByTestId('log-details-output');
	}

	getOutputTableRows(): Locator {
		return this.page.getByTestId('log-details-output').locator('table tr');
	}

	getOutputTbodyCell(row: number, col: number): Locator {
		return this.page
			.getByTestId('log-details-output')
			.locator('table tr')
			.nth(row)
			.locator('td')
			.nth(col);
	}

	/**
	 * Actions
	 */

	async openLogsPanel(): Promise<void> {
		await this.page.getByTestId('logs-overview-header').click();
	}

	async pressClearExecutionButton(): Promise<void> {
		await this.page
			.getByTestId('logs-overview-header')
			.locator('button')
			.filter({ hasText: 'Clear execution' })
			.click();
	}

	async clickLogEntryAtRow(rowIndex: number): Promise<void> {
		await this.getLogEntries().nth(rowIndex).click();
	}

	async toggleInputPanel(): Promise<void> {
		await this.page.getByTestId('log-details-header').getByText('Input').click();
	}

	async clickOpenNdvAtRow(rowIndex: number): Promise<void> {
		const logEntry = this.getLogEntries().nth(rowIndex);
		await logEntry.hover();
		await logEntry.locator('[aria-label="Open..."]').click();
	}

	async clickTriggerPartialExecutionAtRow(rowIndex: number): Promise<void> {
		const logEntry = this.getLogEntries().nth(rowIndex);
		await logEntry.hover();
		await logEntry.locator('[aria-label="Execute step"]').click();
	}

	async setInputDisplayMode(mode: 'table' | 'ai' | 'json' | 'schema'): Promise<void> {
		// Check if input panel exists at all
		const inputPanelCount = await this.page.getByTestId('log-details-input').count();
		if (inputPanelCount === 0) {
			console.warn(
				`Input panel not found for display mode '${mode}' - log entry may not have input data`,
			);
			return;
		}

		const inputPanel = this.page.getByTestId('log-details-input');
		await inputPanel.hover();
		await inputPanel.getByTestId(`radio-button-${mode}`).click();

		// Wait for the display mode change to take effect
		if (mode === 'table') {
			// Wait for table to appear
			await inputPanel.locator('table').waitFor({ state: 'visible', timeout: 5000 });
		}
	}

	async setOutputDisplayMode(mode: 'table' | 'ai' | 'json' | 'schema'): Promise<void> {
		const outputPanel = this.page.getByTestId('log-details-output');
		await outputPanel.hover();
		await outputPanel.getByTestId(`radio-button-${mode}`).click();
	}
}
