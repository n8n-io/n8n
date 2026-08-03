import { BasePage } from './BasePage';

export class WorkflowSharingModal extends BasePage {
	get container() {
		return this.page.getByTestId('workflowShare-modal');
	}

	getUsersSelect() {
		return this.container.getByTestId('project-sharing-select').filter({ visible: true });
	}

	async addUser(emailOrName: string) {
		await this.clickByTestId('project-sharing-select');
		// Try to find by email or name (personal projects now show "Personal space" instead of email)
		const dropdown = this.page.locator('.el-select-dropdown__item');
		const byEmail = dropdown.filter({ hasText: emailOrName.toLowerCase() });
		if ((await byEmail.count()) > 0) {
			await byEmail.click();
		} else {
			// For personal projects, the email is not shown, so try matching by name part of email
			const namePart = emailOrName.split('@')[0].replace(/[.-]/g, ' ');
			await dropdown
				.filter({ hasText: new RegExp(namePart, 'i') })
				.first()
				.click();
		}
	}

	async save() {
		await this.clickByTestId('workflow-sharing-modal-save-button');
		await this.container.waitFor({ state: 'hidden' });
	}
}
