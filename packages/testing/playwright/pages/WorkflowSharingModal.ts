import { BasePage } from './BasePage';

export class WorkflowSharingModal extends BasePage {
	getModal() {
		return this.page.getByTestId('workflowShare-modal');
	}

	async waitForModal() {
		await this.getModal().waitFor({ state: 'visible', timeout: 5000 });
	}

	getUsersSelect() {
		return this.page.getByTestId('project-sharing-select').filter({ visible: true });
	}

	getVisibleDropdown() {
		return this.page.locator('.el-select-dropdown:visible');
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
		await this.getModal().waitFor({ state: 'hidden' });
	}

	async close() {
		await this.getModal().locator('.el-dialog__close').first().click();
	}
}
