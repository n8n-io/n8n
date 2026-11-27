import type { Page } from '@playwright/test';

/**
 * ProjectTabs component - navigation tabs within a project view
 * Mirrors the ProjectTabs.vue component in the frontend
 */
export class ProjectTabsComponent {
	constructor(private readonly page: Page) {}

	async clickCredentialsTab() {
		await this.page
			.getByTestId('project-tabs')
			.getByRole('tab', { name: /credentials/i })
			.click();
	}

	async clickWorkflowsTab() {
		await this.page
			.getByTestId('project-tabs')
			.getByRole('tab', { name: /workflows/i })
			.click();
	}

	async clickDataTablesTab() {
		await this.page
			.getByTestId('project-tabs')
			.getByRole('tab', { name: /data tables/i })
			.click();
	}

	async clickVariablesTab() {
		await this.page
			.getByTestId('project-tabs')
			.getByRole('tab', { name: /variables/i })
			.click();
	}
}
