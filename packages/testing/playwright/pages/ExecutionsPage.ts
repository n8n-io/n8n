import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';
import { LogsPanel } from './components/LogsPanel';
import { MessageBox } from './components/messageBoxLocators';

export class ExecutionsPage extends BasePage {
	async goto(projectId?: string) {
		const url = projectId ? `/projects/${projectId}/executions` : '/home/executions';
		await this.page.goto(url);
	}

	readonly logsPanel = new LogsPanel(this.getPreview().getByTestId('logs-panel'));

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

	getPreview(): Locator {
		return this.page.getByTestId('execution-preview-host');
	}

	getPreviewCanvasNodes(): Locator {
		return this.getPreview().getByTestId('canvas-node');
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

	getGlobalExecutionItems(): Locator {
		return this.page.getByTestId('global-execution-list-item');
	}

	getExecutionsSidebar(): Locator {
		return this.page.getByTestId('executions-sidebar');
	}

	getExecutionsEmptyList(): Locator {
		return this.page.getByTestId('execution-list-empty');
	}

	getNoTriggerContent(): Locator {
		return this.page.getByTestId('workflow-execution-no-trigger-content');
	}

	getAddFirstStepButton(): Locator {
		return this.page.getByRole('button', { name: 'Add first step' });
	}

	getNoContent(): Locator {
		return this.page.getByTestId('workflow-execution-no-content');
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
	 * Get error notifications shown while previewing an execution. The preview
	 * renders natively, so its notifications surface at the app level.
	 */
	getErrorNotificationsInPreview(): Locator {
		return this.page.locator('.el-notification:has(.el-notification--error)');
	}

	getFirstExecutionItem(): Locator {
		return this.getExecutionItems().first();
	}

	async deleteExecutionInPreview(): Promise<void> {
		await this.page.getByTestId('execution-preview-delete-button').click();
		await new MessageBox(this.page).confirmButton.click();
	}

	// Filter methods
	getFilterButton(): Locator {
		return this.page.getByTestId('executions-filter-button');
	}

	getFilterForm(): Locator {
		return this.page.getByTestId('execution-filter-form');
	}

	getStatusSelect(): Locator {
		return this.page.getByTestId('executions-filter-status-select');
	}

	getStatusOption(status: string): Locator {
		return this.getVisiblePopoverOption(status);
	}

	async openFilter(): Promise<void> {
		await this.getFilterButton().click();
	}

	async openNodeExecutionDetails(name: string): Promise<void> {
		await this.getPreview()
			.locator(`[data-test-id="canvas-node"][data-node-name="${name}"]`)
			.dblclick();
	}

	getFilterBadge(): Locator {
		return this.page.getByTestId('execution-filter-badge');
	}

	getFilterResetButton(): Locator {
		return this.page.getByTestId('executions-filter-reset-button');
	}

	async resetFilter(): Promise<void> {
		await this.getFilterResetButton().click();
	}

	async selectFilterStatus(status: string): Promise<void> {
		await this.getStatusSelect().getByRole('combobox').click();
		await this.getVisiblePopoverOption(status).click();
	}
}
