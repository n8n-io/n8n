import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';
import { LogsPanel } from './components/LogsPanel';

export class ExecutionsPage extends BasePage {
	readonly logsPanel = new LogsPanel(this.getPreviewIframe().getByTestId('logs-panel'));

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
