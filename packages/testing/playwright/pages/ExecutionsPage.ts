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

	getExecutionsList(): Locator {
		return this.page.getByTestId('current-executions-list');
	}

	getExecutionsSidebar(): Locator {
		return this.page.getByTestId('executions-sidebar');
	}

	getExecutionsEmptyList(): Locator {
		return this.page.getByTestId('execution-list-empty');
	}

	getSuccessfulExecutionItems(): Locator {
		return this.page.locator('[data-test-execution-status="success"]');
	}

	getFailedExecutionItems(): Locator {
		return this.page.locator('[data-test-execution-status="error"]');
	}

	/**
	 * Scroll the executions list to the bottom to trigger lazy loading
	 */
	async scrollExecutionsListToBottom(): Promise<void> {
		await this.getExecutionsList().evaluate((el) => el.scrollTo(0, el.scrollHeight));
	}

	/**
	 * Get error notifications in the preview iframe
	 */
	getErrorNotificationsInPreview(): Locator {
		return this.getPreviewIframe().locator('.el-notification:has(.el-notification--error)');
	}

	getFirstExecutionItem(): Locator {
		return this.getExecutionItems().first();
	}

	async deleteExecutionInPreview(): Promise<void> {
		await this.page.getByTestId('execution-preview-delete-button').click();
		await this.page.locator('button.btn--confirm').click();
	}
}
