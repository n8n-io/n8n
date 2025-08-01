import { BasePage } from './BasePage';

export class VersionsPage extends BasePage {
	// Element getters (no async, return Locator)
	getVersionUpdatesPanelOpenButton() {
		return this.page.getByTestId('version-update-next-versions-link');
	}

	getVersionUpdatesPanel() {
		return this.page.getByTestId('version-updates-panel');
	}

	getVersionUpdatesPanelCloseButton() {
		return this.getVersionUpdatesPanel().getByRole('button', { name: 'Close' });
	}

	getVersionCard() {
		return this.page.getByTestId('version-card');
	}

	getWhatsNewMenuItem() {
		return this.page.getByTestId('menu-item').getByTestId('whats-new');
	}

	// Simple actions (async, return void)
	async openWhatsNewMenu() {
		await this.getWhatsNewMenuItem().click();
	}

	async openVersionUpdatesPanel() {
		await this.getVersionUpdatesPanelOpenButton().click();
	}

	async closeVersionUpdatesPanel() {
		await this.getVersionUpdatesPanelCloseButton().click();
	}
}
