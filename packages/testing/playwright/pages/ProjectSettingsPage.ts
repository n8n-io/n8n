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
		await Promise.all([
			this.waitForRestResponse(/\/rest\/projects\/[^/]+$/, 'PATCH'),
			this.clickButtonByName('Save'),
		]);
	}

	async clickCancelButton() {
		await this.page.getByTestId('project-settings-cancel-button').click();
	}

	getSaveButton() {
		return this.page.getByTestId('project-settings-save-button');
	}

	getCancelButton() {
		return this.page.getByTestId('project-settings-cancel-button');
	}

	getDeleteButton() {
		return this.page.getByTestId('project-settings-delete-button');
	}

	getMembersSearchInput() {
		return this.page.getByPlaceholder('Add users...');
	}

	getRoleDropdownFor(email: string) {
		return this.getMembersTable()
			.locator('tr')
			.filter({ hasText: email })
			.getByTestId('project-member-role-dropdown')
			.getByRole('button');
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
		const searchInput = this.getMembersSearchInput();
		await expect(searchInput).toHaveValue(expectedValue);
	}

	getTitle() {
		return this.page.getByTestId('project-name');
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

	// Icon picker methods
	getIconPickerButton() {
		return this.page.getByTestId('icon-picker-button');
	}

	async clickIconPickerButton() {
		await this.getIconPickerButton().click();
	}

	async selectIconTab(tabName: string) {
		await this.page.getByTestId('icon-picker-tabs').getByText(tabName).click();
	}

	async selectFirstEmoji() {
		await this.page.getByTestId('icon-picker-emoji').first().click();
	}
}
