import type { Locator } from '@playwright/test';

import { RunDataPanel } from './RunDataPanel';

/**
 * Page object for the log view with configurable root element.
 *
 * @example
 * // Include in a page
 * class ExamplePage {
 *   readonly logsPanel = new LogsPanel(this.page.getByTestId('logs-panel'));
 * }
 *
 * // Usage in a test
 * await expect(n8n.example.logsPage.getLogEntries()).toHaveCount(2);
 */
export class LogsPanel {
	readonly inputPanel = new RunDataPanel(this.root.getByTestId('log-details-input'));
	readonly outputPanel = new RunDataPanel(this.root.getByTestId('log-details-output'));

	constructor(private root: Locator) {}

	/**
	 * Accessors
	 */

	getOverviewStatus(): Locator {
		return this.root.getByTestId('logs-overview-status');
	}

	getClearExecutionButton(): Locator {
		return this.root
			.getByTestId('logs-overview-header')
			.locator('button')
			.filter({ hasText: 'Clear execution' });
	}

	getLogEntries(): Locator {
		return this.root.getByTestId('logs-overview-body').getByRole('treeitem');
	}

	getSelectedLogEntry(): Locator {
		return this.root.getByTestId('logs-overview-body').getByRole('treeitem', { selected: true });
	}

	getManualChatModal(): Locator {
		return this.root.getByTestId('canvas-chat');
	}

	getManualChatInput(): Locator {
		return this.getManualChatModal().locator('.chat-inputs textarea');
	}

	getManualChatMessages(): Locator {
		return this.getManualChatModal().locator('.chat-messages-list .chat-message');
	}

	/**
	 * Actions
	 */

	async open(): Promise<void> {
		await this.root.getByTestId('logs-overview-header').click();
	}

	async clickLogEntryAtRow(rowIndex: number): Promise<void> {
		await this.getLogEntries().nth(rowIndex).click();
	}

	async toggleInputPanel(): Promise<void> {
		await this.root.getByTestId('log-details-header').getByText('Input').click();
	}

	async clickOpenNdvAtRow(rowIndex: number): Promise<void> {
		await this.getLogEntries().nth(rowIndex).hover();
		await this.getLogEntries().nth(rowIndex).getByLabel('Open...').click();
	}

	async clickTriggerPartialExecutionAtRow(rowIndex: number): Promise<void> {
		await this.getLogEntries().nth(rowIndex).hover();
		await this.getLogEntries().nth(rowIndex).getByLabel('Execute step').click();
	}

	async clearExecutionData(): Promise<void> {
		await this.root.getByTestId('clear-execution-data-button').click();
	}

	async sendManualChatMessage(message: string): Promise<void> {
		await this.getManualChatInput().fill(message);
		await this.getManualChatModal().locator('.chat-input-send-button').click();
	}
}
