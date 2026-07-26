import type { Locator } from '@playwright/test';

import { ManualChatModal } from './ManualChatModal';
import { RunDataPanel } from './RunDataPanel';
import type { ClipboardHelper } from '../../helpers/ClipboardHelper';

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
	readonly manualChat = new ManualChatModal(this.root.getByTestId('canvas-chat'));

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

	getActionsButton(): Locator {
		return this.root.getByRole('button', { name: 'Actions' });
	}

	getSyncSelectionMenuItem(): Locator {
		return this.root.getByTestId('logs-panel-actions-item-toggleSyncSelection');
	}

	getManualChatModal(): Locator {
		return this.manualChat.get();
	}

	getManualChatInput(): Locator {
		return this.manualChat.getInput();
	}

	getManualChatMessages(): Locator {
		return this.manualChat.getMessages();
	}

	getSessionIdButton(): Locator {
		return this.manualChat.getSessionIdButton();
	}

	getRefreshSessionButton(): Locator {
		return this.manualChat.getRefreshSessionButton();
	}

	/**
	 * Actions
	 */

	async open(): Promise<void> {
		await this.root.getByTestId('logs-overview-header').click();
	}

	async openActions(): Promise<void> {
		await this.getActionsButton().click();
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
		await this.manualChat.sendMessage(message);
	}

	/**
	 * Clicks the session ID button to copy the session ID to clipboard and returns it.
	 * @param clipboard - ClipboardHelper instance for reading clipboard
	 * @returns The full session ID string
	 */
	async getSessionId(clipboard: ClipboardHelper): Promise<string> {
		await clipboard.grant();
		await this.getSessionIdButton().click();
		return await clipboard.readText();
	}

	/**
	 * Clicks the refresh session button to reset the chat session.
	 */
	async refreshSession(): Promise<void> {
		await this.getRefreshSessionButton().click();
	}
}
