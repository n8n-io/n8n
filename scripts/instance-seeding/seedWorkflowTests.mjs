#!/usr/bin/env node
/**
 * Seeds a demo of workflow tests for a sub-workflow and its callers.
 *
 * It creates one sub-workflow, "[demo] Normalize signup", and three workflows
 * that call it. Each workflow gets a test file. Each caller file has a contract
 * test and a test that runs the real sub-workflow.
 *
 * Two changes to the sub-workflow break exactly one caller each:
 *
 * - Input contract: in "When called by another workflow", change the type of
 *   `seats` from "Allow any type" to "Number". "[demo] Partner import" sends
 *   `seats` as a string, so its contract test fails.
 * - Output contract: in "Normalize", rename the field `route` to `team`.
 *   "[demo] Website signup" routes on `route`, so its routing test fails.
 *
 * Save the sub-workflow, then click "Run caller tests" on its Tests tab, or
 * submit it for review.
 *
 * Each run deletes the workflows named "[demo] …" first, so it also resets the
 * demo. The test files use the internal REST API, which needs a session. Pass
 * the login in environment variables, never as arguments:
 *
 *   N8N_URL=http://localhost:5678 N8N_EMAIL=… N8N_PASSWORD=… pnpm seed:workflow-tests
 */

const BASE_URL = (process.env.N8N_URL ?? 'http://localhost:5678').replace(/\/$/, '');
const EMAIL = process.env.N8N_EMAIL;
const PASSWORD = process.env.N8N_PASSWORD;
const PREFIX = '[demo] ';

if (!EMAIL || !PASSWORD) {
	console.error('Set N8N_EMAIL and N8N_PASSWORD to the login of an owner or admin.');
	process.exit(1);
}

let cookie = '';

async function request(method, path, body) {
	const response = await fetch(`${BASE_URL}/rest${path}`, {
		method,
		headers: { 'Content-Type': 'application/json', cookie },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const setCookie = response.headers.get('set-cookie');
	if (setCookie) cookie = setCookie.split(';')[0];
	const text = await response.text();
	if (!response.ok) throw new Error(`${method} ${path} failed with ${response.status}: ${text}`);
	return text ? JSON.parse(text).data : undefined;
}

const nodeId = (workflow, index) =>
	`d${workflow}000000-0000-4000-8000-${String(index).padStart(12, '0')}`;

function webhook(workflow, path) {
	return {
		id: nodeId(workflow, 1),
		name: 'Webhook',
		type: 'n8n-nodes-base.webhook',
		typeVersion: 2,
		position: [0, 0],
		webhookId: nodeId(workflow, 100),
		parameters: { httpMethod: 'POST', path, options: {} },
	};
}

/** An Execute Workflow node that sends `email`, `plan` and `seats`, with `seats` as `seatsType`. */
function callNormalize(workflow, sub, seatsType) {
	const field = (id, type) => ({
		id,
		displayName: id,
		required: false,
		defaultMatch: false,
		display: true,
		canBeUsedToMatch: true,
		type,
	});
	return {
		id: nodeId(workflow, 2),
		name: 'Normalize signup',
		type: 'n8n-nodes-base.executeWorkflow',
		typeVersion: 1.2,
		position: [220, 0],
		parameters: {
			workflowId: { __rl: true, value: sub.id, mode: 'list', cachedResultName: sub.name },
			workflowInputs: {
				mappingMode: 'defineBelow',
				value: {
					email: '={{ $json.body.email }}',
					plan: '={{ $json.body.plan }}',
					seats: '={{ $json.body.seats }}',
				},
				matchingColumns: [],
				schema: [field('email', 'string'), field('plan', 'string'), field('seats', seatsType)],
				attemptToConvertTypes: false,
				convertFieldsToString: true,
			},
			options: {},
		},
	};
}

function setNode(workflow, index, name, position, assignments) {
	return {
		id: nodeId(workflow, index),
		name,
		type: 'n8n-nodes-base.set',
		typeVersion: 3.4,
		position,
		parameters: {
			assignments: {
				assignments: assignments.map(([fieldName, value, type], i) => ({
					id: `${name}-${i}`,
					name: fieldName,
					value,
					type,
				})),
			},
			includeOtherFields: true,
			options: {},
		},
	};
}

const chain = (...names) =>
	Object.fromEntries(
		names
			.slice(0, -1)
			.map((name, i) => [name, { main: [[{ node: names[i + 1], type: 'main', index: 0 }]] }]),
	);

const settings = { executionOrder: 'v1' };

const subWorkflow = {
	name: `${PREFIX}Normalize signup`,
	nodes: [
		{
			id: nodeId(1, 1),
			name: 'When called by another workflow',
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			typeVersion: 1.1,
			position: [0, 0],
			parameters: {
				workflowInputs: {
					values: [{ name: 'email' }, { name: 'plan' }, { name: 'seats', type: 'any' }],
				},
			},
		},
		setNode(
			1,
			2,
			'Normalize',
			[220, 0],
			[
				['email', '={{ $json.email.trim().toLowerCase() }}', 'string'],
				['plan', '={{ $json.plan.trim().toLowerCase() }}', 'string'],
				[
					'route',
					"={{ $json.plan.trim().toLowerCase() === 'enterprise' ? 'sales' : 'welcome' }}",
					'string',
				],
			],
		),
	],
	connections: chain('When called by another workflow', 'Normalize'),
	settings,
};

const isSalesLead = {
	id: nodeId(2, 3),
	name: 'Is sales lead?',
	type: 'n8n-nodes-base.if',
	typeVersion: 2.2,
	position: [440, 0],
	parameters: {
		conditions: {
			// Loose, so a missing `route` goes to the false branch instead of failing the node.
			options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
			conditions: [
				{
					id: 'route-is-sales',
					leftValue: '={{ $json.route }}',
					rightValue: 'sales',
					operator: { type: 'string', operation: 'equals' },
				},
			],
			combinator: 'and',
		},
		options: {},
	},
};

const noOp = (index, name, position) => ({
	id: nodeId(2, index),
	name,
	type: 'n8n-nodes-base.noOp',
	typeVersion: 1,
	position,
	parameters: {},
});

const callers = (sub) => [
	{
		name: `${PREFIX}Website signup`,
		nodes: [
			webhook(2, 'demo-website-signup'),
			callNormalize(2, sub, 'number'),
			isSalesLead,
			noOp(4, 'Notify sales', [660, -100]),
			noOp(5, 'Send welcome', [660, 100]),
		],
		connections: {
			...chain('Webhook', 'Normalize signup', 'Is sales lead?'),
			'Is sales lead?': {
				main: [
					[{ node: 'Notify sales', type: 'main', index: 0 }],
					[{ node: 'Send welcome', type: 'main', index: 0 }],
				],
			},
		},
		settings,
	},
	{
		name: `${PREFIX}Partner import`,
		nodes: [
			webhook(3, 'demo-partner-import'),
			// Partners send seats as text, for example "12".
			callNormalize(3, sub, 'string'),
			setNode(3, 3, 'Store partner', [440, 0], [['source', 'partner', 'string']]),
		],
		connections: chain('Webhook', 'Normalize signup', 'Store partner'),
		settings,
	},
	{
		name: `${PREFIX}Billing upgrade`,
		nodes: [
			webhook(4, 'demo-billing-upgrade'),
			callNormalize(4, sub, 'number'),
			setNode(4, 3, 'Create invoice', [440, 0], [['amount', '={{ $json.seats * 10 }}', 'number']]),
		],
		connections: chain('Webhook', 'Normalize signup', 'Create invoice'),
		settings,
	},
];

const header = `import { expect, test } from 'vitest';
import { executeWorkflow, loadPackage } from '@n8n/test';
`;

const contractTest = (id) => `
test('sends the fields that its sub-workflows declare', async () => {
	const workflows = await loadPackage('./package');
	const workflow = workflows.get('${id}');

	const mismatches = workflows
		.issues()
		.filter((issue) => issue.code === 'CONTRACT_MISMATCH' && issue.workflow === workflow.name)
		.map((issue) => issue.message);

	expect(mismatches, mismatches.join('\\n')).toEqual([]);
});
`;

const subTests = (id) => `${header}
test('normalizes the email and the plan', async () => {
	const workflows = await loadPackage('./package');
	const workflow = workflows.get('${id}');

	const result = await executeWorkflow(workflow, {
		input: { email: ' Ada@Example.com ', plan: 'Enterprise', seats: 50 },
	});

	expect(result.output).toEqual([
		{ email: 'ada@example.com', plan: 'enterprise', seats: 50, route: 'sales' },
	]);
});

test('routes a free signup to the welcome flow', async () => {
	const workflows = await loadPackage('./package');
	const workflow = workflows.get('${id}');

	const result = await executeWorkflow(workflow, {
		input: { email: 'grace@example.com', plan: 'free', seats: 1 },
	});

	expect(result.node('Normalize').output).toEqual([
		expect.objectContaining({ route: 'welcome' }),
	]);
});
`;

const websiteSignupTests = (id) => `${header}
test('sends an enterprise signup to sales', async () => {
	const workflows = await loadPackage('./package');
	const workflow = workflows.get('${id}');

	const result = await executeWorkflow(workflow, {
		input: { body: { email: 'Ada@Example.com', plan: 'Enterprise', seats: 50 } },
	});

	expect(result.node('Notify sales').runs).toHaveLength(1);
	expect(result.node('Send welcome').runs).toHaveLength(0);
});

test('sends a free signup a welcome', async () => {
	const workflows = await loadPackage('./package');
	const workflow = workflows.get('${id}');

	const result = await executeWorkflow(workflow, {
		input: { body: { email: 'grace@example.com', plan: 'free', seats: 1 } },
	});

	expect(result.node('Send welcome').runs).toHaveLength(1);
	expect(result.node('Notify sales').runs).toHaveLength(0);
});
${contractTest(id)}`;

const partnerImportTests = (id) => `${header}
test('stores the partner with a normalized email', async () => {
	const workflows = await loadPackage('./package');
	const workflow = workflows.get('${id}');

	const result = await executeWorkflow(workflow, {
		input: { body: { email: 'Partner@Example.com', plan: 'Team', seats: '12' } },
	});

	expect(result.node('Store partner').output).toEqual([
		expect.objectContaining({ email: 'partner@example.com', plan: 'team', source: 'partner' }),
	]);
});
${contractTest(id)}`;

const billingUpgradeTests = (id) => `${header}
test('bills ten per seat', async () => {
	const workflows = await loadPackage('./package');
	const workflow = workflows.get('${id}');

	const result = await executeWorkflow(workflow, {
		input: { body: { email: 'billing@example.com', plan: 'Team', seats: 20 } },
	});

	expect(result.node('Create invoice').output).toEqual([
		expect.objectContaining({ email: 'billing@example.com', amount: 200 }),
	]);
});
${contractTest(id)}`;

const CALLER_TESTS = [websiteSignupTests, partnerImportTests, billingUpgradeTests];

async function clearDemo() {
	const workflows = await request(
		'GET',
		`/workflows?filter=${encodeURIComponent('{"isArchived":false}')}`,
	);
	const archived = await request(
		'GET',
		`/workflows?filter=${encodeURIComponent('{"isArchived":true}')}`,
	);
	for (const workflow of [...workflows, ...archived].filter(({ name }) =>
		name.startsWith(PREFIX),
	)) {
		if (!workflow.isArchived) await request('POST', `/workflows/${workflow.id}/archive`, {});
		await request('DELETE', `/workflows/${workflow.id}`);
		console.log(`Deleted ${workflow.name}`);
	}
}

async function create(workflow, tests) {
	const created = await request('POST', '/workflows', workflow);
	await request('PUT', `/workflows/${created.id}/tests`, { source: tests(created.id) });
	console.log(`Created ${created.name}: ${BASE_URL}/workflow/${created.id}/tests`);
	return created;
}

await request('POST', '/login', { emailOrLdapLoginId: EMAIL, password: PASSWORD });
await clearDemo();
const sub = await create(subWorkflow, subTests);
for (const [index, caller] of callers(sub).entries()) {
	await create(caller, CALLER_TESTS[index]);
}
console.log(`\nOpen the sub-workflow tests: ${BASE_URL}/workflow/${sub.id}/tests`);
