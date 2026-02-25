import { BasePage } from './BasePage';

export class VersionsPage extends BasePage {
	getVersionUpdatesPanel() {
		return this.page.getByTestId('version-updates-panel');
	}

	getVersionCard() {
		return this.page.getByTestId('version-card');
	}
}
