import { BasePage } from './BasePage';

export class ProjectWorkflowsPage extends BasePage {
	async clickCreateWorkflowButton() {
		await this.clickByTestId('add-resource-workflow');
	}

	async clickProjectMenuItem(projectName: string) {
		await this.page.getByTestId('project-menu-item').filter({ hasText: projectName }).click();
	}
}
