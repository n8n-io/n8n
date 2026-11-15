import type { IWorkflowBase } from 'n8n-workflow';

import type { TurnKind, TurnMix } from './config';
import type { N8nClient } from './n8n-client';

export const TOOL_NAME = 'lookup_order';
export const STOCK_TOOL = 'check_stock';
export const SHIPPING_TOOL = 'shipping_quote';
export const CUSTOMER_TOOL = 'find_customer';

/** The data table that `find_customer` reads, and the rows the bench puts in it. */
export const CUSTOMER_TABLE = 'bench_customers';
const CUSTOMERS = [
	{ email: 'ada@example.com', name: 'Ada Lovelace', plan: 'enterprise', city: 'London' },
	{ email: 'grace@example.com', name: 'Grace Hopper', plan: 'pro', city: 'New York' },
	{ email: 'linus@example.com', name: 'Linus Torvalds', plan: 'starter', city: 'Helsinki' },
	{ email: 'joana@example.com', name: 'Joana Silva', plan: 'pro', city: 'Lisbon' },
];

export const PROMPTS: Record<TurnKind, string[]> = {
	plain: [
		'In two sentences, what is a message queue?',
		'Give me one tip for writing clear commit messages.',
		'What is the capital of Portugal? Answer in one line.',
		'Name three uses of a load balancer, briefly.',
	],
	tool: [
		`Use the ${TOOL_NAME} tool for order 1042 and tell me its status.`,
		`Look up order 77 with the ${TOOL_NAME} tool and summarise it in one line.`,
		`Check order 9001 with ${TOOL_NAME}. What did it return?`,
		`Use ${STOCK_TOOL} for SKU KB-104. How many are in stock?`,
		`What does it cost to ship 2 kg to Lisbon? Use ${SHIPPING_TOOL}.`,
		`Is SKU MS-220 in stock? Check with ${STOCK_TOOL} and answer in one line.`,
	],
	datatable: [
		`Use ${CUSTOMER_TOOL} for ada@example.com. Which plan is she on?`,
		`Find the customer grace@example.com with ${CUSTOMER_TOOL} and tell me her city.`,
		`Look up joana@example.com with ${CUSTOMER_TOOL}. Reply with name and plan only.`,
		`Is linus@example.com a customer? Check with ${CUSTOMER_TOOL}.`,
	],
	long: [
		'Write a detailed guide, about 600 words, on how to run a database migration with zero downtime.',
		'Explain, in about 600 words, how TCP congestion control works, with examples.',
		'Write a 600-word story about a lighthouse keeper who finds a radio.',
	],
	// Integrations send short requests, about half of them about orders.
	webhook: [
		`A customer asks about order 3310. Use ${TOOL_NAME} and reply in one line.`,
		'Classify this support message as billing, shipping or other: "My card was charged twice."',
		`Order 518: call ${TOOL_NAME} and give me the ETA only.`,
		'Write a one-line subject for an email that confirms a refund.',
	],
	workflow: [
		'Summarise this ticket in one sentence: "The export to CSV times out for files over 50 MB."',
		`Look up order 2207 with ${TOOL_NAME} and say if it shipped.`,
		'Extract the city from: "Ship to 12 Rua Augusta, Lisbon, Portugal". Reply with the city only.',
		`Use ${TOOL_NAME} for order 640 and write a one-line status update for the customer.`,
	],
};

export const AGENT_NAME = 'Agent bench';
export const AGENT_INSTRUCTIONS = `You are a concise assistant. Call each tool the user names exactly once, then answer. Use ${TOOL_NAME} for orders, ${STOCK_TOOL} for stock, ${SHIPPING_TOOL} for shipping costs and ${CUSTOMER_TOOL} for customers.`;

/** The agent's tools, in the words the cockpit shows. */
export const TOOLS = [
	{
		name: TOOL_NAME,
		steps: [
			'Execute Workflow Trigger',
			'Set: status "shipped", eta "2 days"',
			'Respond to Webhook',
		],
	},
	{
		name: STOCK_TOOL,
		steps: ['Execute Workflow Trigger (sku)', 'Set: in_stock 14, warehouse "Lisbon"'],
	},
	{
		name: SHIPPING_TOOL,
		steps: ['Execute Workflow Trigger (destination, weightKg)', 'Code: price from weight'],
	},
	{
		name: CUSTOMER_TOOL,
		steps: [
			'Execute Workflow Trigger (email)',
			`Data table: get rows of ${CUSTOMER_TABLE} where email = input`,
		],
	},
];

/** How the bench sends each kind of turn. */
export const KIND_PATHS: Record<TurnKind, string> = {
	plain: 'Editor chat (streamed). Short question, no tool.',
	tool: `Editor chat (streamed). The agent calls ${TOOL_NAME}, ${STOCK_TOOL} or ${SHIPPING_TOOL} once.`,
	datatable: `Editor chat (streamed). The agent calls ${CUSTOMER_TOOL}, which reads a data table.`,
	long: 'Editor chat (streamed). About 600 words of output.',
	webhook: 'Responses API of the agent webhook integration. Not streamed.',
	workflow: 'Production webhook of a workflow that runs the agent with Message an Agent.',
};

/** The path of the production webhook that starts the agent workflow. */
export const AGENT_WORKFLOW_PATH = 'agent-bench';

export function promptFor(kind: TurnKind, index: number): string {
	const list = PROMPTS[kind];
	return list[index % list.length];
}

/** Pick kinds by weight, in a fixed order, so every topology gets the same sequence. */
export function turnPlan(mix: TurnMix, count: number): TurnKind[] {
	const weight = (kind: TurnKind) => mix[kind] ?? 0;
	const kinds = (Object.keys(mix) as TurnKind[]).filter((kind) => weight(kind) > 0);
	const total = kinds.reduce((sum, kind) => sum + weight(kind), 0);
	// Deterministic spread: kind k gets round(count * weight / total) slots, interleaved.
	const plan: TurnKind[] = [];
	const credit = new Map(kinds.map((kind) => [kind, 0]));
	for (let i = 0; i < count; i++) {
		for (const kind of kinds) credit.set(kind, (credit.get(kind) ?? 0) + weight(kind) / total);
		const next = kinds.reduce((best, kind) =>
			(credit.get(kind) ?? 0) > (credit.get(best) ?? 0) ? kind : best,
		);
		credit.set(next, (credit.get(next) ?? 0) - 1);
		plan.push(next);
	}
	return plan;
}

/** A small tool workflow. Respond to Webhook makes its body the tool result. */
function toolWorkflow(): Partial<IWorkflowBase> {
	return {
		name: `Agent bench ${TOOL_NAME}`,
		active: false,
		nodes: [
			{
				id: 'trigger',
				name: 'Start',
				type: 'n8n-nodes-base.executeWorkflowTrigger',
				typeVersion: 1.1,
				position: [0, 0],
				parameters: { inputSource: 'passthrough' },
			},
			{
				id: 'order',
				name: 'Order',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [220, 0],
				parameters: {
					assignments: {
						assignments: [
							{ id: 'status', name: 'status', value: 'shipped', type: 'string' },
							{ id: 'eta', name: 'eta', value: '2 days', type: 'string' },
						],
					},
					options: {},
				},
			},
			{
				id: 'respond',
				name: 'Respond',
				type: 'n8n-nodes-base.respondToWebhook',
				typeVersion: 1,
				position: [440, 0],
				parameters: { respondWith: 'allIncomingItems', options: {} },
			},
		],
		connections: {
			Start: { main: [[{ node: 'Order', type: 'main', index: 0 }]] },
			Order: { main: [[{ node: 'Respond', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
	};
}

type Field = { name: string; type: 'string' | 'number' };

/** A tool workflow with typed inputs, so the model sees what to pass. */
function inputWorkflow(
	name: string,
	fields: Field[],
	step: IWorkflowBase['nodes'][number],
): Partial<IWorkflowBase> {
	return {
		name: `Agent bench ${name}`,
		active: false,
		nodes: [
			{
				id: 'trigger',
				name: 'Start',
				type: 'n8n-nodes-base.executeWorkflowTrigger',
				typeVersion: 1.1,
				position: [0, 0],
				parameters: { inputSource: 'workflowInputs', workflowInputs: { values: fields } },
			},
			{ ...step, position: [220, 0] },
		],
		connections: { Start: { main: [[{ node: step.name, type: 'main', index: 0 }]] } },
		settings: { executionOrder: 'v1' },
	};
}

function stockWorkflow() {
	return inputWorkflow(STOCK_TOOL, [{ name: 'sku', type: 'string' }], {
		id: 'stock',
		name: 'Stock',
		type: 'n8n-nodes-base.set',
		typeVersion: 3.4,
		position: [0, 0],
		parameters: {
			assignments: {
				assignments: [
					{ id: 'sku', name: 'sku', value: '={{ $json.sku }}', type: 'string' },
					{ id: 'in_stock', name: 'in_stock', value: 14, type: 'number' },
					{ id: 'warehouse', name: 'warehouse', value: 'Lisbon', type: 'string' },
				],
			},
			options: {},
		},
	});
}

function shippingWorkflow() {
	return inputWorkflow(
		SHIPPING_TOOL,
		[
			{ name: 'destination', type: 'string' },
			{ name: 'weightKg', type: 'number' },
		],
		{
			id: 'quote',
			name: 'Quote',
			type: 'n8n-nodes-base.code',
			typeVersion: 2,
			position: [0, 0],
			parameters: {
				jsCode:
					'const { destination, weightKg } = $input.first().json;\nconst kg = Number(weightKg) || 1;\nreturn [{ json: { destination, weightKg: kg, priceEur: Math.round((4.9 + kg * 1.5) * 100) / 100, days: 3 } }];',
			},
		},
	);
}

function customerWorkflow(dataTableId: string) {
	return inputWorkflow(CUSTOMER_TOOL, [{ name: 'email', type: 'string' }], {
		id: 'customer',
		name: 'Customer',
		type: 'n8n-nodes-base.dataTable',
		typeVersion: 1.1,
		position: [0, 0],
		alwaysOutputData: true,
		parameters: {
			resource: 'row',
			operation: 'get',
			dataTableId: { __rl: true, mode: 'id', value: dataTableId },
			matchType: 'allConditions',
			filters: {
				conditions: [{ keyName: 'email', condition: 'eq', keyValue: '={{ $json.email }}' }],
			},
			returnAll: true,
		},
	});
}

/**
 * Webhook to Message an Agent. The caller sends the message and a session ID,
 * so the bench can find the turn in `agent_execution`. In queue mode a
 * production webhook runs on a worker, and the agent turn runs inside that
 * workflow execution, not on the agent turn queue.
 */
function agentWorkflow(agentId: string): Partial<IWorkflowBase> {
	return {
		name: 'Agent bench caller',
		active: false,
		nodes: [
			{
				id: 'webhook',
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				webhookId: crypto.randomUUID(),
				parameters: {
					httpMethod: 'POST',
					path: AGENT_WORKFLOW_PATH,
					responseMode: 'lastNode',
					options: {},
				},
			},
			{
				id: 'agent',
				name: 'Message an Agent',
				type: 'n8n-nodes-base.messageAnAgent',
				typeVersion: 3.1,
				position: [220, 0],
				parameters: {
					agentId: { __rl: true, mode: 'id', value: agentId },
					message: '={{ $json.body.message }}',
					advanced: {
						session: {
							session: { sessionIdType: 'customKey', sessionKey: '={{ $json.body.sessionId }}' },
						},
					},
				},
			},
		],
		connections: { Webhook: { main: [[{ node: 'Message an Agent', type: 'main', index: 0 }]] } },
		settings: { executionOrder: 'v1' },
	};
}

const PROVIDERS: Record<string, { credentialType: string; envVar: string }> = {
	anthropic: { credentialType: 'anthropicApi', envVar: 'ANTHROPIC_API_KEY' },
	openai: { credentialType: 'openAiApi', envVar: 'OPENAI_API_KEY' },
};

export function modelProvider(model: string) {
	const provider = PROVIDERS[model.split('/')[0]];
	if (!provider) {
		throw new Error(`Unsupported model "${model}". Use anthropic/<model> or openai/<model>.`);
	}
	const apiKey = process.env[provider.envVar];
	if (!apiKey) throw new Error(`Set ${provider.envVar} to run against ${model}`);
	return { ...provider, apiKey };
}

/**
 * Create the credential, the tool workflow and the agent on a fresh instance.
 * With `integrations`, also connect the webhook integration, publish the agent
 * and activate the workflow that calls it.
 */
export async function seedAgent(client: N8nClient, model: string, integrations: boolean) {
	const provider = modelProvider(model);
	const projectId = await client.personalProjectId();
	const credential = await client.createCredential('Agent bench model', provider.credentialType, {
		apiKey: provider.apiKey,
	});
	const table = await client.createDataTable(projectId, CUSTOMER_TABLE, [
		{ name: 'email', type: 'string' },
		{ name: 'name', type: 'string' },
		{ name: 'plan', type: 'string' },
		{ name: 'city', type: 'string' },
	]);
	await client.insertDataTableRows(projectId, table.id, CUSTOMERS);
	const definitions: Array<[string, string, Partial<IWorkflowBase>]> = [
		[TOOL_NAME, 'Look up an order by its number.', toolWorkflow()],
		[STOCK_TOOL, 'Check how many units of a SKU are in stock.', stockWorkflow()],
		[SHIPPING_TOOL, 'Quote the shipping price for a destination and weight.', shippingWorkflow()],
		[CUSTOMER_TOOL, 'Find a customer by email in the customer table.', customerWorkflow(table.id)],
	];
	const tools = [];
	for (const [name, description, workflow] of definitions) {
		const created = await client.createWorkflow(projectId, workflow);
		await client.activateWorkflow(created.id, created.versionId);
		tools.push({
			type: 'workflow' as const,
			name,
			description,
			workflow: created.name,
			workflowId: created.id,
			requireApproval: false,
		});
	}
	const agent = await client.createAgent(projectId, {
		name: AGENT_NAME,
		model,
		credential: credential.id,
		instructions: AGENT_INSTRUCTIONS,
		tools,
	});
	if (integrations) {
		await client.connectIntegration(projectId, agent.id, {
			type: 'webhook',
			credentialId: '',
			settings: { authentication: 'none' },
		});
		// The Responses API and Message an Agent run the published version.
		await client.publishAgent(projectId, agent.id);
		const caller = await client.createWorkflow(projectId, agentWorkflow(agent.id));
		await client.activateWorkflow(caller.id, caller.versionId);
	}
	return { projectId, agentId: agent.id };
}
