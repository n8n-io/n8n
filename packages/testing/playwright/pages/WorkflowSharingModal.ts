import { BasePage } from './BasePage';

export class WorkflowSharingModal extends BasePage {
	getModal() {
		return this.page.getByTestId('workflowShare-modal');
	}

	async waitForModal() {
		await this.getModal().waitFor({ state: 'visible', timeout: 5000 });
	}

	async addUser(email: string) {
		await this.clickByTestId('project-sharing-select');
		await this.page
			.locator('.el-select-dropdown__item')
			.filter({ hasText: email.toLowerCase() })
			.click();
	}

	async save() {
		await this.clickByTestId('workflow-sharing-modal-save-button');
	}

	async close() {
		await this.getModal().locator('.el-dialog__close').first().click();
	}
}
