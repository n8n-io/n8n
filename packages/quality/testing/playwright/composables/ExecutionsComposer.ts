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

	/**
	 * Execute a specific node and capture the workflow run request payload.
	 * Sets up request interception before executing the node, then returns the parsed request body.
	 * Useful for testing the payload structure sent to the workflow run API.
	 *
	 * @param nodeName - The name of the node to execute
	 * @returns The parsed request body from the workflow run API call
	 * @example
	 * // Execute a node and verify payload structure
	 * const payload = await n8n.executionsComposer.executeNodeAndCapturePayload('Process The Data');
	 * expect(payload).toHaveProperty('runData');
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async executeNodeAndCapturePayload(nodeName: string): Promise<any> {
		const workflowRunPromise = this.n8n.page.waitForRequest(
			(request) =>
				request.url().includes('/rest/workflows/') &&
				request.url().includes('/run') &&
				request.method() === 'POST',
		);

		await this.n8n.canvas.executeNode(nodeName);

		const workflowRunRequest = await workflowRunPromise;
		return workflowRunRequest.postDataJSON();
	}
}
