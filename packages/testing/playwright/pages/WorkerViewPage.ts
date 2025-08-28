import { BasePage } from './BasePage';

export class WorkerViewPage extends BasePage {
	getWorkerCards() {
		return this.page.getByTestId('worker-card');
	}

	getWorkerCard(workerId: string) {
		return this.getWorkerCards().filter({ hasText: workerId });
	}

	getWorkerViewLicensed() {
		return this.page.getByTestId('worker-view-licensed');
	}

	getWorkerViewUnlicensed() {
		return this.page.getByTestId('worker-view-unlicensed');
	}

	getWorkerMenuItem() {
		return this.page.getByTestId('menu-item').getByText('Workers', { exact: true });
	}

	async visitWorkerView() {
		await this.page.goto('/settings/workers');
	}
}
