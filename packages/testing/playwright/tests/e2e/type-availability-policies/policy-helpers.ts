import type { CreateCredentialDto } from '@n8n/api-types';
import type { APIResponse } from '@playwright/test';
import flatted from 'flatted';
import { nanoid } from 'nanoid';
import type { INode, IWorkflowBase } from 'n8n-workflow';

import type { ApiHelpers } from '../../../services/api-helper';

export const NO_OP = { type: 'n8n-nodes-base.noOp', name: 'No Operation, do nothing' };
export const SET = { type: 'n8n-nodes-base.set', name: 'Edit Fields' };
export const POSTGRES = { type: 'n8n-nodes-base.postgres', name: 'Postgres' };
export const SCHEDULE_TRIGGER_NAME = 'Schedule Trigger';

/** A credential type is policed by its bare name, unlike a package-qualified node type. */
export const POSTGRES_CREDENTIAL = 'postgres';
export const HEADER_AUTH_CREDENTIAL = 'httpHeaderAuth';

export interface PolicyViolation {
	kind: string;
	subject: string;
	scope: 'instance' | 'project';
	matchedRuleId?: string;
}

/** Reads a project's availability for one kind: node types or credential types. */
type AvailabilityReader = (
	projectId: string,
) => Promise<Array<{ name: string; available: boolean; scope?: string }>>;

function scheduleTrigger(): INode {
	return {
		id: nanoid(),
		name: SCHEDULE_TRIGGER_NAME,
		type: 'n8n-nodes-base.scheduleTrigger',
		typeVersion: 1.2,
		position: [0, 0],
		parameters: { rule: { interval: [{ field: 'days' }] } },
	};
}

function noOp(): INode {
	return {
		id: nanoid(),
		name: NO_OP.name,
		type: NO_OP.type,
		typeVersion: 1,
		position: [220, 0],
		parameters: {},
	};
}

export function setNode(): INode {
	return {
		id: nanoid(),
		name: SET.name,
		type: SET.type,
		typeVersion: 3.4,
		position: [440, 0],
		parameters: {},
	};
}

function postgresNode(credential: { id: string; name: string }): INode {
	return {
		id: nanoid(),
		name: POSTGRES.name,
		type: POSTGRES.type,
		typeVersion: 2.6,
		position: [220, 0],
		// A valid operation, so a publish is refused by policy only, not by missing parameters.
		parameters: { operation: 'executeQuery', query: 'SELECT 1' },
		credentials: { postgres: credential },
	};
}

/** A publishable workflow: a manual trigger cannot be activated. */
export function scheduleToNoOpWorkflow(): Partial<IWorkflowBase> {
	const trigger = scheduleTrigger();
	return {
		name: `Node type policy ${nanoid(8)}`,
		nodes: [trigger, noOp()],
		connections: { [trigger.name]: { main: [[{ node: NO_OP.name, type: 'main', index: 0 }]] } },
		settings: {},
	};
}

export function triggerOnlyWorkflow(): Partial<IWorkflowBase> {
	return { name: `Node type policy ${nanoid(8)}`, nodes: [scheduleTrigger()], connections: {} };
}

export function postgresWorkflow(credential: { id: string; name: string }): Partial<IWorkflowBase> {
	return {
		name: `Node type policy ${nanoid(8)}`,
		nodes: [scheduleTrigger(), postgresNode(credential)],
		connections: {},
	};
}

export function webhookToPostgresWorkflow(credential: {
	id: string;
	name: string;
}): Partial<IWorkflowBase> {
	const webhookId = nanoid();
	return {
		name: `Credential type policy ${nanoid(8)}`,
		nodes: [
			{
				id: nanoid(),
				name: 'Webhook',
				webhookId,
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				parameters: { path: webhookId, options: {} },
			},
			postgresNode(credential),
		],
		connections: { Webhook: { main: [[{ node: POSTGRES.name, type: 'main', index: 0 }]] } },
	};
}

export function postgresCredential(projectId: string): CreateCredentialDto {
	return {
		name: `Postgres ${nanoid(8)}`,
		type: POSTGRES_CREDENTIAL,
		data: { host: 'localhost', database: 'n8n', user: 'n8n', password: 'not-used', port: 5432 },
		projectId,
	};
}

export function headerAuthCredential(projectId: string): CreateCredentialDto {
	return {
		name: `Header auth ${nanoid(8)}`,
		type: HEADER_AUTH_CREDENTIAL,
		data: { name: 'X-Test', value: 'not-used' },
		projectId,
	};
}

export async function violationsOf(response: APIResponse): Promise<PolicyViolation[]> {
	const body = await response.json();
	return body.meta?.violations ?? [];
}

/** A refused run is stored as a failed execution, with the violations on its error. */
export function executionErrorOf(execution: { data: string }): {
	message?: string;
	violations?: PolicyViolation[];
} {
	const data = flatted.parse(execution.data);
	return data.resultData.error ?? {};
}

/**
 * Loads a Postgres dropdown, which decrypts the credential without a run. Postgres keeps a
 * refusal's message when it wraps it, where Slack rewrites any 403 to a generic one.
 */
export async function loadPostgresColumns(
	api: ApiHelpers,
	credential: { id: string; name: string },
	projectId: string,
): Promise<APIResponse> {
	return await api.nodeParameters.loadOptionsRaw({
		path: 'parameters.columns',
		methodName: 'getColumns',
		nodeTypeAndVersion: { name: POSTGRES.type, version: 2.6 },
		currentNodeParameters: {},
		credentials: { postgres: credential },
		projectId,
	});
}

export async function findAvailability(
	read: AvailabilityReader,
	projectId: string,
	typeName: string,
) {
	const types = await read(projectId);
	return types.find((entry) => entry.name === typeName);
}

/** Availability of one type in two projects, for comparing a narrowed project with another. */
export async function availabilityInProjects(
	read: AvailabilityReader,
	typeName: string,
	{ narrowedProjectId, otherProjectId }: { narrowedProjectId: string; otherProjectId: string },
) {
	return {
		narrowed: await findAvailability(read, narrowedProjectId, typeName),
		other: await findAvailability(read, otherProjectId, typeName),
	};
}

/** Saves a move of every node. A move adds no type, so it is grandfathered. */
export async function saveMovedNodes(api: ApiHelpers, workflow: IWorkflowBase): Promise<number> {
	const movedNodes = workflow.nodes.map((node) => ({
		...node,
		position: [node.position[0], node.position[1] + 100] as [number, number],
	}));

	const response = await api.workflows.updateRaw(workflow.id, workflow.versionId!, {
		nodes: movedNodes,
		connections: workflow.connections,
	});
	return response.status();
}

export async function publishOutcome(api: ApiHelpers, workflow: IWorkflowBase) {
	const response = await api.workflows.activateRaw(workflow.id, workflow.versionId!);
	return { status: response.status(), violations: await violationsOf(response) };
}

export async function manualRunOutcome(api: ApiHelpers, workflow: IWorkflowBase) {
	const { executionId } = await api.workflows.runManually(workflow.id, SCHEDULE_TRIGGER_NAME);
	const execution = await api.workflows.waitForExecutionById(executionId);
	return { status: execution.status, violations: executionErrorOf(execution).violations };
}
