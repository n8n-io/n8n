import { nanoid } from 'nanoid';

export interface WorkflowNode {
	id: string;
	name: string;
	type: string;
	typeVersion: number;
	position: [number, number];
	parameters: Record<string, unknown>;
	webhookId?: string;
	credentials?: Record<string, { id: string; name: string }>;
}

const node = (
	name: string,
	type: string,
	typeVersion: number,
	parameters: Record<string, unknown> = {},
): WorkflowNode => ({
	id: nanoid(8),
	name,
	type,
	typeVersion,
	position: [0, 0],
	parameters,
});

export const nodes = {
	webhook: (path: string, responseMode: 'onReceived' | 'lastNode' = 'onReceived') => ({
		...node('Webhook', 'n8n-nodes-base.webhook', 2, { httpMethod: 'POST', path, responseMode }),
		webhookId: path,
	}),
	code: (name: string, jsCode: string) => node(name, 'n8n-nodes-base.code', 2, { jsCode }),
	noOp: (name: string) => node(name, 'n8n-nodes-base.noOp', 1),
	stopAndError: (name: string, errorMessage: string) =>
		node(name, 'n8n-nodes-base.stopAndError', 1, { errorMessage }),
	errorTrigger: () => node('Error Trigger', 'n8n-nodes-base.errorTrigger', 1),
	subWorkflowTrigger: () =>
		node('When Executed by Another Workflow', 'n8n-nodes-base.executeWorkflowTrigger', 1),
	executeWorkflow: (name: string, workflowId: string, waitForSubWorkflow: boolean) =>
		node(name, 'n8n-nodes-base.executeWorkflow', 1.2, {
			source: 'database',
			workflowId: { __rl: true, value: workflowId, mode: 'id' },
			mode: 'once',
			options: { waitForSubWorkflow },
		}),
	postgresQuery: (
		name: string,
		query: string,
		queryReplacement: string,
		credential: { id: string; name: string },
	) => ({
		...node(name, 'n8n-nodes-base.postgres', 2.5, {
			operation: 'executeQuery',
			query,
			options: { queryReplacement },
		}),
		credentials: { postgres: credential },
	}),
};

/** A workflow whose nodes run one after the other in the given order. */
export function chain(
	name: string,
	steps: WorkflowNode[],
	settings: Record<string, unknown> = {},
): Record<string, unknown> {
	const placed = steps.map((step, index) => ({ ...step, position: [index * 220, 0] }));
	const connections: Record<string, unknown> = {};
	for (let i = 0; i + 1 < placed.length; i++) {
		connections[placed[i].name] = {
			main: [[{ node: placed[i + 1].name, type: 'main', index: 0 }]],
		};
	}
	return {
		name: `${name} ${nanoid(6)}`,
		nodes: placed,
		connections,
		settings: { executionOrder: 'v1', ...settings },
	};
}

export const webhookPath = (prefix: string) => `${prefix}-${nanoid(8)}`;
