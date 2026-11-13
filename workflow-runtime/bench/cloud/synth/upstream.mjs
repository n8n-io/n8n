// The vendor stub of the synthetic benchmark: one HTTPS and one HTTP
// listener that answer the calls of the synthetic workflows with responses
// of typical size. All data is made up. Unknown routes get `{}` and are
// counted, so a run can show calls that the stub does not know.
//
//   node upstream.mjs --https <port> --http <port> --cert <pem> --key <pem> [--log <file>]
//
// GET /_stub/stats on either listener returns the call counts by route.
import { appendFileSync, readFileSync } from 'node:fs';
import { createServer as createHttp } from 'node:http';
import { createServer as createHttps } from 'node:https';

const arg = (name, fallback) => {
	const i = process.argv.indexOf(`--${name}`);
	return i >= 0 ? process.argv[i + 1] : fallback;
};
const LOG = arg('log', '');

const range = (n) => Array.from({ length: n }, (_, i) => i);
const b64url = (s) => Buffer.from(s).toString('base64url');
const iso = (i) => new Date(Date.UTC(2026, 10, 12, 8, i % 60, i % 60)).toISOString();

// ---- canned data, built once ----

const sheetRows = [
	['id', 'name', 'email', 'company', 'plan', 'seats', 'mrr', 'country', 'owner', 'status', 'createdAt', 'notes'],
	...range(20).map((i) => [
		`cus-${1000 + i}`,
		`Customer ${i}`,
		`customer${i}@example.com`,
		`Company ${i % 7}`,
		i % 3 ? 'pro' : 'starter',
		String(5 + (i % 40)),
		String(49 * ((i % 5) + 1)),
		['DE', 'FR', 'US', 'GB'][i % 4],
		`owner${i % 3}@example.com`,
		i % 4 ? 'active' : 'trial',
		iso(i),
		'Imported from the CRM export of last week.',
	]),
];

const rawMail = (i) =>
	[
		`From: Sender ${i} <sender${i}@example.com>`,
		'To: inbox@example.com',
		`Subject: Invoice ${2000 + i} for your order`,
		`Date: ${new Date(Date.UTC(2026, 10, 12, 8, i)).toUTCString()}`,
		`Message-ID: <msg-${i}@example.com>`,
		'MIME-Version: 1.0',
		'Content-Type: multipart/alternative; boundary="b1"',
		'',
		'--b1',
		'Content-Type: text/plain; charset=utf-8',
		'',
		`Hello,\n\nplease find the invoice ${2000 + i} attached. ${'The total is due in 14 days. '.repeat(12)}\n\nRegards`,
		'--b1',
		'Content-Type: text/html; charset=utf-8',
		'',
		`<p>Hello,</p><p>please find the invoice <b>${2000 + i}</b> attached.</p>${'<p>The total is due in 14 days.</p>'.repeat(12)}`,
		'--b1--',
		'',
	].join('\r\n');

const gmailMessage = (id, format) => {
	const i = Number(id.replace(/\D/g, '')) || 0;
	const headers = [
		{ name: 'From', value: `Sender ${i} <sender${i}@example.com>` },
		{ name: 'To', value: 'inbox@example.com' },
		{ name: 'Subject', value: `Invoice ${2000 + i} for your order` },
		{ name: 'Date', value: new Date(Date.UTC(2026, 10, 12, 8, i)).toUTCString() },
	];
	const base = { id, threadId: `t${id}`, labelIds: ['INBOX', 'UNREAD'], snippet: `Hello, please find the invoice ${2000 + i}`, sizeEstimate: 4096, historyId: '1234', internalDate: String(Date.UTC(2026, 10, 12, 8, i)) };
	if (format === 'raw') return { ...base, raw: b64url(rawMail(i)) };
	return {
		...base,
		payload: {
			mimeType: 'multipart/alternative',
			headers,
			parts: [
				{ mimeType: 'text/plain', body: { size: 400, data: b64url(`Hello, invoice ${2000 + i}. ${'The total is due in 14 days. '.repeat(12)}`) } },
				{ mimeType: 'text/html', body: { size: 600, data: b64url(`<p>Invoice <b>${2000 + i}</b></p>${'<p>Due in 14 days.</p>'.repeat(12)}`) } },
			],
		},
	};
};

const calendarEvents = {
	kind: 'calendar#events',
	summary: 'primary',
	timeZone: 'UTC',
	items: range(20).map((i) => ({
		kind: 'calendar#event',
		id: `evt${i}`,
		status: 'confirmed',
		htmlLink: `https://calendar.example.com/event?eid=${i}`,
		created: iso(i),
		updated: iso(i + 1),
		summary: `Meeting ${i} with Company ${i % 7}`,
		description: 'Agenda: status, next steps, open questions.',
		location: 'Room 4',
		creator: { email: `owner${i % 3}@example.com` },
		organizer: { email: `owner${i % 3}@example.com` },
		start: { dateTime: iso(i), timeZone: 'UTC' },
		end: { dateTime: iso(i + 30), timeZone: 'UTC' },
		attendees: range(3).map((k) => ({ email: `guest${k}@example.com`, responseStatus: 'accepted' })),
	})),
};

const driveFiles = {
	files: range(10).map((i) => ({ id: `file${i}`, name: `invoice-${2000 + i}.pdf`, mimeType: 'application/pdf', modifiedTime: iso(i) })),
};

const orders = range(5).map((i) => ({
	id: `ord-${5000 + i}`,
	status: i % 2 ? 'paid' : 'open',
	amount: 20 + i * 7.5,
	currency: 'EUR',
	customer: { id: `cus-${1000 + i}`, email: `customer${i}@example.com`, name: `Customer ${i}` },
	lines: range(3).map((k) => ({ sku: `SKU-${k}`, qty: k + 1, price: 9.9 + k })),
	createdAt: iso(i),
}));

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel><title>Example News</title><link>https://feeds.example.com/</link><description>Made-up news</description>
${range(12)
	.map(
		(i) => `<item><title>Story ${i}: a new release &amp; its notes</title><link>https://feeds.example.com/story/${i}</link>
<guid isPermaLink="false">story-${i}</guid><dc:creator>Writer ${i % 4}</dc:creator><pubDate>${new Date(Date.UTC(2026, 10, 12, 8, i)).toUTCString()}</pubDate>
<category>news</category><description><![CDATA[<p>Summary of story ${i}. ${'More text about the release. '.repeat(6)}</p>]]></description>
<content:encoded><![CDATA[<p>${'Full text of the story with <b>markup</b>. '.repeat(20)}</p>]]></content:encoded></item>`,
	)
	.join('\n')}
</channel></rss>`;

// ---- routes ----

const json = (body, status = 200) => ({ status, type: 'application/json', body: JSON.stringify(body) });
let seq = 0;

/** @returns {{ route: string, reply: { status: number, type: string, body: string } }} */
function answer(method, host, url, body) {
	const path = url.split('?')[0];
	const q = new URLSearchParams(url.split('?')[1] ?? '');
	seq++;
	if (host.startsWith('oauth2.googleapis.com') || path.endsWith('/oauth2/v2.0/token')) {
		return { route: 'oauth.token', reply: json({ access_token: 'synth-access-token', expires_in: 3599, token_type: 'Bearer' }) };
	}
	if (path.startsWith('/v4/spreadsheets/')) {
		if (path.endsWith(':append')) {
			return { route: 'sheets.append', reply: json({ spreadsheetId: 'synth', tableRange: 'Orders!A1:D10', updates: { updatedRange: `Orders!A${seq % 1000}:D${seq % 1000}`, updatedRows: 1, updatedColumns: 4, updatedCells: 4 } }) };
		}
		if (path.endsWith(':batchUpdate')) {
			return { route: 'sheets.batchUpdate', reply: json({ spreadsheetId: 'synth', totalUpdatedRows: 1, totalUpdatedColumns: 4, totalUpdatedCells: 4, totalUpdatedSheets: 1 }) };
		}
		if (path.includes('/values')) {
			const header = path.includes('Orders') ? [['id', 'email', 'amount', 'status']] : sheetRows;
			const rows = q.get('ranges')?.includes('1:1') || /!1:1|!A1:.*1$/.test(decodeURIComponent(path)) ? [header[0]] : header;
			if (path.endsWith(':batchGet')) return { route: 'sheets.batchGet', reply: json({ spreadsheetId: 'synth', valueRanges: [{ range: 'Sheet!A1:L21', majorDimension: 'ROWS', values: rows }] }) };
			return { route: 'sheets.values', reply: json({ range: 'Sheet!A1:L21', majorDimension: 'ROWS', values: rows }) };
		}
		return {
			route: 'sheets.meta',
			reply: json({
				spreadsheetId: 'synth',
				properties: { title: 'Synthetic' },
				sheets: ['Orders', 'Customers'].map((title, i) => ({ properties: { sheetId: i, title, index: i, gridProperties: { rowCount: 1000, columnCount: 12 } } })),
			}),
		};
	}
	if (path.startsWith('/gmail/v1/users/me/messages/send')) {
		return { route: 'gmail.send', reply: json({ id: `m${seq}`, threadId: `t${seq}`, labelIds: ['SENT'] }) };
	}
	if (path === '/gmail/v1/users/me/messages') {
		return { route: 'gmail.list', reply: json({ messages: range(Number(q.get('maxResults') ?? 10)).map((i) => ({ id: `m${i}`, threadId: `tm${i}` })), resultSizeEstimate: 10 }) };
	}
	if (path.startsWith('/gmail/v1/users/me/messages/')) {
		return { route: 'gmail.get', reply: json(gmailMessage(path.split('/').pop(), q.get('format'))) };
	}
	if (path.startsWith('/gmail/v1/users/me/labels')) {
		return { route: 'gmail.labels', reply: json({ labels: ['INBOX', 'UNREAD', 'SENT'].map((id) => ({ id, name: id, type: 'system' })) }) };
	}
	if (path.startsWith('/calendar/v3/') && path.endsWith('/events')) return { route: 'calendar.events', reply: json(calendarEvents) };
	if (path.startsWith('/calendar/v3/users/me/settings/timezone')) return { route: 'calendar.timezone', reply: json({ value: 'UTC' }) };
	if (path.startsWith('/calendar/v3/')) return { route: 'calendar.other', reply: json({ id: 'primary', timeZone: 'UTC', summary: 'primary' }) };
	if (path.startsWith('/drive/v3/files')) return { route: 'drive.files', reply: json(driveFiles) };
	if (path.startsWith('/api/chat.postMessage')) {
		const channel = (() => {
			try {
				return JSON.parse(body).channel;
			} catch {
				return 'C0SYNTH01';
			}
		})();
		return { route: 'slack.post', reply: json({ ok: true, channel, ts: `1731400000.${String(seq).padStart(6, '0')}`, message: { type: 'message', text: 'ok', user: 'U0SYNTH', ts: `1731400000.${seq}` } }) };
	}
	if (path.startsWith('/api/')) return { route: 'slack.other', reply: json({ ok: true }) };
	if (path.includes('/sendMail')) return { route: 'outlook.send', reply: { status: 202, type: 'application/json', body: '' } };
	if (path.startsWith('/v1.0/')) return { route: 'graph.other', reply: json({ value: [] }) };
	if (/^\/bot[^/]+\/send\w+/.test(path)) {
		return { route: 'telegram.send', reply: json({ ok: true, result: { message_id: seq, chat: { id: -100123456, type: 'supergroup' }, date: 1731400000, text: 'ok' } }) };
	}
	if (path === '/v1/orders') return { route: 'api.orders', reply: json(method === 'GET' ? orders : { id: `ord-${seq}`, status: 'created' }) };
	if (path.endsWith('.xml')) return { route: 'rss', reply: { status: 200, type: 'application/rss+xml; charset=utf-8', body: rss } };
	return { route: `unknown ${method} ${host}${path}`, reply: json({}) };
}

const counts = new Map();
function handler(req, res) {
	const chunks = [];
	req.on('data', (c) => chunks.push(c));
	req.on('end', () => {
		const url = req.url ?? '/';
		if (url === '/_stub/stats') {
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify(Object.fromEntries(counts)));
			return;
		}
		const { route, reply } = answer(req.method ?? 'GET', String(req.headers.host ?? ''), url, Buffer.concat(chunks).toString());
		counts.set(route, (counts.get(route) ?? 0) + 1);
		if (LOG && route.startsWith('unknown')) appendFileSync(LOG, `${route}\n`);
		res.writeHead(reply.status, { 'content-type': reply.type });
		res.end(reply.body);
	});
}

const httpsPort = Number(arg('https', '0'));
const httpPort = Number(arg('http', '0'));
const bind = arg('bind', '127.0.0.1');
if (httpsPort) {
	createHttps({ cert: readFileSync(arg('cert', '')), key: readFileSync(arg('key', '')), keepAliveTimeout: 60_000 }, handler).listen(httpsPort, bind);
}
if (httpPort) createHttp({ keepAliveTimeout: 60_000 }, handler).listen(httpPort, bind);
console.log(`upstream: https ${httpsPort}, http ${httpPort}`);
