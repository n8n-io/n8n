import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

import { BasePage } from './BasePage';
import { ProjectHeader } from './components/ProjectHeader';

export class ProjectSettingsPage extends BasePage {
	readonly projectHeader = new ProjectHeader(this.page);

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

	getMemberRows(): Locator {
		return this.getMembersTable().locator('tbody tr');
	}

	getMemberRowByEmail(email: string): Locator {
		return this.getMemberRows().filter({ hasText: email });
	}

	/**
	 * Rows for users who reach the project through a global role. Their access is
	 * permanent, so the row has no role dropdown and no actions.
	 */
	getAlwaysHasAccessRows(): Locator {
		return this.getMemberRows().filter({
			has: this.page.getByTestId('project-member-always-has-access'),
		});
	}

	async expectRowAlwaysHasAccess(row: Locator, globalRole: string) {
		await expect(row.getByTestId('project-member-always-has-access')).toHaveText(globalRole);
		await expect(this.getMemberRoleDropdownForRow(row)).toHaveCount(0);
		await expect(row.getByTestId('action-toggle')).toHaveCount(0);
		// The row is greyed out, so it reads as access you cannot act on.
		await expect
			.poll(async () => await row.evaluate((el) => getComputedStyle(el).opacity))
			.not.toBe('1');
	}

	getMembersTableHeader(name: string): Locator {
		return this.getMembersTable().getByText(name);
	}

	getMemberRoleDropdownForRow(row: Locator): Locator {
		return row.getByTestId('project-member-role-dropdown');
	}

	getDangerZoneTitle(): Locator {
		return this.page.getByText('Danger zone');
	}

	getDangerZoneDescription(): Locator {
		return this.page.getByText(
			'When deleting a project, you can also choose to move all workflows and credentials to another project.',
		);
	}

	getTitle() {
		return this.projectHeader.getProjectName();
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

	getIconPickerIcon() {
		return this.getIconPickerButton().locator('svg');
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
