import { randomUUID } from 'node:crypto';

export const PREFIX = '[self-healing playground] ';
export const WEBHOOK_PREFIX = 'self-healing-playground/';

export const scenarios = [
	{
		id: 'wrong-field',
		name: 'Invoice field mix-up',
		description:
			'An invoice total reads an email address instead of the amount. The number field rejects it.',
		expectation: 'A repair should read the amount and return a numeric total.',
		outcome: 'Repair candidate',
		input: { orderId: 'ORDER-101', customer: { email: 'buyer@example.com' }, amount: 42.5 },
		alternateInput: { orderId: 'ORDER-102', customer: { email: 'other@example.com' }, amount: 19 },
	},
	{
		id: 'wrong-shape',
		name: 'Order output shape',
		description: 'The output node returns an array where it requires a JSON object.',
		expectation: 'A repair should return an object with an items array and preserve every item.',
		outcome: 'Repair candidate',
		input: {
			items: [
				{ sku: 'BOOK', quantity: 2 },
				{ sku: 'PEN', quantity: 3 },
			],
		},
		alternateInput: { items: [{ sku: 'PAD', quantity: 5 }] },
	},
	{
		id: 'unavailable-service',
		name: 'Account API unavailable',
		description: 'An HTTP Request node calls an unavailable example API.',
		expectation:
			'Look for an honest service blocker. The example API is deliberately unavailable. A working account API URL must come from you.',
		outcome: 'Needs attention candidate',
		input: { accountId: 'ACCOUNT-101' },
		alternateInput: { accountId: 'ACCOUNT-102' },
	},
	{
		id: 'healthy',
		name: 'Healthy invoice',
		description: 'A valid invoice transformation succeeds without a self-healing investigation.',
		expectation: 'Expect a successful execution and no new self-healing result.',
		outcome: 'Healthy control',
		input: { orderId: 'ORDER-101', amount: 42.5 },
		alternateInput: { orderId: 'ORDER-102', amount: 19 },
	},
];

export function createWorkflow(scenarioId, projectId) {
	const scenario = scenarios.find(({ id }) => id === scenarioId);
	if (!scenario) throw new Error('Unknown scenario. Select a scenario from the dashboard.');
	const runId = randomUUID();
	const webhook = {
		id: randomUUID(),
		name: 'Receive order',
		type: 'n8n-nodes-base.webhook',
		typeVersion: 2.1,
		position: [0, 0],
		webhookId: randomUUID(),
		parameters: {
			httpMethod: 'POST',
			path: `${WEBHOOK_PREFIX}${scenario.id}/${runId}`,
			responseMode: 'lastNode',
			responseData: 'firstEntryJson',
			options: {},
		},
	};
	const transform = {
		id: randomUUID(),
		name: scenario.id === 'wrong-shape' ? 'Prepare order output' : 'Prepare invoice',
		type: 'n8n-nodes-base.set',
		typeVersion: 3.4,
		position: [280, 0],
		notes: scenario.expectation,
		notesInFlow: true,
		parameters: {
			assignments: {
				assignments: [
					{ id: randomUUID(), name: 'orderId', type: 'string', value: '={{ $json.body.orderId }}' },
					{
						id: randomUUID(),
						name: 'total',
						type: 'number',
						value:
							scenario.id === 'wrong-field'
								? '={{ $json.body.customer.email }}'
								: '={{ $json.body.amount }}',
					},
				],
			},
			options: {},
		},
	};
	if (scenario.id === 'wrong-shape') {
		transform.parameters = { mode: 'raw', jsonOutput: '={{ $json.body.items }}', options: {} };
	}
	if (scenario.id === 'unavailable-service') {
		transform.name = 'Read account';
		transform.type = 'n8n-nodes-base.httpRequest';
		transform.typeVersion = 4.2;
		transform.parameters = {
			url: 'https://api.example.invalid/account',
			options: { timeout: 5000 },
		};
	}
	return {
		name: `${PREFIX}${scenario.name} · ${runId.slice(0, 8)}`,
		...(projectId ? { projectId } : {}),
		nodes: [webhook, transform],
		connections: { [webhook.name]: { main: [[{ node: transform.name, type: 'main', index: 0 }]] } },
		settings: {
			executionOrder: 'v1',
			saveDataErrorExecution: 'all',
			saveDataSuccessExecution: 'all',
		},
	};
}

export function identifyWorkflow(workflow) {
	if (!workflow.name?.startsWith(PREFIX)) return null;
	const webhook = workflow.nodes?.find(
		(node) =>
			node.type === 'n8n-nodes-base.webhook' && node.parameters.path?.startsWith(WEBHOOK_PREFIX),
	);
	if (!webhook) return null;
	const scenario = scenarios.find(({ id }) => id === webhook.parameters.path.split('/')[1]);
	return scenario ? { scenario, path: webhook.parameters.path } : null;
}
