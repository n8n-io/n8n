import { expect, type Locator, type Page } from '@playwright/test';

export class SidebarPage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	get container() {
		return this.page.locator('#side-menu');
	}

	async clickHomeButton() {
		await this.container.getByTestId('project-home-menu-item').click();
	}

	async universalAdd() {
		await this.container.getByTestId('universal-add').click();
	}

	get visibleNavigationMenu() {
		return this.page.locator('.el-popper:visible');
	}

	getVisibleNavigationSubmenu(label: string): Locator {
		return this.visibleNavigationMenu.getByTestId('navigation-submenu').filter({ hasText: label });
	}

	getVisibleNavigationLink(label: string, hrefPart: string): Locator {
		return this.visibleNavigationMenu.locator(`a[href*="${hrefPart}"]`).filter({ hasText: label });
	}

	async clickHomeMenuItem() {
		await this.container.getByTestId('project-home-menu-item').click();
	}

	async clickPersonalMenuItem() {
		await this.container.getByTestId('project-personal-menu-item').click();
	}

	async clickWorkflowsLink(): Promise<void> {
		await this.page.getByRole('link', { name: 'Workflows' }).click();
	}

	async clickCredentialsLink(): Promise<void> {
		await this.page.getByRole('link', { name: 'Credentials' }).click();
	}

	getProjectButtonInUniversalAdd(): Locator {
		return this.visibleNavigationMenu
			.getByTestId('navigation-menu-item')
			.filter({ hasText: 'New project' });
	}

	async addWorkflowFromUniversalAdd(projectName: string) {
		await this.universalAdd();
		await expect(this.visibleNavigationMenu).toBeVisible();
		// "New workflow" only has a submenu when team projects exist; otherwise it's
		// a direct route to the personal project.
		const submenu = this.getVisibleNavigationSubmenu('New workflow');
		if ((await submenu.count()) > 0) {
			await submenu.hover();
			await this.getVisibleNavigationLink(projectName, '/workflow/new').click();
		} else {
			await this.visibleNavigationMenu.getByText('New workflow').click();
		}
	}

	async openNewCredentialDialogForProject(projectName: string) {
		await this.universalAdd();
		await expect(this.visibleNavigationMenu).toBeVisible();
		// "New credential" only has a submenu when team projects exist; otherwise it's
		// a direct route to create the credential in the personal project.
		const submenu = this.getVisibleNavigationSubmenu('New credential');
		if ((await submenu.count()) > 0) {
			await submenu.hover();
			await this.getVisibleNavigationLink(projectName, '/credentials/create').click();
		} else {
			await this.visibleNavigationMenu.getByText('New credential', { exact: true }).click();
		}
	}

	getProjectMenuItems(): Locator {
		return this.container.getByTestId('project-menu-item');
	}

	async clickProjectMenuItem(projectName: string) {
		await this.expand();
		await this.getProjectMenuItems().filter({ hasText: projectName }).click();
	}

	getSettings(): Locator {
		return this.container.getByTestId('main-sidebar-settings');
	}

	getLogoutMenuItem(): Locator {
		return this.page.getByTestId('main-sidebar-log-out');
	}

	getAboutModal(): Locator {
		return this.page.getByTestId('about-modal');
	}

	getHelp(): Locator {
		return this.container.getByTestId('main-sidebar-help');
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
		return this.container.getByTestId('main-sidebar-cloud-admin');
	}

	getTrialBanner(): Locator {
		return this.page.getByTestId('banners-TRIAL');
	}

	getTemplatesLink(): Locator {
		return this.container.getByTestId('main-sidebar-templates').locator('a');
	}

	getVersionUpdateItem(): Locator {
		return this.page.getByTestId('version-update-cta-button');
	}

	getSourceControlPushButton(): Locator {
		return this.container.getByTestId('main-sidebar-source-control-push');
	}

	getSourceControlPullButton(): Locator {
		return this.container.getByTestId('main-sidebar-source-control-pull');
	}

	getSourceControlConnectedIndicator(): Locator {
		return this.container.getByTestId('main-sidebar-source-control-connected');
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

	async expand() {
		// First ensure the sidebar is visible before checking if it is expanded
		await expect(this.getSettings()).toBeVisible();

		const logo = this.container.getByTestId('n8n-logo');
		const isExpanded = await logo.isVisible();

		if (!isExpanded) {
			const collapseButton = this.container.locator('#toggle-sidebar-button');
			await expect(collapseButton).toBeVisible();
			await collapseButton.click();
		}
	}
}
