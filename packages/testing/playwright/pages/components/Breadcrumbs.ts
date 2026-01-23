import type { Page } from '@playwright/test';

export class Breadcrumbs {
	constructor(private readonly page: Page) {}

	getBreadcrumbs() {
		return this.page.getByTestId('breadcrumbs-item');
	}

	getBreadcrumb(resourceName: string) {
		return this.getBreadcrumbs().filter({ hasText: resourceName });
	}
	getCurrentBreadcrumb() {
		return this.page.getByTestId('breadcrumbs-item-current');
	}

	getHiddenBreadcrumbs() {
		return this.page.getByTestId('hidden-items-menu');
	}

	getHomeProjectBreadcrumb() {
		return this.page.getByTestId('home-project');
	}

	getHiddenBreadcrumb(resourceName: string) {
		return this.getHiddenBreadcrumbs().filter({ hasText: resourceName });
	}

	getActionToggleDropdown(resourceName: string) {
		return this.page.getByTestId('action-toggle-dropdown').getByTestId(`action-${resourceName}`);
	}

	getFolderBreadcrumbsActionToggle() {
		return this.page.getByTestId('folder-breadcrumbs-actions');
	}

	/**
	 * Rename the current breadcrumb by activating inline edit mode
	 * @param newName - The new name for the breadcrumb item
	 */
	async renameCurrentBreadcrumb(newName: string) {
		await this.getCurrentBreadcrumb().getByTestId('inline-edit-preview').click();
		await this.getCurrentBreadcrumb().getByTestId('inline-edit-input').fill(newName);
		await this.page.keyboard.press('Enter');
	}
}