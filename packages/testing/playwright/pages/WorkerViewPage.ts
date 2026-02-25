import { BasePage } from './BasePage';

export class WorkerViewPage extends BasePage {
	getWorkerViewLicensed() {
		return this.page.getByTestId('worker-view-licensed');
	}

	getWorkerViewUnlicensed() {
		return this.page.getByTestId('worker-view-unlicensed');
	}

	getWorkerMenuItem() {
		return this.page.getByTestId('menu-item').getByText('Workers', { exact: true });
	}

	async goto() {
		await this.page.goto('/settings/workers');
	}
}
