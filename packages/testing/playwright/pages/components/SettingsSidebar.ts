import type { Page } from '@playwright/test';

/**
 * SettingsSidebar component - the left-hand menu shared across the `/settings*`
 * routes (personal, workers, etc.).
 */
export class SettingsSidebar {
	constructor(private readonly page: Page) {}

	getMenuItems() {
		return this.page.getByTestId('menu-item');
	}
}
