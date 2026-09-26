import type { APIResponse } from '@playwright/test';
import flatted from 'flatted';
import { nanoid } from 'nanoid';
import type { INode, IWorkflowBase } from 'n8n-workflow';

import type { ApiHelpers } from '../../../services/api-helper';

export const NO_OP = { type: 'n8n-nodes-base.noOp', name: 'No Operation, do nothing' };
export const SET = { type: 'n8n-nodes-base.set', name: 'Edit Fields' };
export const POSTGRES = { type: 'n8n-nodes-base.postgres', name: 'Postgres' };
export const SCHEDULE_TRIGGER_NAME = 'Schedule Trigger';

export interface PolicyViolation {
	kind: string;
	subject: string;
	scope: 'instance' | 'project';
	matchedRuleId?: string;
}

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
		parameters: {},
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
