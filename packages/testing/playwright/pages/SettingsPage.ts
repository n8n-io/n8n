import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
	/**
	 * Get all menu items on the settings page
	 */
	getMenuItems() {
		return this.page.getByTestId('menu-item');
	}

	/**
	 * Get a specific menu item by ID
	 */
	getMenuItem(id: string) {
		return this.page.getByTestId('menu-item').getByTestId(id);
	}

	/**
	 * Navigate to the settings page
	 */
	async goToSettings() {
		await this.page.goto('/settings');
	}
}
