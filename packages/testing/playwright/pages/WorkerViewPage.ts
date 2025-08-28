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

	getMenuItems() {
		return this.page.locator('.el-menu-item');
	}

	getWorkerMenuItem() {
		return this.page.locator('#settings-workersview');
	}

	async visitWorkerView() {
		await this.page.goto('/settings/workers');
	}
}
