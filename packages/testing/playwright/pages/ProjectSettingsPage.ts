import { expect } from '@playwright/test';

import { BasePage } from './BasePage';

export class ProjectSettingsPage extends BasePage {
	async fillProjectName(name: string) {
		await this.page.getByTestId('project-settings-name-input').locator('input').fill(name);
	}

	async fillProjectDescription(description: string) {
		await this.page
			.getByTestId('project-settings-description-input')
			.locator('textarea')
			.fill(description);
	}

	async clickSaveButton() {
		await this.clickButtonByName('Save');
	}

	async clickCancelButton() {
		await this.page.getByTestId('project-settings-cancel-button').click();
	}

	async clearMemberSearch() {
		const searchInput = this.page.getByTestId('project-members-search');
		const clearButton = searchInput.locator('+ span');
		if (await clearButton.isVisible()) {
			await clearButton.click();
		}
	}

	getMembersTable() {
		return this.page.getByTestId('project-members-table');
	}

	async getMemberRowCount() {
		const table = this.getMembersTable();
		const rows = table.locator('tbody tr');
		return await rows.count();
	}

	async expectTableHasMemberCount(expectedCount: number) {
		const actualCount = await this.getMemberRowCount();
		expect(actualCount).toBe(expectedCount);
	}

	async expectSearchInputValue(expectedValue: string) {
		const searchInput = this.page.getByTestId('project-members-search').locator('input');
		await expect(searchInput).toHaveValue(expectedValue);
	}

	// Robust value assertions on inner form controls
	getNameInput() {
		return this.page.locator('#projectName input');
	}

	getDescriptionTextarea() {
		return this.page.locator('#projectDescription textarea');
	}

	async expectProjectNameValue(value: string) {
		await expect(this.getNameInput()).toHaveValue(value);
	}

	async expectProjectDescriptionValue(value: string) {
		await expect(this.getDescriptionTextarea()).toHaveValue(value);
	}

	async expectTableIsVisible() {
		const table = this.getMembersTable();
		await expect(table).toBeVisible();
	}

	async expectMembersSelectIsVisible() {
		const select = this.page.getByTestId('project-members-select');
		await expect(select).toBeVisible();
	}
}
