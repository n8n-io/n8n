import type { IWorkflowBase } from 'n8n-workflow';
import { nanoid } from 'nanoid';

const SECRET_FIELD = 'secret';

export const DATA_NODE = 'Edit Fields';

const SAVE_ALL_SETTINGS = {
	saveManualExecutions: true,
	saveDataSuccessExecution: 'all',
	saveDataErrorExecution: 'all',
} as const;

interface WorkflowOptions {
	/**
	 * When set, the workflow appends an Edit Fields node that emits `{ secret }`,
	 * so a test can prove the value is (or isn't) present in the execution data.
	 */
	secret?: string;
	settings?: Partial<IWorkflowBase['settings']>;
}

export function uniqueSecret(): string {
	return `sentinel-${nanoid()}`;
}

function editFieldsNode(secret: string) {
	return {
		id: nanoid(),
		name: DATA_NODE,
		type: 'n8n-nodes-base.set',
		typeVersion: 3.4,
		position: [220, 0] as [number, number],
		parameters: {
			assignments: {
				assignments: [{ id: nanoid(), name: SECRET_FIELD, value: secret, type: 'string' }],
			},
			options: {},
		},
	};
}

export function webhookWorkflow({
	secret,
	settings = {},
}: WorkflowOptions = {}): Partial<IWorkflowBase> {
	const webhookId = nanoid();
	const trigger = {
		id: nanoid(),
		name: 'Webhook',
		webhookId,
		parameters: { path: webhookId, options: {} },
		type: 'n8n-nodes-base.webhook',
		typeVersion: 2,
		position: [0, 0] as [number, number],
	};

	return {
		name: `Redaction ${nanoid(8)}`,
		nodes: secret ? [trigger, editFieldsNode(secret)] : [trigger],
		connections: secret
			? { Webhook: { main: [[{ node: DATA_NODE, type: 'main', index: 0 }]] } }
			: {},
		settings: { ...SAVE_ALL_SETTINGS, ...settings },
	};
}

export function manualWorkflow({
	secret,
	settings = {},
}: WorkflowOptions = {}): Partial<IWorkflowBase> {
	const trigger = {
		id: nanoid(),
		name: 'Manual',
		type: 'n8n-nodes-base.manualTrigger',
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
	};

	return {
		name: `Manual ${nanoid(8)}`,
		nodes: secret ? [trigger, editFieldsNode(secret)] : [trigger],
		connections: secret
			? { Manual: { main: [[{ node: DATA_NODE, type: 'main', index: 0 }]] } }
			: {},
		settings: { ...SAVE_ALL_SETTINGS, ...settings },
	};
}
