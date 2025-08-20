import { readFileSync } from 'fs';
import { nanoid } from 'nanoid';
import { setTimeout } from 'timers/promises';

import type { ApiHelpers } from './api-helper';
import { TestError } from '../Types';
import { resolveFromRoot } from '../utils/path-helper';

type WorkflowDefinition = {
	name?: string;
	active?: boolean;
	nodes: Array<{
		id?: string;
		name?: string;
		type: string;
		typeVersion?: number;
		position?: [number, number];
		webhookId?: string;
		parameters: { [key: string]: unknown } & { path?: string };
	}>;
	connections?: Record<string, unknown>;
};

/**
 * Generate and assign a unique webhook id and path to the first Webhook node in a workflow.
 *
 * - Uniqueness: Uses nanoid to ensure both the internal `webhookId` and external `parameters.path`
 *   are unique per call, avoiding collisions across parallel tests and instances.
 * - Path format: `${prefix}-${nanoid}` (default prefix: `test-webhook`).
 * - Mutation: Updates the passed-in `workflow` object in-place.
 */
export function applyUniqueWebhookIds(
	workflow: WorkflowDefinition,
	options?: { prefix?: string; idLength?: number },
) {
	const idLength = options?.idLength ?? 12;
	const prefix = options?.prefix ?? 'test-webhook';

	const generatedId = nanoid(idLength);
	const generatedPath = `${prefix}-${generatedId}`;

	for (const node of workflow.nodes) {
		if (node.type === 'n8n-nodes-base.webhook') {
			node.webhookId = generatedId;
			node.parameters.path = generatedPath;
		}
	}

	return { webhookId: generatedId, webhookPath: generatedPath, workflow };
}

/**
 * Create a webhook workflow from an in-memory definition after assigning unique webhook id/path.
 *
 * Returns the externally callable `webhookPath` (what to pass to triggerWebhook)
 * and the `workflowId` created by the API.
 */
export async function createWebhookWorkflow(
	api: ApiHelpers,
	workflow: WorkflowDefinition,
	options?: { prefix?: string; idLength?: number },
) {
	const { webhookPath } = applyUniqueWebhookIds(workflow, options);
	const createdWorkflow = await api.workflowApi.createWorkflow(workflow as object);
	const workflowId = createdWorkflow.id as string;
	return { webhookPath, workflowId, createdWorkflow };
}

/**
 * Import a webhook workflow from `packages/testing/playwright/workflows/{fileName}` and create it
 * with a unique webhook id/path.
 */
export async function importWebhookWorkflow(
	api: ApiHelpers,
	fileName: string,
	options?: { prefix?: string; idLength?: number },
) {
	const workflowDefinition = JSON.parse(
		readFileSync(resolveFromRoot('workflows', fileName), 'utf8'),
	) as WorkflowDefinition;

	return await createWebhookWorkflow(api, workflowDefinition, options);
}

/**
 * Convenience: import a webhook workflow from file, ensure unique webhook id/path, and activate it.
 *
 * Returns the `webhookPath` to call and the `workflowId` for follow-up assertions.
 */
export async function importAndActivateWebhookWorkflow(
	api: ApiHelpers,
	fileName: string,
	options?: { prefix?: string; idLength?: number },
) {
	const { webhookPath, workflowId, createdWorkflow } = await importWebhookWorkflow(
		api,
		fileName,
		options,
	);
	await setTimeout(500);
	await api.workflowApi.setActive(workflowId, true);
	return { webhookPath, workflowId, createdWorkflow };
}

/**
 * Convenience: create a webhook workflow from an in-memory definition and activate it.
 */
export async function createAndActivateWebhookWorkflow(
	api: ApiHelpers,
	workflow: WorkflowDefinition,
	options?: { prefix?: string; idLength?: number },
) {
	const { webhookPath, workflowId, createdWorkflow } = await createWebhookWorkflow(
		api,
		workflow,
		options,
	);
	// Timing issue between workflow creation and activation
	await setTimeout(500);
	await api.workflowApi.setActive(workflowId, true);
	return { webhookPath, workflowId, createdWorkflow };
}

/**
 * Trigger a webhook endpoint with optional data and parameters.
 *
 * @param api - The API helpers instance
 * @param path - The webhook path (without /webhook/ prefix)
 * @param options - Configuration for the webhook request
 */
export async function triggerWebhook(
	api: ApiHelpers,
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
		method === 'GET' ? await api.request.get(url) : await api.request.post(url, requestOptions);

	if (!response.ok()) {
		throw new TestError(`Webhook trigger failed: ${await response.text()}`);
	}

	return response;
}
