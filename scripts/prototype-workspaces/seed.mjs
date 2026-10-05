/**
 * PROTOTYPE (workspaces) — throwaway. Seeds demo data through the REST API.
 *
 *   Instance      credential "Acme API key", data table "Country codes", variables REGION, SUPPORT_EMAIL
 *   Finance       credential "Stripe", data table "Finance customers", variable REGION (overrides)
 *     Payroll     credential "Payroll DB", data table "Employees", variable PAYROLL_CUTOFF_DAY
 *     Invoicing   credential "Invoicing mailer"
 *     Forecasting created by Alice (workspace admin)
 *   Marketing     credential "HubSpot"; projects Campaigns, Website. Members get every
 *                 project (Carol is a member).
 *   Engineering   private, nobody has joined it; projects Platform, Data
 */
const PASSWORD = 'Prototype123';

class Client {
	cookie = '';

	constructor(baseUrl) {
		this.baseUrl = baseUrl;
	}

	async req(method, route, body) {
		const res = await fetch(`${this.baseUrl}/rest${route}`, {
			method,
			headers: {
				'content-type': 'application/json',
				'browser-id': 'prototype-workspaces-seed',
				...(this.cookie ? { cookie: this.cookie } : {}),
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		});
		const auth = res.headers.getSetCookie().find((c) => c.startsWith('n8n-auth='));
		if (auth) this.cookie = auth.split(';')[0];
		const text = await res.text();
		if (!res.ok) throw new Error(`${method} ${route} → ${res.status}: ${text}`);
		const json = text ? JSON.parse(text) : {};
		return json.data ?? json;
	}
}

const credential = async (client, projectId, name) =>
	await client.req('POST', '/credentials', {
		name,
		type: 'httpHeaderAuth',
		data: { name: 'X-Api-Key', value: `demo-${name.toLowerCase().replace(/\W+/g, '-')}` },
		projectId,
	});

const dataTable = async (client, projectId, name, columns, rows) => {
	const table = await client.req('POST', `/projects/${projectId}/data-tables`, {
		name,
		columns: columns.map((c) => ({ name: c, type: 'string' })),
	});
	await client.req('POST', `/projects/${projectId}/data-tables/${table.id}/insert`, { data: rows });
	return table;
};

const variable = async (client, projectId, key, value) =>
	await client.req('POST', '/variables', { key, value, projectId });

const addMember = async (client, projectId, userId, role) =>
	await client.req('POST', `/projects/${projectId}/users`, { relations: [{ userId, role }] });

function demoWorkflow({ name, projectId, baseUrl, credentialRef, table }) {
	return {
		name,
		projectId,
		active: false,
		settings: { executionOrder: 'v1' },
		nodes: [
			{
				id: 'trigger',
				name: 'When clicking ‘Execute workflow’',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'vars',
				name: 'Inherited variables',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [220, 0],
				parameters: {
					assignments: {
						assignments: [
							{ id: 'a', name: 'REGION', value: '={{ $vars.REGION }}', type: 'string' },
							{ id: 'b', name: 'SUPPORT_EMAIL', value: '={{ $vars.SUPPORT_EMAIL }}', type: 'string' },
							{
								id: 'c',
								name: 'PAYROLL_CUTOFF_DAY',
								value: '={{ $vars.PAYROLL_CUTOFF_DAY }}',
								type: 'string',
							},
						],
					},
					options: {},
				},
			},
			{
				id: 'table',
				name: 'Workspace data table',
				type: 'n8n-nodes-base.dataTable',
				typeVersion: 1.1,
				position: [440, 0],
				alwaysOutputData: true,
				executeOnce: true,
				parameters: {
					operation: 'get',
					dataTableId: { __rl: true, mode: 'list', value: table.id, cachedResultName: table.name },
					returnAll: true,
				},
			},
			{
				id: 'http',
				name: 'Call with workspace credential',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [660, 0],
				executeOnce: true,
				parameters: {
					url: `${baseUrl}/healthz`,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					options: {},
				},
				credentials: { httpHeaderAuth: credentialRef },
			},
		],
		connections: {
			'When clicking ‘Execute workflow’': {
				main: [[{ node: 'Inherited variables', type: 'main', index: 0 }]],
			},
			'Inherited variables': { main: [[{ node: 'Workspace data table', type: 'main', index: 0 }]] },
			'Workspace data table': {
				main: [[{ node: 'Call with workspace credential', type: 'main', index: 0 }]],
			},
		},
	};
}

export async function seed(baseUrl) {
	console.log('[prototype] seeding demo data…');
	const owner = new Client(baseUrl);
	await owner.req('POST', '/owner/setup', {
		email: 'owner@acme.test',
		firstName: 'Olivia',
		lastName: 'Owner',
		password: PASSWORD,
	});

	const people = [
		{ key: 'admin', firstName: 'Adam', lastName: 'Admin', role: 'global:admin' },
		{ key: 'alice', firstName: 'Alice', lastName: 'Finance', role: 'global:member' },
		{ key: 'bob', firstName: 'Bob', lastName: 'Payroll', role: 'global:member' },
		{ key: 'carol', firstName: 'Carol', lastName: 'Invoicing', role: 'global:member' },
	];
	const invites = await owner.req(
		'POST',
		'/invitations',
		people.map((p) => ({ email: `${p.key}@acme.test`, role: p.role })),
	);
	const users = {};
	const clients = { owner };
	for (const person of people) {
		const invite = invites.find((i) => i.user.email === `${person.key}@acme.test`);
		const token = new URL(invite.user.inviteAcceptUrl).searchParams.get('token');
		const client = new Client(baseUrl);
		await client.req('POST', '/invitations/accept', {
			token,
			firstName: person.firstName,
			lastName: person.lastName,
			password: PASSWORD,
		});
		users[person.key] = invite.user.id;
		clients[person.key] = client;
	}

	const myProjects = await owner.req('GET', '/projects/my-projects');
	const instance = myProjects.find((p) => p.type === 'instance');

	// Workspaces
	const finance = await owner.req('POST', '/workspaces', {
		name: 'Finance',
		icon: { type: 'emoji', value: '💰' },
		description: 'Money in, money out.',
	});
	const marketing = await clients.admin.req('POST', '/workspaces', {
		name: 'Marketing',
		icon: { type: 'emoji', value: '📣' },
	});
	const engineering = await owner.req('POST', '/workspaces', {
		name: 'Engineering',
		icon: { type: 'emoji', value: '🛠️' },
	});
	await owner.req('POST', `/workspaces/${engineering.id}/leave`);
	await owner.req('POST', `/workspaces/${marketing.id}/join`);
	await addMember(owner, finance.id, users.alice, 'project:admin');

	// Projects
	const newProject = async (client, workspace, name, emoji) =>
		await client.req('POST', `/workspaces/${workspace.id}/projects`, {
			name,
			icon: { type: 'emoji', value: emoji },
		});
	const payroll = await newProject(owner, finance, 'Payroll', '🧾');
	const invoicing = await newProject(owner, finance, 'Invoicing', '📨');
	await newProject(clients.alice, finance, 'Forecasting', '📈');
	await newProject(clients.admin, marketing, 'Campaigns', '🎯');
	await newProject(clients.admin, marketing, 'Website', '🌐');
	await newProject(owner, engineering, 'Platform', '🧱');
	await newProject(owner, engineering, 'Data', '🗄️');
	await addMember(owner, payroll.id, users.bob, 'project:editor');
	await addMember(owner, invoicing.id, users.carol, 'project:editor');

	// Access options
	await owner.req('PATCH', `/workspaces/${engineering.id}/access`, { isPublic: false });
	await clients.admin.req('PATCH', `/workspaces/${marketing.id}/access`, { cascadeMembers: true });
	await addMember(clients.admin, marketing.id, users.carol, 'project:editor');

	const bobWorkspaces = await clients.bob.req('GET', '/workspaces');
	const bobPersonal = bobWorkspaces.find((w) => w.type === 'personalWorkspace');
	await newProject(clients.bob, bobPersonal, 'Side project', '🧪');

	// Resources
	const instanceCred = await credential(owner, instance.id, 'Acme API key (instance)');
	const stripe = await credential(owner, finance.id, 'Stripe (Finance workspace)');
	const payrollDb = await credential(owner, payroll.id, 'Payroll DB (Payroll only)');
	await credential(owner, invoicing.id, 'Invoicing mailer (Invoicing only)');
	await credential(clients.admin, marketing.id, 'HubSpot (Marketing workspace)');
	await credential(clients.bob, bobPersonal.id, "Bob's GitHub (Bob's personal workspace)");

	await dataTable(owner, instance.id, 'Country codes', ['country', 'code'], [
		{ country: 'Germany', code: 'DE' },
		{ country: 'France', code: 'FR' },
	]);
	const customers = await dataTable(owner, finance.id, 'Finance customers', ['name', 'plan'], [
		{ name: 'Globex', plan: 'enterprise' },
		{ name: 'Initech', plan: 'starter' },
	]);
	await dataTable(owner, payroll.id, 'Employees', ['name', 'team'], [
		{ name: 'Bob', team: 'Payroll' },
	]);

	await variable(owner, instance.id, 'REGION', 'us-east-1');
	await variable(owner, instance.id, 'SUPPORT_EMAIL', 'support@acme.test');
	await variable(owner, finance.id, 'REGION', 'eu-west-1');
	await variable(owner, payroll.id, 'PAYROLL_CUTOFF_DAY', '25');

	// Workflows
	await owner.req(
		'POST',
		'/workflows',
		demoWorkflow({
			name: 'Inheritance demo (uses Finance + instance resources)',
			projectId: payroll.id,
			baseUrl,
			credentialRef: { id: stripe.id, name: stripe.name },
			table: customers,
		}),
	);
	await owner.req(
		'POST',
		'/workflows',
		demoWorkflow({
			name: 'Sibling leak (uses a Payroll credential — must fail)',
			projectId: invoicing.id,
			baseUrl,
			credentialRef: { id: payrollDb.id, name: payrollDb.name },
			table: customers,
		}),
	);
	void instanceCred;
	console.log('[prototype] seeded');
}
