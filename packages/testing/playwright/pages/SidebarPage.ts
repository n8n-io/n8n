import { expect, type Locator, type Page } from '@playwright/test';

export class SidebarPage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	async clickAddProjectButton() {
		await this.page.getByTestId('project-plus-button').click();
	}

	async clickHomeButton() {
		await this.page.getByTestId('project-home-menu-item').click();
	}

	async universalAdd() {
		await this.page.getByTestId('universal-add').click();
	}

	async clickHomeMenuItem() {
		await this.page.getByTestId('project-home-menu-item').click();
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
		await this.page.getByTestId('universal-add').getByText('Credential', { exact: true }).click();
		await this.page.getByTestId('universal-add').getByRole('link', { name: projectName }).click();
	}

	getProjectMenuItems(): Locator {
		return this.page.getByTestId('project-menu-item');
	}

	async clickProjectMenuItem(projectName: string) {
		await this.expand();
		await this.getProjectMenuItems().filter({ hasText: projectName }).click();
	}

	getAddFirstProjectButton(): Locator {
		return this.page.getByTestId('add-first-project-button');
	}

	getUserMenu(): Locator {
		return this.page.getByTestId('main-sidebar-user-menu');
	}

	getLogoutMenuItem(): Locator {
		return this.page.getByTestId('user-menu-item-logout');
	}

	getAboutModal(): Locator {
		return this.page.getByTestId('about-modal');
	}

	async clickAboutMenuItem(): Promise<void> {
		await this.page.getByTestId('help').click();
		await this.page.getByTestId('about').click();
	}

	async closeAboutModal(): Promise<void> {
		await this.page.getByTestId('close-about-modal-button').click();
	}

	getAdminPanel(): Locator {
		return this.page.getByTestId('cloud-admin');
	}

	getTrialBanner(): Locator {
		return this.page.getByTestId('banners-TRIAL');
	}

	getTemplatesLink(): Locator {
		return this.page.getByTestId('templates').locator('a');
	}

	async openUserMenu(): Promise<void> {
		await this.getUserMenu().click();
	}

	async clickSignout(): Promise<void> {
		await this.expand();
		await this.openUserMenu();
		await this.getLogoutMenuItem().click();
	}

	async signOutFromWorkflows(): Promise<void> {
		await this.page.goto('/workflows');
		await this.clickSignout();
	}

	async goToWorkflows(): Promise<void> {
		await this.page.goto('/workflows');
	}

	async expand() {
		const collapseButton = this.page.locator('#collapse-change-button');
		const chevronRight = this.page.locator(
			'#collapse-change-button svg[data-icon="chevron-right"]',
		);

		await expect(collapseButton).toBeVisible();
		if (await chevronRight.isVisible()) {
			await collapseButton.click();
		}
	}
}
