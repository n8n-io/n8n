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

	async clickPersonalMenuItem() {
		await this.page.getByTestId('project-personal-menu-item').click();
	}

	async clickWorkflowsLink(): Promise<void> {
		await this.page.getByRole('link', { name: 'Workflows' }).click();
	}

	async clickCredentialsLink(): Promise<void> {
		await this.page.getByRole('link', { name: 'Credentials' }).click();
	}

	async addProjectFromUniversalAdd() {
		await this.universalAdd();
		await this.page.getByTestId('navigation-menu-item').filter({ hasText: 'Project' }).click();
	}

	getProjectButtonInUniversalAdd(): Locator {
		return this.page.getByTestId('navigation-menu-item').filter({ hasText: 'Project' });
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

	getSettings(): Locator {
		return this.page.getByTestId('main-sidebar-settings');
	}

	getLogoutMenuItem(): Locator {
		return this.page.getByTestId('main-sidebar-log-out');
	}

	getAboutModal(): Locator {
		return this.page.getByTestId('about-modal');
	}

	getHelp(): Locator {
		return this.page.getByTestId('main-sidebar-help');
	}

	async clickHelpMenuItem(): Promise<void> {
		await this.getHelp().click();
	}

	async clickAboutMenuItem(): Promise<void> {
		await this.getHelp().click();
		await this.page.getByTestId('about').click();
	}

	async openAboutModalViaShortcut(): Promise<void> {
		await this.page.keyboard.press('Alt+Meta+o');
	}

	async closeAboutModal(): Promise<void> {
		await this.page.getByTestId('close-about-modal-button').click();
	}

	getAdminPanel(): Locator {
		return this.page.getByTestId('main-sidebar-cloud-admin');
	}

	getTrialBanner(): Locator {
		return this.page.getByTestId('banners-TRIAL');
	}

	getMainSidebarTrialUpgrade(): Locator {
		return this.page.getByTestId('main-sidebar-trial-upgrade');
	}

	getTemplatesLink(): Locator {
		return this.page.getByTestId('main-sidebar-templates').locator('a');
	}

	getVersionUpdateItem(): Locator {
		return this.page.getByTestId('version-update-cta-button');
	}

	async openSettings(): Promise<void> {
		await this.getSettings().click();
	}

	async clickSignout(): Promise<void> {
		await this.expand();
		await this.openSettings();
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
		// First ensure the sidebar is visible before checking if it is expanded
		await expect(this.getSettings()).toBeVisible();

		const logo = this.page.getByTestId('n8n-logo');
		const isExpanded = await logo.isVisible();

		if (!isExpanded) {
			const collapseButton = this.page.locator('#toggle-sidebar-button');
			await expect(collapseButton).toBeVisible();
			await collapseButton.click();
		}
	}
}
