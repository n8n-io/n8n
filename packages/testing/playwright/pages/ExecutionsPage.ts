import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class ExecutionsPage extends BasePage {
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

	getPreviewIframe() {
		return this.page.getByTestId('workflow-preview-iframe').contentFrame();
	}

	getManualChatMessages(): Locator {
		return this.getPreviewIframe().locator('.chat-messages-list .chat-message');
	}

	getLogsOverviewStatus() {
		return this.getPreviewIframe().getByTestId('logs-overview-status');
	}

	getLogEntries(): Locator {
		return this.getPreviewIframe().getByTestId('logs-overview-body').getByRole('treeitem');
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
