import type { Locator } from '@playwright/test';

import { RunDataPanel } from './RunDataPanel';

export class LogsPanel {
	readonly inputPanel: RunDataPanel;
	readonly outputPanel: RunDataPanel;

	constructor(private root: Locator) {
		this.inputPanel = new RunDataPanel(this.getInputPanel());
		this.outputPanel = new RunDataPanel(this.getOutputPanel());
	}

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

	getInputPanel(): Locator {
		return this.root.getByTestId('log-details-input');
	}

	getOutputPanel(): Locator {
		return this.root.getByTestId('log-details-output');
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
