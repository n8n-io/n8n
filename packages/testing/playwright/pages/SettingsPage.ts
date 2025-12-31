import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
	getMenuItems() {
		return this.page.getByTestId('menu-item');
	}

	getMenuItem(id: string) {
		return this.page.getByTestId('menu-item').getByTestId(id);
	}

	async goToSettings() {
		await this.page.goto('/settings');
	}
}
