import type { Locator, Page } from '@playwright/test';

/**
 * ProjectTabs component - navigation tabs within a project view
 * Mirrors the ProjectTabs.vue component in the frontend
 */
export class ProjectTabsComponent {
	constructor(private readonly page: Page) {}

	getTabs(): Locator {
		return this.page.getByTestId('project-tabs');
	}

	/** The "Files" tab (file-storage module) — hidden when the module is disabled. */
	getFilesTab(): Locator {
		return this.getTabs().getByRole('link', { name: /^files$/i });
	}

	async clickCredentialsTab() {
		await this.page
			.getByTestId('project-tabs')
			.getByRole('link', { name: /credentials/i })
			.click();
	}

	async clickWorkflowsTab() {
		await this.page
			.getByTestId('project-tabs')
			.getByRole('link', { name: /workflows/i })
			.click();
	}

	async clickDataTablesTab() {
		await this.page
			.getByTestId('project-tabs')
			.getByRole('link', { name: /data tables/i })
			.click();
	}

	async clickVariablesTab() {
		await this.page
			.getByTestId('project-tabs')
			.getByRole('link', { name: /variables/i })
			.click();
	}
}
