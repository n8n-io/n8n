import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';

export class WorkflowApiHelper {
	constructor(private api: ApiHelpers) {}

	async createWorkflow(workflow: object) {
		const response = await this.api.request.post('/rest/workflows', { data: workflow });

		if (!response.ok()) {
			throw new TestError(`Failed to create workflow: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	async setActive(workflowId: string, active: boolean) {
		const response = await this.api.request.patch(`/rest/workflows/${workflowId}`, {
			data: { active },
		});

		if (!response.ok()) {
			throw new TestError(
				`Failed to ${active ? 'activate' : 'deactivate'} workflow: ${await response.text()}`,
			);
		}
	}

	async getExecutions(workflowId?: string, limit = 20) {
		const params = new URLSearchParams();
		if (workflowId) params.set('workflowId', workflowId);
		params.set('limit', limit.toString());

		const response = await this.api.request.get('/rest/executions', { params });

		if (!response.ok()) {
			throw new TestError(`Failed to get executions: ${await response.text()}`);
		}

		const result = await response.json();

		if (Array.isArray(result)) return result;
		if (result.data?.results) return result.data.results;
		if (result.data) return result.data;

		return [];
	}

	async getExecution(executionId: string) {
		const response = await this.api.request.get(`/rest/executions/${executionId}`);

		if (!response.ok()) {
			throw new TestError(`Failed to get execution: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	async waitForExecution(workflowId: string, timeoutMs = 10000) {
		const initialExecutions = await this.getExecutions(workflowId, 50);
		const initialCount = initialExecutions.length;
		const startTime = Date.now();

		while (Date.now() - startTime < timeoutMs) {
			const executions = await this.getExecutions(workflowId, 50);

			if (executions.length > initialCount) {
				for (const execution of executions.slice(0, executions.length - initialCount)) {
					if (execution.status === 'success' || execution.status === 'error') {
						return execution;
					}
				}
			}

			for (const execution of executions) {
				const isCompleted = execution.status === 'success' || execution.status === 'error';
				if (isCompleted && execution.mode === 'webhook') {
					const executionTime = new Date(execution.startedAt ?? execution.createdAt).getTime();
					if (executionTime >= startTime - 5000) {
						return execution;
					}
				}
			}

			await new Promise((resolve) => setTimeout(resolve, 200));
		}

		throw new TestError(`Execution did not complete within ${timeoutMs}ms`);
	}

	async triggerWebhook(
		path: string,
		options: { method?: 'GET' | 'POST'; data?: object; params?: Record<string, string> } = {},
	) {
		const { method = 'POST', data, params } = options;

		let url = `/webhook/${path}`;
		if (params && Object.keys(params).length > 0) {
			const searchParams = new URLSearchParams(params);
			url += `?${searchParams.toString()}`;
		}

		const requestOptions: Record<string, unknown> = {
			headers: { 'Content-Type': 'application/json' },
		};

		if (data && method === 'POST') {
			requestOptions.data = data;
		}

		const response =
			method === 'GET'
				? await this.api.request.get(url)
				: await this.api.request.post(url, requestOptions);

		if (!response.ok()) {
			throw new TestError(`Webhook trigger failed: ${await response.text()}`);
		}

		return response;
	}
}
