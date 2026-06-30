import type { Locator } from '@playwright/test';

import { BasePage } from './BasePage';
import { ActionToggle } from './components/ActionToggle';

export class SettingsUsersPage extends BasePage {
	readonly actionToggle = new ActionToggle(this.page);

	async goto(): Promise<void> {
		await this.page.goto('/settings/users');
	}

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
				name: 'Transfer their workflows, credentials and data tables to another user or project',
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
				name: 'Delete their workflows, credentials and data tables',
			})
			// This doesn't work without force: true
			// eslint-disable-next-line playwright/no-force-option
			.check({ force: true });
		await this.page.getByPlaceholder('delete all data').fill('delete all data');
		await this.page.getByRole('button', { name: 'Delete' }).click();
	}

	async selectAccountType(email: string, type: 'Admin' | 'Member') {
		await this.clickAccountType(email);
		await this.page
			.getByRole('menu')
			.filter({ visible: true })
			.getByRole('menuitem', { name: new RegExp(`^${type}\\b`) })
			.click();
	}

	async openActions(email: string) {
		await this.actionToggle.open(this.getRow(email));
	}

	async clickDeleteUser(email: string) {
		await this.openActions(email);
		await this.actionToggle.getAction('delete').filter({ visible: true }).click();
	}
}
