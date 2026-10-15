import { expect, type Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class WorkflowSharingModal extends BasePage {
	get container() {
		return this.page.getByTestId('workflowShare-modal');
	}

	getUsersSelect() {
		return this.container.getByTestId('project-sharing-select').filter({ visible: true });
	}

	/**
	 * Pick a sharee through the select's remote search. The dropdown shows one
	 * page of personal projects, so a user created a moment ago may not be on
	 * it. A personal project is named `First Last <email>`, so searching by
	 * email narrows the page to that user.
	 */
	async addUser(email: string) {
		const select = this.getUsersSelect();
		await select.click();
		await select.locator('input').fill(email);
		await this.dropdownOption(email).click();
	}

	/** Save, wait for the share request to succeed, then wait for the modal to close. */
	async save() {
		const shared = this.page.waitForResponse(
			(response) =>
				/\/rest\/workflows\/[^/]+\/share$/.test(response.url()) &&
				response.request().method() === 'PUT',
		);
		await this.clickByTestId('workflow-sharing-modal-save-button');
		expect((await shared).ok()).toBe(true);
		await this.container.waitFor({ state: 'hidden' });
	}

	/** An entry of the open select dropdown. The dropdown is teleported to the body. */
	private dropdownOption(text: string): Locator {
		return this.page.locator('.el-select-dropdown__item').filter({ hasText: text });
	}
}
