import type { n8nPage } from '../pages/n8nPage';

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
		await this.n8n.workflows.clickAddWorkflowButton();
		// Verify we're on canvas
		await this.n8n.canvas.canvasPane().isVisible();
	}

	/**
	 * Start UI test from a workflow in a new project
	 */
	async fromNewProject() {
		// Enable features to allow us to create a new project
		await this.n8n.api.enableFeature('projectRole:admin');
		await this.n8n.api.enableFeature('projectRole:editor');
		await this.n8n.api.setMaxTeamProjectsQuota(-1);

		// Create a project using the API
		const response = await this.n8n.api.projectApi.createProject();

		const projectId = response.id;
		await this.n8n.page.goto(`workflow/new?projectId=${projectId}`);
		await this.n8n.canvas.canvasPane().isVisible();
	}

	/**
	 * Start UI test from the canvas of an imported workflow
	 * Returns the workflow import result for use in the test
	 */
	async fromImportedWorkflow(workflowFile: string) {
		const workflowImportResult = await this.n8n.api.workflowApi.importWorkflow(workflowFile);
		await this.n8n.page.goto(`workflow/${workflowImportResult.workflowId}`);
		return workflowImportResult;
	}
}
