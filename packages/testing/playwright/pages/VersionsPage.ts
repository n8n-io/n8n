import { BasePage } from './BasePage';

export class VersionsPage extends BasePage {
	async goto() {
		await this.page.goto('/settings/community-nodes');
	}

	getVersionUpdatesPanel() {
		return this.page.getByTestId('version-updates-panel');
	}

	getVersionCard() {
		return this.page.getByTestId('version-card');
	}
}
