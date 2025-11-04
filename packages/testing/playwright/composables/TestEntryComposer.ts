import type { Page } from '@playwright/test';

import type { n8nPage } from '../pages/n8nPage';
import type { TestUser } from '../services/user-api-helper';

/**
 * Composer for UI test entry points. All methods in this class navigate to or verify UI state.
 * For API-only testing, use the standalone `api` fixture directly instead.
 */
export class TestEntryComposer {
	constructor(private readonly n8n: n8nPage) {}

	/**
	 * Start UI test from the home page and navigate to canvas
	 */
	async fromHome() {
		await this.n8n.goHome();
		await this.n8n.page.waitForURL('/home/workflows');
	}

	/**
	 * Start UI test from a blank canvas (assumes already on canvas)
	 */
	async fromBlankCanvas() {
		await this.n8n.goHome();
		await this.n8n.workflows.addResource.workflow();
		// Verify we're on canvas
		await this.n8n.canvas.canvasPane().isVisible();
	}

	/**
	 * Start UI test from a workflow in a new project on a new canvas
	 */
	async fromNewProjectBlankCanvas() {
		// Enable features to allow us to create a new project
		await this.n8n.api.enableFeature('projectRole:admin');
		await this.n8n.api.enableFeature('projectRole:editor');
		await this.n8n.api.setMaxTeamProjectsQuota(-1);

		// Create a project using the API
		const response = await this.n8n.api.projects.createProject();

		const projectId = response.id;
		await this.n8n.page.goto(`workflow/new?projectId=${projectId}`);
		await this.n8n.canvas.canvasPane().isVisible();
		return projectId;
	}

	async fromNewProject() {
		const response = await this.n8n.api.projects.createProject();
		const projectId = response.id;
		await this.n8n.navigate.toProject(projectId);
		return projectId;
	}

	/**
	 * Start UI test from the canvas of an imported workflow
	 * Returns the workflow import result for use in the test
	 */
	async fromImportedWorkflow(workflowFile: string) {
		const workflowImportResult = await this.n8n.api.workflows.importWorkflowFromFile(workflowFile);
		await this.n8n.page.goto(`workflow/${workflowImportResult.workflowId}`);
		return workflowImportResult;
	}

	/**
	 * Start UI test on a new page created by an action
	 * @param action - The action that will create a new page
	 * @returns n8nPage instance for the new page
	 */
	async fromNewPage(action: () => Promise<void>): Promise<n8nPage> {
		const newPagePromise = this.n8n.page.waitForEvent('popup');
		await action();
		const newPage = await newPagePromise;
		await newPage.waitForLoadState('domcontentloaded');
		// Use the constructor from the current instance to avoid circular dependency
		const n8nPageConstructor = this.n8n.constructor as new (page: Page) => n8nPage;
		return new n8nPageConstructor(newPage);
	}

	/**
	 * Enable project feature set
	 * Allow project creation, sharing, and folder creation
	 */
	async withProjectFeatures() {
		await this.n8n.api.enableFeature('sharing');
		await this.n8n.api.enableFeature('folders');
		await this.n8n.api.enableFeature('advancedPermissions');
		await this.n8n.api.enableFeature('projectRole:admin');
		await this.n8n.api.enableFeature('projectRole:editor');
		await this.n8n.api.setMaxTeamProjectsQuota(-1);
	}

	/**
	 * Create a new isolated user context with fresh page and authentication
	 * @param user - User with email and password
	 * @returns Fresh n8nPage instance with user authentication
	 */
	async withUser(user: Pick<TestUser, 'email' | 'password'>): Promise<n8nPage> {
		const browser = this.n8n.page.context().browser()!;
		const context = await browser.newContext();
		const page = await context.newPage();
		const newN8n = new (this.n8n.constructor as new (page: Page) => n8nPage)(page);
		await newN8n.api.login({ email: user.email, password: user.password });
		return newN8n;
	}
}
