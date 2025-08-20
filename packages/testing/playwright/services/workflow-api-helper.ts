import { readFileSync } from 'fs';
import type { IWorkflowBase, ExecutionSummary } from 'n8n-workflow';
import { nanoid } from 'nanoid';

// Type for execution responses from the n8n API
// Couldn't find the exact type so I put these ones together

interface ExecutionListResponse extends ExecutionSummary {
	data: string;
	workflowData: IWorkflowBase;
}

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';
import { resolveFromRoot } from '../utils/path-helper';

type WorkflowImportResult = {
	workflowId: string;
	createdWorkflow: IWorkflowBase;
	webhookPath?: string;
	webhookId?: string;
};

export class WorkflowApiHelper {
	constructor(private api: ApiHelpers) {}

	async createWorkflow(workflow: IWorkflowBase) {
		const response = await this.api.request.post('/rest/workflows', { data: workflow });

		if (!response.ok()) {
			throw new TestError(`Failed to create workflow: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	async setActive(workflowId: string, active: boolean) {
		const response = await this.api.request.patch(`/rest/workflows/${workflowId}?forceSave=true`, {
			data: { active },
		});

		if (!response.ok()) {
			throw new TestError(
				`Failed to ${active ? 'activate' : 'deactivate'} workflow: ${await response.text()}`,
			);
		}
	}

	/**
	 * Make workflow unique by updating name, IDs, and webhook paths if present.
	 * This ensures no conflicts when importing workflows for testing.
	 */
	private makeWorkflowUnique(
		workflow: IWorkflowBase,
		options?: { webhookPrefix?: string; idLength?: number },
	) {
		const idLength = options?.idLength ?? 12;
		const webhookPrefix = options?.webhookPrefix ?? 'test-webhook';
		const uniqueSuffix = nanoid(idLength);

		// Make workflow name unique
		if (workflow.name) {
			workflow.name = `${workflow.name} (Test ${uniqueSuffix})`;
		}

		// Check if workflow has webhook nodes and process them
		let webhookId: string | undefined;
		let webhookPath: string | undefined;

		for (const node of workflow.nodes) {
			if (node.type === 'n8n-nodes-base.webhook') {
				webhookId = nanoid(idLength);
				webhookPath = `${webhookPrefix}-${webhookId}`;
				node.webhookId = webhookId;
				node.parameters.path = webhookPath;
			}
		}

		return { webhookId, webhookPath, workflow };
	}

	/**
	 * Create a workflow from an in-memory definition, making it unique for testing.
	 * Returns detailed information about what was created.
	 */
	async createWorkflowFromDefinition(
		workflow: IWorkflowBase,
		options?: { webhookPrefix?: string; idLength?: number },
	): Promise<WorkflowImportResult> {
		const { webhookPath, webhookId } = this.makeWorkflowUnique(workflow, options);
		const createdWorkflow = await this.createWorkflow(workflow);
		const workflowId: string = String(createdWorkflow.id);

		return {
			workflowId,
			createdWorkflow,
			webhookPath,
			webhookId,
		};
	}

	/**
	 * Import a workflow from file and make it unique for testing.
	 * The workflow will be created with its original active state from the JSON file.
	 * Returns detailed information about what was imported, including webhook info if present.
	 */
	async importWorkflow(
		fileName: string,
		options?: { webhookPrefix?: string; idLength?: number },
	): Promise<WorkflowImportResult> {
		const workflowDefinition: IWorkflowBase = JSON.parse(
			readFileSync(resolveFromRoot('workflows', fileName), 'utf8'),
		);

		const result = await this.createWorkflowFromDefinition(workflowDefinition, options);

		// Ensure the workflow is in the correct active state as specified in the JSON
		if (workflowDefinition.active) {
			await this.setActive(result.workflowId, workflowDefinition.active);
		}

		return result;
	}

	async getExecutions(workflowId?: string, limit = 20): Promise<ExecutionListResponse[]> {
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

	async getExecution(executionId: string): Promise<ExecutionListResponse> {
		const response = await this.api.request.get(`/rest/executions/${executionId}`);

		if (!response.ok()) {
			throw new TestError(`Failed to get execution: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	async waitForExecution(workflowId: string, timeoutMs = 10000): Promise<ExecutionListResponse> {
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
					const executionTime = new Date(
						execution.startedAt ?? execution.createdAt ?? Date.now(),
					).getTime();
					if (executionTime >= startTime - 5000) {
						return execution;
					}
				}
			}

			await new Promise((resolve) => setTimeout(resolve, 200));
		}

		throw new TestError(`Execution did not complete within ${timeoutMs}ms`);
	}
}
