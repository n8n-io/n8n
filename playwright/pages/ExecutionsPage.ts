import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class ExecutionsPage extends BasePage {
	async clickDebugInEditorButton(): Promise<void> {
		await this.clickButtonByName('Debug in editor');
	}

	async clickCopyToEditorButton(): Promise<void> {
		await this.clickButtonByName('Copy to editor');
	}

	async getExecutionItems(): Promise<Locator> {
		return this.page.locator('div.execution-card');
	}

	async getLastExecutionItem(): Promise<Locator> {
		const executionItems = await this.getExecutionItems();
		return executionItems.nth(0);
	}

	async clickLastExecutionItem(): Promise<void> {
		const executionItem = await this.getLastExecutionItem();
		await executionItem.click();
	}

	/**
	 * Handle the pinned nodes confirmation dialog.
	 * @param action - The action to take.
	 */
	async handlePinnedNodesConfirmation(action: 'Unpin' | 'Cancel'): Promise<void> {
		const confirmDialog = this.page.locator('.matching-pinned-nodes-confirmation');
		await this.page.getByRole('button', { name: action }).click();
	}
}
