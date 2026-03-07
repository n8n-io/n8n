import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';

export class SettingsUsersPage extends BasePage {
	getSearchInput(): Locator {
		return this.page.getByTestId('users-list-search');
	}

	getRow(email: string): Locator {
		return this.page.getByRole('row', { name: email });
	}

	getAccountType(email: string) {
		return this.getRow(email).getByTestId('user-role-dropdown');
	}

	clickAccountType(email: string) {
		return this.getRow(email).getByTestId('user-role-dropdown').getByRole('button').click();
	}

	async search(email: string) {
		const searchInput = this.getSearchInput();
		await searchInput.click();
		await searchInput.fill(email);
	}

	async transferData(emailOrName: string) {
		await this.page
			.getByRole('radio', {
				name: 'Transfer their workflows and credentials to another user or project',
			})
			// This doesn't work without force: true
			// eslint-disable-next-line playwright/no-force-option
			.click({ force: true });

		await this.page.getByPlaceholder('Select project or user').click();
		const projectSharingInfo = this.page.getByTestId('project-sharing-info');
		// Try to find by email or name (personal projects now show "Personal space" instead of email)
		const byEmail = projectSharingInfo.filter({ hasText: emailOrName });
		if ((await byEmail.count()) > 0) {
			await byEmail.click();
		} else {
			// For personal projects, try matching by name part of email
			const namePart = emailOrName.split('@')[0].replace(/[.-]/g, ' ');
			await projectSharingInfo
				.filter({ hasText: new RegExp(namePart, 'i') })
				.first()
				.click();
		}
		await this.page.getByRole('button', { name: 'Delete' }).click();
	}

	async deleteData() {
		await this.page
			.getByRole('radio', {
				name: 'Delete their workflows and credentials',
			})
			// This doesn't work without force: true
			// eslint-disable-next-line playwright/no-force-option
			.check({ force: true });
		await this.page.getByPlaceholder('delete all data').fill('delete all data');
		await this.page.getByRole('button', { name: 'Delete' }).click();
	}

	async selectAccountType(email: string, type: 'Admin' | 'Member') {
		await this.clickAccountType(email);
		await this.page.getByRole('menuitem', { name: type }).click();
	}

	async openActions(email: string) {
		await this.getRow(email).getByTestId('action-toggle').click();
	}

	async clickDeleteUser(email: string) {
		await this.openActions(email);
		await this.page.getByTestId('action-delete').filter({ visible: true }).click();
	}
}
