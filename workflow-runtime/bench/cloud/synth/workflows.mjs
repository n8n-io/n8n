// The synthetic workflow mix of the cloud benchmark. It has no customer
// data: each workflow is hand-written. Together they follow the node mix of
// the gym sample `sets/1000` (docs/poc-report.md, "Warm runs of real
// workflows" and "Host CPU by node type and operation"):
//
// - node runs per workflow: about 3.5 (the sample: 3.4 to 3.7);
// - the node types with the largest shares: Code, IF, Google Sheets,
//   Gmail, HTTP Request, RSS, Set, Slack, Filter, Outlook, Drive, Switch,
//   Google Calendar, Telegram;
// - items: mostly 1 per node; list operations return 5 to 20 items with
//   4 to 12 keys each.
//
// Some nodes have parameters that run as library nodes in `wfrt`, others
// have parameters that the library nodes do not take, so they run in the
// fallback host, as in the sample. `copies` is the weight of a workflow in
// 100 runs of the mix.
//
// Every vendor call goes to `upstream.mjs` (or to the gym in its mode).

let nextId = 1;
const node = (name, type, typeVersion, parameters, extra = {}) => ({
	id: `n${nextId++}`,
	name,
	type: type.includes('.') ? type : `n8n-nodes-base.${type}`,
	typeVersion,
	position: [0, 0],
	parameters,
	...extra,
});
const cred = (type, name = type) => ({ credentials: { [type]: { id: `synth-${type}`, name } } });

function chain(name, path, nodes) {
	const trigger = node('Webhook', 'webhook', 2, {
		httpMethod: 'POST',
		path,
		responseMode: 'lastNode',
		options: {},
	});
	const all = [trigger, ...nodes];
	const connections = {};
	for (let i = 0; i < all.length - 1; i++) {
		connections[all[i].name] = { main: [[{ node: all[i + 1].name, type: 'main', index: 0 }]] };
	}
	return { name, nodes: all, connections, settings: { executionOrder: 'v1' } };
}

// A small Code node, as users write them: reshape the items.
const NORMALIZE = `const out = [];
for (const item of $input.all()) {
  const b = item.json.body ?? item.json;
  out.push({ json: {
    id: String(b.id),
    email: String(b.email || '').toLowerCase(),
    name: (b.firstName + ' ' + b.lastName).trim(),
    amount: Number(b.amount) || 0,
    status: b.status === 'paid' ? 'paid' : 'open',
    tags: (b.tags || []).map((t) => t.toUpperCase()),
    receivedAt: new Date().toISOString(),
  } });
}
return out;`;

const SUMMARIZE = `const items = $input.all();
const total = items.reduce((s, i) => s + (Number(i.json.amount) || 0), 0);
return [{ json: { count: items.length, total, first: items[0]?.json?.id ?? null, at: Date.now() } }];`;

const HTML_BODY = `const b = $json.body ?? $json;
const rows = (b.lines || []).map((l) => '<tr><td>' + l.sku + '</td><td>' + l.qty + '</td><td>' + l.price + '</td></tr>').join('');
return [{ json: { to: b.email, subject: 'Order ' + b.id + ' confirmed', html: '<h1>Thanks ' + b.firstName + '</h1><table>' + rows + '</table>' } }];`;

const PICK = `return $input.all().slice(0, 5).map((i) => ({ json: { title: i.json.title, link: i.json.link, date: i.json.isoDate } }));`;

const condition = (left, op, right) => ({
	conditions: {
		options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
		conditions: [{ id: 'c1', leftValue: left, rightValue: right, operator: op }],
		combinator: 'and',
	},
	options: {},
});
const gt = { type: 'number', operation: 'gt' };
const notEmpty = { type: 'string', operation: 'notEmpty', singleValue: true };

const assignments = (pairs) => ({
	assignments: {
		assignments: pairs.map(([name, value, type = 'string'], i) => ({ id: `a${i}`, name, value, type })),
	},
	options: {},
});

const SHEET = 'synth-sheet-0001';

export const workflows = [
	{
		copies: 15,
		workflow: chain('code-if-set', 'synth/code-if-set', [
			node('Normalize', 'code', 2, { jsCode: NORMALIZE }),
			node('Paid?', 'if', 2.2, condition('={{ $json.amount }}', gt, 10)),
			node('Shape', 'set', 3.4, assignments([
				['orderId', '={{ $json.id }}'],
				['customer', '={{ $json.name }}'],
				['total', '={{ $json.amount * 1.19 }}', 'number'],
				['label', '={{ "Order " + $json.id + " for " + $json.email }}'],
			])),
		]),
	},
	{
		copies: 6,
		workflow: chain('code-code', 'synth/code-code', [
			node('Normalize', 'code', 2, { jsCode: NORMALIZE }),
			node('Summarize', 'code', 2, { jsCode: SUMMARIZE }),
		]),
	},
	{
		copies: 7,
		workflow: chain('if-sheets-append', 'synth/sheets-append', [
			node('Has email?', 'if', 2.2, condition('={{ $json.body.email }}', notEmpty, '')),
			node('Append row', 'googleSheets', 4.5, {
				operation: 'append',
				documentId: { __rl: true, mode: 'id', value: SHEET },
				sheetName: { __rl: true, mode: 'name', value: 'Orders' },
				columns: {
					mappingMode: 'autoMapInputData',
					value: {
						id: '={{ $json.body.id }}',
						email: '={{ $json.body.email }}',
						amount: '={{ $json.body.amount }}',
						status: '={{ $json.body.status }}',
					},
					matchingColumns: [],
					schema: ['id', 'email', 'amount', 'status'].map((id) => ({ id, displayName: id, type: 'string', canBeUsedToMatch: true, display: true, required: false })),
				},
				options: {},
			}, cred('googleSheetsOAuth2Api')),
		]),
	},
	// Append or update: not in the library node, so it runs in the host.
	{
		copies: 7,
		workflow: chain('if-sheets-upsert', 'synth/sheets-upsert', [
			node('Has email?', 'if', 2.2, condition('={{ $json.body.email }}', notEmpty, '')),
			node('Upsert row', 'googleSheets', 4.5, {
				operation: 'appendOrUpdate',
				documentId: { __rl: true, mode: 'id', value: SHEET },
				sheetName: { __rl: true, mode: 'name', value: 'Orders' },
				columns: {
					mappingMode: 'defineBelow',
					value: {
						id: '={{ $json.body.id }}',
						email: '={{ $json.body.email }}',
						amount: '={{ $json.body.amount }}',
						status: '={{ $json.body.status }}',
					},
					matchingColumns: ['id'],
					schema: ['id', 'email', 'amount', 'status'].map((id) => ({ id, displayName: id, type: 'string', canBeUsedToMatch: true, display: true, required: false })),
				},
				options: {},
			}, cred('googleSheetsOAuth2Api')),
		]),
	},
	{
		copies: 10,
		workflow: chain('sheets-read-code', 'synth/sheets-read', [
			node('Read rows', 'googleSheets', 4.5, {
				documentId: { __rl: true, mode: 'id', value: SHEET },
				sheetName: { __rl: true, mode: 'name', value: 'Customers' },
				options: {},
			}, cred('googleSheetsOAuth2Api')),
			node('Summarize', 'code', 2, { jsCode: SUMMARIZE }),
		]),
	},
	{
		copies: 8,
		workflow: chain('code-gmail-send', 'synth/gmail-send', [
			node('Build mail', 'code', 2, { jsCode: HTML_BODY }),
			node('Send mail', 'gmail', 2.1, {
				sendTo: '={{ $json.to }}',
				subject: '={{ $json.subject }}',
				message: '={{ $json.html }}',
				options: { appendAttribution: false },
			}, cred('gmailOAuth2')),
		]),
	},
	{
		copies: 4,
		workflow: chain('gmail-list-filter', 'synth/gmail-list', [
			node('List mail', 'gmail', 2.1, {
				operation: 'getAll',
				limit: 3,
				simple: false,
				filters: { q: 'is:unread' },
				options: {},
			}, cred('gmailOAuth2')),
			node('Has subject', 'filter', 2.2, condition('={{ $json.subject }}', notEmpty, '')),
		]),
	},
	{
		copies: 11,
		workflow: chain('http-code', 'synth/http-code', [
			node('Get orders', 'httpRequest', 4.2, {
				url: 'https://api.example.com/v1/orders',
				sendQuery: true,
				queryParameters: { parameters: [{ name: 'customer', value: '={{ $json.body.id }}' }] },
				options: {},
			}),
			node('Summarize', 'code', 2, { jsCode: SUMMARIZE }),
			node('Tag', 'set', 3.4, assignments([['checkedAt', '={{ $now.toISO() }}'], ['source', 'orders-api']])),
		]),
	},
	{
		copies: 9,
		workflow: chain('rss-filter-code', 'synth/rss', [
			node('Read feed', 'rssFeedRead', 1.2, { url: 'https://feeds.example.com/news.xml', options: {} }),
			node('Recent', 'filter', 2.2, condition('={{ $json.title }}', notEmpty, '')),
			node('Pick', 'code', 2, { jsCode: PICK }),
		]),
	},
	{
		copies: 6,
		workflow: chain('slack-post', 'synth/slack', [
			node('Big order?', 'if', 2.2, condition('={{ $json.body.amount }}', gt, 0)),
			// Version 1 parameters: the library node does not take them, so this runs in the host.
			node('Post', 'slack', 1, {
				channel: '#orders',
				text: '={{ "New order " + $("Webhook").item.json.body.id + " from " + $("Webhook").item.json.body.email }}',
				attachments: [],
				otherOptions: {},
			}, cred('slackApi')),
		]),
	},
	{
		copies: 5,
		workflow: chain('outlook-send', 'synth/outlook', [
			node('Send', 'microsoftOutlook', 2, {
				resource: 'message',
				operation: 'send',
				toRecipients: '={{ $json.body.email }}',
				subject: '={{ "Your order " + $json.body.id }}',
				bodyContent: '={{ $json.body.message }}',
				additionalFields: {},
			}, cred('microsoftOutlookOAuth2Api')),
		]),
	},
	{
		copies: 3,
		workflow: chain('drive-search-code', 'synth/drive', [
			node('Search', 'googleDrive', 3, {
				resource: 'fileFolder',
				searchMethod: 'query',
				queryString: "name contains 'invoice'",
				limit: 10,
				filter: {},
				options: { fields: ['id', 'name', 'mimeType', 'modifiedTime'] },
			}, cred('googleDriveOAuth2Api')),
			node('Summarize', 'code', 2, { jsCode: SUMMARIZE }),
		]),
	},
	{
		copies: 3,
		workflow: chain('switch-set', 'synth/switch', [
			node('Route', 'switch', 3.2, {
				rules: {
					values: ['paid', 'open'].map((v) => ({
						conditions: {
							options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
							conditions: [{ leftValue: '={{ $json.body.status }}', rightValue: v, operator: { type: 'string', operation: 'equals' } }],
							combinator: 'and',
						},
					})),
				},
				options: { fallbackOutput: 'extra' },
			}),
			node('Mark', 'set', 3.4, assignments([['routed', 'true', 'boolean'], ['id', '={{ $json.body.id }}']])),
		]),
	},
	{
		copies: 4,
		workflow: chain('calendar-list-code', 'synth/calendar', [
			// Version 1: runs in the host, as most Calendar list steps of the sample do.
			node('Events', 'googleCalendar', 1, {
				operation: 'getAll',
				calendar: 'primary',
				limit: 20,
				options: { orderBy: 'startTime', singleEvents: true },
			}, cred('googleCalendarOAuth2Api')),
			node('Summarize', 'code', 2, { jsCode: SUMMARIZE }),
		]),
	},
	{
		copies: 2,
		workflow: chain('telegram-send', 'synth/telegram', [
			node('Send', 'telegram', 1.2, {
				operation: 'sendPhoto',
				chatId: '-100123456',
				file: 'https://api.example.com/v1/receipt.png',
				additionalFields: { caption: '={{ "Order " + $json.body.id + " paid" }}' },
			}, cred('telegramApi')),
		]),
	},
];

// Credentials of the synthetic workflows: test values only, no real secrets.
const token = { access_token: 'synth-access-token', token_type: 'Bearer', expires_in: 3599, scope: '' };
const oauth = (extra = {}) => ({ clientId: 'synth-client', clientSecret: 'synth-secret', oauthTokenData: token, ...extra });
export const credentials = {
	googleSheetsOAuth2Api: oauth(),
	gmailOAuth2: oauth(),
	googleDriveOAuth2Api: oauth(),
	googleCalendarOAuth2Api: oauth(),
	microsoftOutlookOAuth2Api: oauth(),
	slackApi: { accessToken: 'xoxb-synth' },
	telegramApi: { accessToken: '123456:synth', baseUrl: 'https://api.telegram.org' },
};

/** A request body of typical size (about 600 bytes, 12 keys). */
export function requestBody(seq) {
	return {
		id: `ord-${100000 + seq}`,
		email: `Customer${seq % 997}@Example.com`,
		firstName: 'Ada',
		lastName: `Tester${seq % 31}`,
		amount: (seq % 50) * 3.5 + 4,
		currency: 'EUR',
		status: seq % 3 === 0 ? 'open' : 'paid',
		tags: ['web', seq % 2 ? 'repeat' : 'new'],
		message: 'Hello, please confirm my order and send the invoice to the address on file. '.repeat(3),
		lines: [
			{ sku: 'SKU-1', qty: 1, price: 19.9 },
			{ sku: 'SKU-2', qty: (seq % 4) + 1, price: 5.5 },
		],
		source: 'checkout',
		createdAt: '2026-11-12T10:00:00.000Z',
	};
}

/** Vendor hosts that go to the upstream stub. */
export const hosts = [
	'*.googleapis.com',
	'oauth2.googleapis.com',
	'www.googleapis.com',
	'slack.com',
	'graph.microsoft.com',
	'login.microsoftonline.com',
	'api.telegram.org',
	'api.example.com',
	'feeds.example.com',
];
