import type { Page } from '@playwright/test';

import { ActionToggle } from './ActionToggle';

export class Breadcrumbs {
	private readonly actionToggle: ActionToggle;

	constructor(private readonly page: Page) {
		this.actionToggle = new ActionToggle(page);
	}

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

	getActionToggleDropdown(resourceName: string) {
		return this.actionToggle.getAction(resourceName);
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
