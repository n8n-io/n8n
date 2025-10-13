import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Node Creator component for adding nodes to workflows.
 * Used within CanvasPage as `n8n.canvas.nodeCreator.*`
 *
 * @example
 * // Access via canvas page
 * await n8n.canvas.nodeCreator.open();
 * await n8n.canvas.nodeCreator.searchFor('Gmail');
 * await n8n.canvas.nodeCreator.selectItem('Gmail');
 */
export class NodeCreator {
	constructor(private page: Page) {}

	// Core locators
	getRoot(): Locator {
		return this.page.getByTestId('node-creator');
	}

	getSearchBar(): Locator {
		return this.page.getByTestId('node-creator-search-bar');
	}

	getNodeItems(): Locator {
		return this.page.getByTestId('item-iterator-item');
	}

	getActionItems(): Locator {
		return this.page.getByTestId('node-creator-action-item');
	}

	getCategoryItems(): Locator {
		return this.page.getByTestId('node-creator-category-item');
	}

	getTabs(): Locator {
		return this.page.getByTestId('node-creator-type-selector');
	}

	getSelectedTab(): Locator {
		return this.getTabs().locator('.is-active');
	}

	getActiveSubcategory(): Locator {
		return this.page.getByTestId('nodes-list-header').first();
	}

	getNoResults(): Locator {
		return this.page.getByTestId('node-creator-no-results');
	}

	getTriggerText(): Locator {
		return this.page.getByText('What triggers this workflow?');
	}

	getNextText(): Locator {
		return this.page.getByText('What happens next?');
	}

	// Item getters
	getItem(text: string): Locator {
		return this.getNodeItems().filter({ hasText: text }).first();
	}

	getCategoryItem(text: string): Locator {
		return this.getCategoryItems().filter({ hasText: text });
	}

	getPanelIcon(nodeName: string): Locator {
		return this.getItem(nodeName).locator('[class*="panelIcon"]');
	}

	// Actions
	async open(): Promise<void> {
		await this.page.getByTestId('canvas-plus-button').click();
		await expect(this.getRoot()).toBeVisible();
	}

	async close(): Promise<void> {
		await this.page.keyboard.press('Escape');
	}

	async searchFor(text: string): Promise<void> {
		await this.getSearchBar().fill(text);
	}

	async clearSearch(): Promise<void> {
		await this.getSearchBar().clear();
	}

	async selectItem(text: string): Promise<void> {
		await this.getItem(text).click();
	}

	async selectCategoryItem(text: string): Promise<void> {
		await this.getCategoryItem(text).click();
	}

	async navigateToSubcategory(category: string): Promise<void> {
		await this.getItem(category).click();
		await expect(this.getActiveSubcategory()).toContainText(category);
	}

	async goBackFromSubcategory(): Promise<void> {
		await this.getActiveSubcategory().locator('button').click();
	}

	async selectWithKeyboard(direction: 'up' | 'down' | 'right'): Promise<void> {
		const key = direction === 'up' ? 'ArrowUp' : direction === 'down' ? 'ArrowDown' : 'ArrowRight';
		await this.page.keyboard.press(key);
	}
}
