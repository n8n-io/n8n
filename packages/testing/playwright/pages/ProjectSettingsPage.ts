import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from './BasePage';

export class ProjectSettingsPage extends BasePage {
	async goto(projectId: string) {
		await this.page.goto(`/projects/${projectId}/settings`);
	}

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

	async searchForMember(query: string) {
		await this.getMembersSearchInput().click();
		await this.page.keyboard.type(query, { delay: 50 });
	}

	getRoleDropdownFor(email: string) {
		return this.getMembersTable()
			.locator('tr')
			.filter({ hasText: email })
			.getByTestId('project-member-role-dropdown');
	}

	getMembersTable() {
		return this.page.getByTestId('project-members-table');
	}

	async expectTableHasMemberCount(expectedCount: number) {
		const rows = this.getMembersTable().locator('tbody tr');
		await expect(rows).toHaveCount(expectedCount);
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

	getExternalSecretsSection(): Locator {
		return this.page.getByTestId('external-secrets-section');
	}

	/**
	 * The data table listing project-scoped secret provider connections.
	 */
	getExternalSecretsTable(): Locator {
		return this.page.getByTestId('external-secrets-table');
	}

	getExternalSecretsTableRow(name: string): Locator {
		return this.getExternalSecretsTable().getByText(name);
	}
}
