import { BasePage } from './BasePage';
import { SettingsSidebar } from './components/SettingsSidebar';

export class WorkerViewPage extends BasePage {
	readonly settingsSidebar = new SettingsSidebar(this.page);

	getWorkerViewLicensed() {
		return this.page.getByTestId('worker-view-licensed');
	}

	getWorkerViewUnlicensed() {
		return this.page.getByTestId('worker-view-unlicensed');
	}

	getWorkerMenuItem() {
		return this.settingsSidebar.getMenuItems().getByText('Workers', { exact: true });
	}

	async goto() {
		await this.page.goto('/settings/workers');
	}
}
