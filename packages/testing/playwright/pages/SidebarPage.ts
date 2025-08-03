import type { Locator, Page } from '@playwright/test';

export class SidebarPage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	async clickAddProjectButton() {
		await this.page.getByTestId('project-plus-button').click();
	}

	async universalAdd() {
		await this.page.getByTestId('universal-add').click();
	}

	async addProjectFromUniversalAdd() {
		await this.universalAdd();
		await this.page.getByTestId('navigation-menu-item').filter({ hasText: 'Project' }).click();
	}

	async addWorkflowFromUniversalAdd(projectName: string) {
		await this.universalAdd();
		await this.page.getByTestId('universal-add').getByText('Workflow').click();
		await this.page.getByTestId('universal-add').getByRole('link', { name: projectName }).click();
	}

	async openNewCredentialDialogForProject(projectName: string) {
		await this.universalAdd();
		await this.page.getByTestId('universal-add').getByText('Credential').click();
		await this.page.getByTestId('universal-add').getByRole('link', { name: projectName }).click();
	}

	getProjectMenuItems(): Locator {
		return this.page.getByTestId('project-menu-item');
	}

	async clickProjectMenuItem(projectName: string) {
		await this.getProjectMenuItems().filter({ hasText: projectName }).click();
	}

	getAddFirstProjectButton(): Locator {
		return this.page.getByTestId('add-first-project-button');
	}
}
