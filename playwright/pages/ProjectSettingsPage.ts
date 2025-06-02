import { BasePage } from './BasePage';

export class ProjectSettingsPage extends BasePage {
	async fillProjectName(name: string) {
		await this.page.getByTestId('project-settings-name-input').locator('input').fill(name);
	}

	async clickSaveButton() {
		await this.clickButtonByName('Save');
	}
}
