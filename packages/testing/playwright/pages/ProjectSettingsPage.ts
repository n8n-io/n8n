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

	async clickDeleteButton() {
		await this.page.getByTestId('project-settings-delete-button').click();
	}

	// Member selection and management methods
	async addMember(userEmail: string) {
		await this.page.getByTestId('project-members-select').click();
		await this.page.getByText(userEmail).click();
	}

	// Members table methods
	async searchMembers(searchTerm: string) {
		await this.page.getByTestId('project-members-search').fill(searchTerm);
	}

	async clearMemberSearch() {
		const searchInput = this.page.getByTestId('project-members-search');
		const clearButton = searchInput.locator('button[type="button"]');
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

	getMemberByEmail(email: string) {
		const table = this.getMembersTable();
		return table.locator('tr').filter({ hasText: email });
	}

	async changeMemberRole(memberEmail: string, newRole: string) {
		const memberRow = this.getMemberByEmail(memberEmail);
		const roleDropdown = memberRow.getByTestId('project-member-role-dropdown');
		await roleDropdown.click();
		await this.page.getByText(newRole, { exact: true }).click();
	}

	async removeMember(memberEmail: string) {
		const memberRow = this.getMemberByEmail(memberEmail);
		const roleDropdown = memberRow.getByTestId('project-member-role-dropdown');
		await roleDropdown.click();
		await this.page.getByText('Remove user').click();
	}

	async getMemberRole(memberEmail: string): Promise<string> {
		const memberRow = this.getMemberByEmail(memberEmail);
		const roleCell = memberRow.locator('td').nth(1); // Role is the second column
		return (await roleCell.textContent()) ?? '';
	}

	async canChangeMemberRole(memberEmail: string): Promise<boolean> {
		const memberRow = this.getMemberByEmail(memberEmail);
		const roleDropdown = memberRow.getByTestId('project-member-role-dropdown');
		return await roleDropdown.isVisible();
	}

	// Table state and pagination methods
	async getTablePaginationInfo() {
		const table = this.getMembersTable();
		const pagination = table.locator('[data-testid*="pagination"]').first();
		if (await pagination.isVisible()) {
			return await pagination.textContent();
		}
		return null;
	}

	async clickNextPage() {
		const table = this.getMembersTable();
		const nextButton = table.locator('button').filter({ hasText: 'Next' });
		await nextButton.click();
	}

	async clickPreviousPage() {
		const table = this.getMembersTable();
		const prevButton = table.locator('button').filter({ hasText: 'Previous' });
		await prevButton.click();
	}

	// Sorting methods
	async sortByColumn(columnName: string) {
		const table = this.getMembersTable();
		const header = table.locator('th').filter({ hasText: columnName });
		await header.click();
	}

	// Verification methods
	async expectMemberInTable(memberEmail: string) {
		const memberRow = this.getMemberByEmail(memberEmail);
		await expect(memberRow).toBeVisible();
	}

	async expectMemberNotInTable(memberEmail: string) {
		const memberRow = this.getMemberByEmail(memberEmail);
		await expect(memberRow).toHaveCount(0);
	}

	async expectMemberHasRole(memberEmail: string, expectedRole: string) {
		const actualRole = await this.getMemberRole(memberEmail);
		expect(actualRole).toContain(expectedRole);
	}

	async expectTableHasMemberCount(expectedCount: number) {
		const actualCount = await this.getMemberRowCount();
		expect(actualCount).toBe(expectedCount);
	}

	async expectSearchInputValue(expectedValue: string) {
		const searchInput = this.page.getByTestId('project-members-search');
		await expect(searchInput).toHaveValue(expectedValue);
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
