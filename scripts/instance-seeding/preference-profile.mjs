// Ten hand-written workflows that share one house style.
//
// Written out rather than generated. The point is that "what does this org normally
// do?" has a checkable answer, which needs the answer to be a fact about the estate
// and not an artifact of sampling. Names describe what the nodes do, so a reader
// does not learn something false from the title.

// Five rules, no exceptions: at n=10 an exception is indistinguishable from noise.
// Each rule is a place n8n offers a real choice. A rule with no alternative is a
// constraint, not a preference, and detecting it proves nothing.
export const HOUSE_STYLE = {
	// Alternatives: Anthropic, Gemini, Mistral, Ollama, Azure OpenAI.
	chatModel: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
	chatModelName: 'gpt-4o-mini',
	// Alternatives: Jira, GitHub Issues, Asana, Trello, ClickUp.
	tracker: 'n8n-nodes-base.linear',
	// Alternatives: Discord, Teams, Telegram, email.
	notifier: 'n8n-nodes-base.slack',
	// Alternatives: the `interval` rule form, which the estate profile uses.
	scheduleStyle: 'cronExpression',
	// Every workflow's last node writes one row to `automation_runs`.
	auditTable: 'automation_runs',
};

export const PREFERENCE_PROJECT = 'Automation Platform';

// Read and written by the workflows, not decoration. Three read `customer_accounts`;
// all ten write `automation_runs`, which puts the audit convention in the data too.
export const PREFERENCE_DATA_TABLES = [
	{
		name: 'customer_accounts',
		columns: [
			{ name: 'account_id', type: 'string' },
			{ name: 'company', type: 'string' },
			{ name: 'plan', type: 'string' },
			{ name: 'health_score', type: 'number' },
			{ name: 'renewal_date', type: 'string' },
			{ name: 'invoice_overdue_days', type: 'number' },
		],
		// Tabular, in column order, because six objects with six keys each is 48 lines
		// of the same shape and harder to scan for the values that matter.
		rows: [
			['acc_1001', 'Northwind Trading', 'enterprise', 82, '2026-03-01', 0],
			['acc_1002', 'Contoso Logistics', 'growth', 41, '2026-02-14', 12],
			['acc_1003', 'Fabrikam Health', 'enterprise', 67, '2026-05-20', 0],
			['acc_1004', 'Tailspin Media', 'starter', 29, '2026-01-30', 34],
			['acc_1005', 'Proseware Analytics', 'growth', 74, '2026-04-11', 0],
			['acc_1006', 'Litware Robotics', 'enterprise', 55, '2026-02-28', 7],
		].map(([account_id, company, plan, health_score, renewal_date, invoice_overdue_days]) => ({
			account_id,
			company,
			plan,
			health_score,
			renewal_date,
			invoice_overdue_days,
		})),
	},
	{
		name: 'automation_runs',
		columns: [
			{ name: 'workflow', type: 'string' },
			{ name: 'outcome', type: 'string' },
			{ name: 'detail', type: 'string' },
			{ name: 'ran_at', type: 'string' },
		],
		rows: [],
	},
];

// `env` names the variable that supplies a real token. Without it the seeder writes a
// labelled placeholder, so the workflow stays wired and openable but is not runnable.
export const PREFERENCE_CREDENTIALS = [
	['openai', 'openAiApi', 'OpenAI', 'SEED_OPENAI_API_KEY', 'apiKey'],
	['linear', 'linearApi', 'Linear', 'SEED_LINEAR_API_KEY', 'apiKey'],
	['slack', 'slackApi', 'Slack', 'SEED_SLACK_TOKEN', 'accessToken'],
	['gmail', 'gmailOAuth2', 'Gmail', 'SEED_GMAIL_OAUTH', 'oauthTokenData'],
	['http', 'httpHeaderAuth', 'Enrichment API', 'SEED_ENRICHMENT_TOKEN', 'value'],
].map(([key, type, label, env, field]) => ({
	key,
	type,
	name: `${label} (${PREFERENCE_PROJECT})`,
	env,
	field,
}));

const LINEAR_TEAM_ID = process.env.SEED_LINEAR_TEAM_ID || 'seed-placeholder-team-id';

// Small helpers only. Each workflow spells out its own graph, so "is this a real
// workflow?" is answerable from the recipe without chasing factories.

let x = 0;
const at = (row = 0) => [240 + x++ * 220, 300 + row * 160];
const resetPos = () => {
	x = 0;
};

const scheduleTrigger = (cron) => ({
	parameters: { rule: { interval: [{ field: 'cronExpression', expression: cron }] } },
	id: undefined,
	name: 'Schedule Trigger',
	type: 'n8n-nodes-base.scheduleTrigger',
	typeVersion: 1.4,
	position: at(),
});

const webhookTrigger = (path) => ({
	parameters: { httpMethod: 'POST', path, responseMode: 'lastNode', options: {} },
	id: undefined,
	name: 'Webhook',
	type: 'n8n-nodes-base.webhook',
	typeVersion: 2,
	position: at(),
});

const chatModel = () => ({
	parameters: {
		model: { __rl: true, value: HOUSE_STYLE.chatModelName, mode: 'list' },
		options: {},
	},
	id: undefined,
	name: 'OpenAI Chat Model',
	type: HOUSE_STYLE.chatModel,
	typeVersion: 1.3,
	position: [0, 0], // repositioned by the caller, sub-nodes sit below their root
	credentials: { openai: true },
});

const agent = (name, prompt) => ({
	parameters: {
		promptType: 'define',
		text: prompt,
		options: {},
	},
	id: undefined,
	name,
	type: '@n8n/n8n-nodes-langchain.agent',
	typeVersion: 3.1,
	position: at(),
});

const linearCreate = (name, title, description) => ({
	parameters: {
		resource: 'issue',
		operation: 'create',
		teamId: LINEAR_TEAM_ID,
		title,
		additionalFields: { description },
	},
	id: undefined,
	name,
	type: HOUSE_STYLE.tracker,
	typeVersion: 1.1,
	position: at(),
	credentials: { linear: true },
});

const linearGetAll = (name) => ({
	parameters: { resource: 'issue', operation: 'getAll', returnAll: false, limit: 50 },
	id: undefined,
	name,
	type: HOUSE_STYLE.tracker,
	typeVersion: 1.1,
	position: at(),
	credentials: { linear: true },
});

const slackPost = (name, channel, text) => ({
	parameters: {
		resource: 'message',
		operation: 'post',
		select: 'channel',
		channelId: { __rl: true, value: channel, mode: 'name' },
		text,
		otherOptions: {},
	},
	id: undefined,
	name,
	type: HOUSE_STYLE.notifier,
	typeVersion: 2.7,
	position: at(),
	credentials: { slack: true },
});

const dataTableGet = (name, tableId, filters) => ({
	parameters: {
		resource: 'row',
		operation: 'get',
		dataTableId: { __rl: true, value: tableId, mode: 'id' },
		filters: filters ?? { conditions: [] },
		options: {},
	},
	id: undefined,
	name,
	type: 'n8n-nodes-base.dataTable',
	typeVersion: 1.1,
	position: at(),
});

const auditRow = (tableId, workflowName, detail) => ({
	parameters: {
		resource: 'row',
		operation: 'insert',
		dataTableId: { __rl: true, value: tableId, mode: 'id' },
		columns: {
			mappingMode: 'defineBelow',
			value: {
				workflow: workflowName,
				outcome: 'success',
				detail,
				ran_at: '={{ $now.toISO() }}',
			},
		},
		options: {},
	},
	id: undefined,
	name: 'Record Run',
	type: 'n8n-nodes-base.dataTable',
	typeVersion: 1.1,
	position: at(),
});

const ifNode = (name, leftValue, operator, rightValue) => ({
	parameters: {
		conditions: {
			options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
			conditions: [
				{
					id: 'cond-1',
					leftValue,
					rightValue,
					operator,
				},
			],
			combinator: 'and',
		},
		options: {},
	},
	id: undefined,
	name,
	type: 'n8n-nodes-base.if',
	typeVersion: 2.3,
	position: at(),
});

const numberGt = { type: 'number', operation: 'gt' };
const stringEquals = { type: 'string', operation: 'equals' };

// --- the ten workflows -------------------------------------------------------
// `tables` maps a data-table name to the id the seeder created, so the recipes can
// reference real tables rather than placeholders.

export function preferenceWorkflows(tables) {
	const accounts = tables.customer_accounts;
	const runs = tables.automation_runs;

	/** Chain nodes left to right on `main`, and hang the chat model off its agent. */
	const build = (name, nodes, { modelFor } = {}) => {
		const connections = {};
		const main = nodes.filter((n) => n.name !== 'OpenAI Chat Model');
		for (let i = 0; i < main.length - 1; i++) {
			connections[main[i].name] = {
				main: [[{ node: main[i + 1].name, type: 'main', index: 0 }]],
			};
		}
		if (modelFor) {
			const model = nodes.find((n) => n.name === 'OpenAI Chat Model');
			const root = main.find((n) => n.name === modelFor);
			model.position = [root.position[0], root.position[1] + 200];
			connections['OpenAI Chat Model'] = {
				ai_languageModel: [[{ node: modelFor, type: 'ai_languageModel', index: 0 }]],
			};
		}
		resetPos();
		return { name, nodes, connections };
	};

	return [
		build(
			'Support Inbox Triage',
			[
				scheduleTrigger('*/15 * * * *'),
				{
					parameters: {
						resource: 'message',
						operation: 'getAll',
						returnAll: false,
						limit: 25,
						filters: { readStatus: 'unread' },
					},
					id: undefined,
					name: 'Fetch Unread Support Mail',
					type: 'n8n-nodes-base.gmail',
					typeVersion: 2.2,
					position: at(),
					credentials: { gmail: true },
				},
				agent(
					'Classify Ticket',
					'Read the support email below and reply with one line: "<severity> | <one-sentence summary>". Severity must be one of P1, P2, P3.\n\nSubject: {{ $json.subject }}\nBody: {{ $json.snippet }}',
				),
				chatModel(),
				linearCreate(
					'Open Support Issue',
					'={{ $json.output.split("|")[1].trim() }}',
					'=Raised by Support Inbox Triage.\n\nSeverity: {{ $json.output.split("|")[0].trim() }}',
				),
				slackPost(
					'Notify Support Channel',
					'#support-triage',
					'=New ticket triaged: {{ $json.output }}',
				),
				auditRow(runs, 'Support Inbox Triage', '=Triaged {{ $json.title }}'),
			],
			{ modelFor: 'Classify Ticket' },
		),

		build(
			'Churn Risk Digest',
			[
				scheduleTrigger('0 8 * * 1-5'),
				dataTableGet('Read Accounts', accounts, {
					conditions: [{ keyName: 'health_score', condition: 'lt', keyValue: 50 }],
				}),
				agent(
					'Summarise Churn Risk',
					'These accounts have a health score below 50. Write a three-bullet summary for the customer success team, naming the accounts and the single clearest risk for each.\n\n{{ JSON.stringify($json) }}',
				),
				chatModel(),
				slackPost('Post Digest', '#cs-alerts', '=Daily churn risk digest:\n{{ $json.output }}'),
				auditRow(runs, 'Churn Risk Digest', 'Digest posted to #cs-alerts'),
			],
			{ modelFor: 'Summarise Churn Risk' },
		),

		build(
			'Incident Intake',
			[
				webhookTrigger('incident-intake'),
				agent(
					'Assess Severity',
					'An incident was reported. Reply with only P1, P2 or P3.\n\nTitle: {{ $json.body.title }}\nDescription: {{ $json.body.description }}',
				),
				chatModel(),
				ifNode('Is P1?', '={{ $json.output.trim() }}', stringEquals, 'P1'),
				linearCreate(
					'Raise Incident',
					'=[{{ $json.output.trim() }}] {{ $json.body.title }}',
					'={{ $json.body.description }}',
				),
				slackPost('Page On-Call', '#incidents', '=P1 incident raised: {{ $json.title }}'),
				auditRow(runs, 'Incident Intake', '=Incident {{ $json.title }} recorded'),
			],
			{ modelFor: 'Assess Severity' },
		),

		build('Lead Enrichment', [
			webhookTrigger('lead-capture'),
			{
				parameters: {
					method: 'GET',
					url: '=https://api.clearbit.com/v2/companies/find?domain={{ $json.body.domain }}',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					options: {},
				},
				id: undefined,
				name: 'Enrich Company',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: at(),
				credentials: { http: true },
			},
			slackPost(
				'Notify Sales',
				'#sales-inbound',
				'=New enriched lead: {{ $json.name }} ({{ $json.metrics.employees }} employees)',
			),
			auditRow(runs, 'Lead Enrichment', '=Enriched {{ $json.name }}'),
		]),

		build(
			'Weekly Engineering Digest',
			[
				scheduleTrigger('0 9 * * 1'),
				linearGetAll('Fetch Open Issues'),
				agent(
					'Write Digest',
					'Summarise this week of Linear issues for an engineering all-hands. Group by theme, keep it under 150 words.\n\n{{ JSON.stringify($json) }}',
				),
				chatModel(),
				slackPost('Post To Engineering', '#engineering', '=Weekly digest:\n{{ $json.output }}'),
				auditRow(runs, 'Weekly Engineering Digest', 'Digest posted to #engineering'),
			],
			{ modelFor: 'Write Digest' },
		),

		build('Invoice Dunning', [
			scheduleTrigger('0 10 * * *'),
			dataTableGet('Read Overdue Accounts', accounts, {
				conditions: [{ keyName: 'invoice_overdue_days', condition: 'gt', keyValue: 5 }],
			}),
			ifNode('Overdue Past Grace?', '={{ $json.invoice_overdue_days }}', numberGt, 30),
			{
				parameters: {
					resource: 'message',
					operation: 'send',
					sendTo: '=billing@{{ $json.company.toLowerCase().replaceAll(" ", "") }}.com',
					subject: '=Invoice overdue: {{ $json.invoice_overdue_days }} days',
					message:
						'=Hello {{ $json.company }},\n\nOur records show an invoice outstanding for {{ $json.invoice_overdue_days }} days. Please let us know if you need a copy.\n\nBilling team',
					options: {},
				},
				id: undefined,
				name: 'Send Dunning Email',
				type: 'n8n-nodes-base.gmail',
				typeVersion: 2.2,
				position: at(),
				credentials: { gmail: true },
			},
			slackPost('Flag To Finance', '#finance-ops', '=Dunning email sent to {{ $json.company }}'),
			auditRow(runs, 'Invoice Dunning', '=Chased {{ $json.company }}'),
		]),

		build(
			'Product Feedback Classifier',
			[
				webhookTrigger('product-feedback'),
				agent(
					'Categorise Feedback',
					'Classify this product feedback into exactly one of: bug, feature-request, praise, confusion. Reply with the label only.\n\n{{ $json.body.message }}',
				),
				chatModel(),
				linearCreate(
					'Log Feedback',
					'=[{{ $json.output.trim() }}] {{ $json.body.message.slice(0, 60) }}',
					'={{ $json.body.message }}\n\nFrom: {{ $json.body.email }}',
				),
				slackPost(
					'Share With Product',
					'#product-feedback',
					'=New {{ $json.output.trim() }} logged: {{ $json.title }}',
				),
				auditRow(runs, 'Product Feedback Classifier', '=Classified as {{ $json.output.trim() }}'),
			],
			{ modelFor: 'Categorise Feedback' },
		),

		build('Onboarding Kickoff', [
			webhookTrigger('onboarding-start'),
			linearCreate(
				'Create Onboarding Issue',
				'=Onboard {{ $json.body.company }}',
				'=New {{ $json.body.plan }} customer.\n\nPrimary contact: {{ $json.body.contact_email }}\nKickoff call: {{ $json.body.kickoff_date }}',
			),
			slackPost(
				'Announce New Customer',
				'#customer-success',
				'=Onboarding started for {{ $json.body.company }} ({{ $json.body.plan }})',
			),
			auditRow(runs, 'Onboarding Kickoff', '=Onboarding opened for {{ $json.body.company }}'),
		]),

		build('Deploy Announcer', [
			webhookTrigger('deploy-complete'),
			{
				parameters: {
					assignments: {
						assignments: [
							{ id: 'a1', name: 'release', value: '={{ $json.body.tag }}', type: 'string' },
							{ id: 'a2', name: 'author', value: '={{ $json.body.author }}', type: 'string' },
							{
								id: 'a3',
								name: 'services',
								value: '={{ $json.body.services.join(", ") }}',
								type: 'string',
							},
						],
					},
					options: {},
				},
				id: undefined,
				name: 'Format Release Note',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: at(),
			},
			slackPost(
				'Announce Release',
				'#releases',
				'=Deployed {{ $json.release }} by {{ $json.author }}. Services: {{ $json.services }}',
			),
			auditRow(runs, 'Deploy Announcer', '=Announced {{ $json.release }}'),
		]),

		build('Stale Issue Sweeper', [
			scheduleTrigger('0 7 * * 3'),
			linearGetAll('Fetch Issues'),
			ifNode(
				'Untouched Over 30 Days?',
				'={{ $now.diff($fromISO($json.updatedAt), "days").days }}',
				numberGt,
				30,
			),
			slackPost(
				'Nudge Owners',
				'#engineering',
				'=Stale issue needs an update: {{ $json.title }} (last touched {{ $json.updatedAt }})',
			),
			auditRow(runs, 'Stale Issue Sweeper', '=Flagged {{ $json.title }}'),
		]),
	];
}
