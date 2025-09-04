import type { Locator, Page } from '@playwright/test';

import { BasePage } from './BasePage';
import { LogsPanel } from '../components/LogsPanel';

export class ExecutionsPage extends BasePage {
	readonly logsPanel: LogsPanel;

	constructor(page: Page) {
		super(page);
		this.logsPanel = new LogsPanel(
			page.getByTestId('workflow-preview-iframe').contentFrame().locator('body'),
		);
	}

	async clickDebugInEditorButton(): Promise<void> {
		await this.clickButtonByName('Debug in editor');
	}

	async clickCopyToEditorButton(): Promise<void> {
		await this.clickButtonByName('Copy to editor');
	}

	getExecutionItems(): Locator {
		return this.page.locator('div.execution-card');
	}

	getLastExecutionItem(): Locator {
		const executionItems = this.getExecutionItems();
		return executionItems.nth(0);
	}

	getAutoRefreshButton() {
		return this.page.getByTestId('auto-refresh-checkbox');
	}

	async clickLastExecutionItem(): Promise<void> {
		const executionItem = this.getLastExecutionItem();
		await executionItem.click();
	}

	/**
	 * Handle the pinned nodes confirmation dialog.
	 * @param action - The action to take.
	 */
	async handlePinnedNodesConfirmation(action: 'Unpin' | 'Cancel'): Promise<void> {
		await this.page.getByRole('button', { name: action }).click();
	}
}
