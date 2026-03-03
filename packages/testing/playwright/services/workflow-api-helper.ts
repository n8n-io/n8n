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
	webhookMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
};

export class WorkflowApiHelper {
	constructor(private api: ApiHelpers) {}

	async createWorkflow(workflow: Partial<IWorkflowBase>) {
		const response = await this.api.request.post('/rest/workflows', { data: workflow });

		if (!response.ok()) {
			throw new TestError(`Failed to create workflow: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	/** Creates a workflow in a project with optional folder placement. */
	async createInProject(
		project: string,
		options?: {
			folder?: string;
			name?: string;
		},
	): Promise<{ name: string; id: string; versionId: string }> {
		const workflowName = options?.name ?? `Test Workflow ${nanoid(8)}`;

		const workflow = {
			name: workflowName,
			nodes: [],
			connections: {},
			settings: {},
			active: false,
			projectId: project,
			...(options?.folder && { parentFolderId: options.folder }),
		};

		const response = await this.api.request.post('/rest/workflows', { data: workflow });

		if (!response.ok()) {
			throw new TestError(`Failed to create workflow: ${await response.text()}`);
		}

		const result = await response.json();
		const workflowData = result.data ?? result;

		return {
			name: workflowName,
			id: workflowData.id,
			versionId: workflowData.versionId,
		};
	}

	async activate(workflowId: string, versionId: string) {
		const response = await this.api.request.post(`/rest/workflows/${workflowId}/activate`, {
			data: { versionId },
		});

		if (!response.ok()) {
			throw new TestError(`Failed to activate workflow: ${await response.text()}`);
		}
	}

	async update(
		workflowId: string,
		versionId: string,
		data: Partial<IWorkflowBase>,
	): Promise<IWorkflowBase> {
		const response = await this.api.request.patch(`/rest/workflows/${workflowId}`, {
			data: {
				...data,
				versionId,
			},
		});

		if (!response.ok()) {
			throw new TestError(`Failed to update workflow: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	async deactivate(workflowId: string) {
		const response = await this.api.request.post(`/rest/workflows/${workflowId}/deactivate`);

		if (!response.ok()) {
			throw new TestError(`Failed to deactivate workflow: ${await response.text()}`);
		}
	}

	async archive(workflowId: string) {
		const response = await this.api.request.post(`/rest/workflows/${workflowId}/archive`);

		if (!response.ok()) {
			throw new TestError(`Failed to archive workflow: ${await response.text()}`);
		}
	}

	async delete(workflowId: string) {
		const response = await this.api.request.delete(`/rest/workflows/${workflowId}`);

		if (!response.ok()) {
			throw new TestError(`Failed to delete workflow: ${await response.text()}`);
		}
	}

	async shareWorkflow(workflowId: string, shareWithIds: string[]) {
		const response = await this.api.request.put(`/rest/workflows/${workflowId}/share`, {
			data: { shareWithIds },
		});

		if (!response.ok()) {
			throw new TestError(`Failed to share workflow: ${await response.text()}`);
		}
	}

	async getWorkflows() {
		const response = await this.api.request.get('/rest/workflows');

		if (!response.ok()) {
			throw new TestError(`Failed to get workflows: ${await response.text()}`);
		}

		const result = await response.json();
		return result.data ?? result;
	}

	async transfer(workflowId: string, destinationProjectId: string) {
		const response = await this.api.request.put(`/rest/workflows/${workflowId}/transfer`, {
			data: { destinationProjectId },
		});

		if (!response.ok()) {
			throw new TestError(`Failed to transfer workflow: ${await response.text()}`);
		}
	}

	/**
	 * Set tags on a workflow via API
	 * @param workflowId - The workflow ID
	 * @param tagIds - Array of tag IDs to assign to the workflow
	 */
	async setTags(workflowId: string, tagIds: string[]): Promise<void> {
		const getResponse = await this.api.request.get(`/rest/workflows/${workflowId}`);
		if (!getResponse.ok()) {
			throw new TestError(`Failed to get workflow: ${await getResponse.text()}`);
		}
		const workflowData = await getResponse.json();
		const workflow = workflowData.data ?? workflowData;

		const response = await this.api.request.patch(`/rest/workflows/${workflowId}`, {
			data: {
				versionId: workflow.versionId,
				tags: tagIds,
			},
		});

		if (!response.ok()) {
			throw new TestError(`Failed to set workflow tags: ${await response.text()}`);
		}
	}

	/** Makes workflow unique by updating name, IDs, and webhook paths. */
	private makeWorkflowUnique(
		workflow: Partial<IWorkflowBase>,
		options?: { webhookPrefix?: string; idLength?: number },
	) {
		delete workflow.id;

		const idLength = options?.idLength ?? 12;
		const webhookPrefix = options?.webhookPrefix ?? 'test-webhook';
		const uniqueSuffix = nanoid(idLength);

		// Make workflow name unique; add a default if missing
		if (workflow.name && workflow.name.trim().length > 0) {
			workflow.name = `${workflow.name} (Test ${uniqueSuffix})`;
		} else {
			workflow.name = `Test Workflow ${uniqueSuffix}`;
		}

		// Ensure workflow is inactive by default when not specified
		workflow.active ??= false;

		// Check if workflow has webhook nodes and process them
		let webhookId: string | undefined;
		let webhookPath: string | undefined;
		let webhookMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | undefined;

		if (workflow.nodes) {
			for (const node of workflow.nodes) {
				if (node.type === 'n8n-nodes-base.webhook') {
					webhookId = nanoid(idLength);
					webhookPath = `${webhookPrefix}-${webhookId}`;
					node.webhookId = webhookId;
					node.parameters.path = webhookPath;
					// Extract HTTP method from webhook node, default to GET
					webhookMethod = (node.parameters.httpMethod as typeof webhookMethod) ?? 'GET';
				}

				// Handle MCP Trigger nodes - make their paths unique
				// Note: webhookId is required for isFullPath: true webhooks to work correctly.
				// Without it, the webhook path becomes workflowId/nodeName/path instead of just path.
				if (node.type === '@n8n/n8n-nodes-langchain.mcpTrigger') {
					const mcpId = nanoid(idLength);
					const currentPath = (node.parameters.path as string) ?? 'mcp';
					node.parameters.path = `${currentPath}-${mcpId}`;
					node.webhookId = mcpId;
				}
			}
		}

		return { webhookId, webhookPath, webhookMethod, workflow };
	}

	/** Creates a workflow from definition, making it unique for testing. */
	async createWorkflowFromDefinition(
		workflow: Partial<IWorkflowBase>,
		options?: { webhookPrefix?: string; idLength?: number; makeUnique?: boolean },
	): Promise<WorkflowImportResult> {
		const { makeUnique = true, ...rest } = options ?? {};
		const { webhookPath, webhookId, webhookMethod } = makeUnique
			? this.makeWorkflowUnique(workflow, rest)
			: { webhookPath: undefined, webhookId: undefined, webhookMethod: undefined };
		const createdWorkflow = await this.createWorkflow(workflow);
		const workflowId: string = String(createdWorkflow.id);

		return {
			workflowId,
			createdWorkflow,
			webhookPath,
			webhookId,
			webhookMethod,
		};
	}

	/** Imports a workflow from file, making it unique for testing. */
	async importWorkflowFromFile(
		fileName: string,
		options?: {
			webhookPrefix?: string;
			idLength?: number;
			makeUnique?: boolean;
			transform?: (workflow: Partial<IWorkflowBase>) => Partial<IWorkflowBase>;
		},
	): Promise<WorkflowImportResult> {
		const filePath = resolveFromRoot('workflows', fileName);
		const fileContent = readFileSync(filePath, 'utf8');
		let workflowDefinition = JSON.parse(fileContent) as IWorkflowBase;

		// Apply transform if provided
		if (options?.transform) {
			workflowDefinition = options.transform(workflowDefinition) as IWorkflowBase;
		}

		return await this.importWorkflowFromDefinition(workflowDefinition, options);
	}

	async importWorkflowFromDefinition(
		workflowDefinition: Partial<IWorkflowBase>,
		options?: { webhookPrefix?: string; idLength?: number; makeUnique?: boolean },
	): Promise<WorkflowImportResult> {
		const result = await this.createWorkflowFromDefinition(workflowDefinition, options);

		if (workflowDefinition.active) {
			await this.activate(result.workflowId, result.createdWorkflow.versionId!);
		}
		return result;
	}

	async getExecutions(workflowId?: string, limit = 20): Promise<ExecutionListResponse[]> {
		const params = new URLSearchParams();
		if (workflowId) {
			params.set('filter', JSON.stringify({ workflowId }));
		}
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

	async waitForExecution(
		workflowId: string,
		timeoutMs = 10000,
		mode: 'manual' | 'webhook' | 'trigger' | 'integrated' = 'webhook',
	): Promise<ExecutionListResponse> {
		const initialExecutions = await this.getExecutions(workflowId, 50);
		const initialCount = initialExecutions.length;
		const startTime = Date.now();

		while (Date.now() - startTime < timeoutMs) {
			const executions = await this.getExecutions(workflowId, 50);

			if (executions.length > initialCount) {
				for (const execution of executions.slice(0, executions.length - initialCount)) {
					const isCompleted = execution.status === 'success' || execution.status === 'error';
					const isCorrectWorkflow = execution.workflowId === workflowId;
					const isCorrectMode = execution.mode === mode;
					if (isCompleted && isCorrectWorkflow && isCorrectMode) {
						return execution;
					}
				}
			}

			for (const execution of executions) {
				const isCompleted = execution.status === 'success' || execution.status === 'error';
				const isCorrectWorkflow = execution.workflowId === workflowId;
				const isCorrectMode = execution.mode === mode;
				if (isCompleted && isCorrectWorkflow && isCorrectMode) {
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

	/** Waits for a workflow execution to reach a specific status. */
	async waitForWorkflowStatus(
		workflowId: string,
		expectedStatus: string,
		timeoutMs = 5000,
	): Promise<ExecutionListResponse> {
		const startTime = Date.now();

		while (Date.now() - startTime < timeoutMs) {
			const executions = await this.getExecutions(workflowId);
			const execution = executions.find((e) => e.workflowId === workflowId);

			if (execution && execution.status === expectedStatus) {
				return execution;
			}

			await new Promise((resolve) => setTimeout(resolve, 200));
		}

		throw new TestError(
			`Workflow ${workflowId} did not reach status '${expectedStatus}' within ${timeoutMs}ms`,
		);
	}
}
