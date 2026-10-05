import type { Page } from '@playwright/test';

/**
 * ProjectHeader component - the project title/breadcrumb header shown at the top
 * of project views (workflows list, project settings, etc.).
 * Mirrors the ProjectHeader.vue component in the frontend.
 */
export class ProjectHeader {
	constructor(private readonly page: Page) {}

	getProjectName() {
		return this.page.getByTestId('project-name');
	}
}
