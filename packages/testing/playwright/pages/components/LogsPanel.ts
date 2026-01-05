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

	getSessionIdButton(): Locator {
		return this.getManualChatModal().getByTestId('chat-session-id');
	}

	getRefreshSessionButton(): Locator {
		return this.getManualChatModal().getByTestId('refresh-session-button');
	}

	/**
	 * Returns the session ID tooltip locator.
	 * Filters by "click to copy" text to avoid matching other tooltips in the header.
	 */
	getSessionIdTooltip(): Locator {
		return this.root.page().locator('.n8n-tooltip').filter({ hasText: 'click to copy' });
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

	/**
	 * Clicks the session ID button to show the tooltip and extracts the full session ID.
	 * @returns The full session ID string
	 */
	async getSessionId(): Promise<string> {
		await this.getSessionIdButton().click();
		const tooltipText = await this.getSessionIdTooltip().textContent();
		if (!tooltipText) {
			throw new Error('Session ID tooltip text is empty');
		}
		// Extract session ID before "(click to copy)"
		return tooltipText.split('(')[0].trim();
	}

	/**
	 * Clicks the refresh session button to reset the chat session.
	 */
	async refreshSession(): Promise<void> {
		await this.getRefreshSessionButton().click();
	}
}
