import type { n8nPage } from '../pages/n8nPage';

/**
 * A class for user interactions with workflow executions that go across multiple pages.
 */
export class ExecutionsComposer {
	constructor(private readonly n8n: n8nPage) {}

	/**
	 * Creates workflow executions by executing the workflow multiple times.
	 * Waits for each execution to complete (by waiting for the POST /rest/workflows/:id/run response)
	 * before starting the next one.
	 *
	 * @param count - Number of executions to create
	 * @example
	 * // Create 10 executions
	 * await n8n.executionsComposer.createExecutions(10);
	 */
	async createExecutions(count: number): Promise<void> {
		for (let i = 0; i < count; i++) {
			const responsePromise = this.n8n.page.waitForResponse(
				(response) =>
					response.url().includes('/rest/workflows/') &&
					response.url().includes('/run') &&
					response.request().method() === 'POST',
			);

			await this.n8n.canvas.clickExecuteWorkflowButton();
			await responsePromise;
		}
	}
}
