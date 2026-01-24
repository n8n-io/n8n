import { BasePage } from './BasePage';

export class VersionsPage extends BasePage {
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
		return this.page.getByTestId('whats-new');
	}
}
