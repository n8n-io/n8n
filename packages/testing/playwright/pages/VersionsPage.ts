import { BasePage } from './BasePage';

export class VersionsPage extends BasePage {
	get container() {
		return this.page.getByTestId('version-updates-panel');
	}

	getVersionCard() {
		return this.container.getByTestId('version-card');
	}

	getSecurityBadge() {
		return this.getVersionCard().first().locator('.el-tag--danger').getByText('Security update');
	}
}
