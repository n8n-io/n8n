import { BasePage } from './BasePage';

export class SettingsSkillsPage extends BasePage {
	async goto() {
		await this.page.goto('/settings/context/skills');
	}

	async connect(url: string) {
		await this.page.getByTestId('skills-create-menu-button').click();
		await this.page.getByTestId('skills-create-github').click();
		await this.page.getByTestId('skill-source-repository-select').getByRole('combobox').fill(url);
		await this.page.getByRole('option', { name: url }).click();
		await this.page.getByTestId('skill-source-next').click();
		await this.page.getByTestId('skill-source-import').click();
	}

	async checkForUpdates() {
		await this.page.getByTestId('skill-group-actions').getByRole('button').click();
		await this.page.getByTestId('action-checkNow').click();
	}

	getUpdateBadge() {
		return this.page.getByTestId('skill-group-updates');
	}

	getUpdateDialog() {
		return this.page.getByTestId('skill-source-updates-dialog');
	}

	getDiff() {
		return this.getUpdateDialog().getByTestId('skill-source-preview');
	}

	getAcceptButton() {
		return this.page.getByTestId('skill-updates-accept');
	}
}
