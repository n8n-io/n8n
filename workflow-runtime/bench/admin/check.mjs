// Checks for bench/admin-test.sh. `before` runs against a fresh wfrt;
// `after` runs against the same log after a restart.
import { readFileSync, writeFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const [phase, tmp, port, adminPort, echoPort] = process.argv.slice(2);
const secret = process.env.WFRT_TEST_ADMIN_SECRET;
const admin = `http://127.0.0.1:${adminPort}`;
const pub = `http://127.0.0.1:${port}`;
const auth = { authorization: `Bearer ${secret}` };

const moduleB64 = (name) => readFileSync(`${tmp}/${name}/${name}.wfm`).toString('base64');

async function call(method, path, body, base = admin) {
	if (process.env.CHECK_DEBUG) console.error(method, path);
	const res = await fetch(base + path, {
		method,
		headers: { ...auth, 'content-type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const text = await res.text();
	let json;
	try {
		json = text ? JSON.parse(text) : undefined;
	} catch {
		json = text;
	}
	return { status: res.status, json };
}

/** Reads the event stream in the background. */
async function openEvents() {
	const res = await fetch(`${admin}/_admin/events`, { headers: auth });
	assert.equal(res.status, 200);
	const events = [];
	const reader = res.body.getReader();
	const dec = new TextDecoder();
	let buf = '';
	(async () => {
		for (;;) {
			const { value, done } = await reader.read();
			if (done) return;
			buf += dec.decode(value, { stream: true });
			let nl;
			while ((nl = buf.indexOf('\n')) >= 0) {
				events.push(JSON.parse(buf.slice(0, nl)));
				buf = buf.slice(nl + 1);
			}
		}
	})().catch(() => {});
	const waitFor = async (pred, what) => {
		for (let i = 0; i < 100; i++) {
			const e = events.find(pred);
			if (e) return e;
			await new Promise((r) => setTimeout(r, 50));
		}
		throw new Error(`no event: ${what}\n${JSON.stringify(events, null, 1)}`);
	};
	return { events, waitFor, close: () => reader.cancel() };
}

async function before() {
	const noAuth = await fetch(`${admin}/_admin/workflows`);
	assert.equal(noAuth.status, 401);

	const ev = await openEvents();
	const second = await fetch(`${admin}/_admin/events`, { headers: auth });
	assert.equal(second.status, 409, 'one stream client at a time');

	// Version 1, active: the webhook answers with version 1.
	let r = await call('PUT', '/_admin/workflows/orders', {
		versionId: 'v1',
		module: moduleB64('orders-v1'),
		active: true,
		webhookPrefix: '/webhook',
	});
	assert.deepEqual(r, { status: 200, json: { ok: true } });
	r = await call('GET', '/_admin/workflows');
	assert.deepEqual(r.json, [
		{
			workflowId: 'orders',
			versionId: 'v1',
			active: true,
			executions: 0,
			routes: ['POST /webhook/orders/:id'],
			schedules: 0,
		},
	]);
	r = await call('POST', '/webhook/orders/42?q=x', { qty: 3 }, pub);
	assert.deepEqual(r, { status: 200, json: { version: 1, id: '42', qty: 3 } });

	// Version 2 replaces it.
	r = await call('PUT', '/_admin/workflows/orders', {
		versionId: 'v2',
		module: moduleB64('orders-v2'),
		active: true,
	});
	assert.equal(r.status, 200);
	r = await call('POST', '/webhook/orders/43/?q=y', { qty: 4 }, pub);
	assert.deepEqual(r.json, { version: 2, items: [{ json: { id: '43', qty: 8, q: 'y' } }] });
	const trig = await ev.waitFor(
		(e) => e.type === 'finished' && e.result?.items?.[0]?.json?.id === '43',
		'webhook finished',
	);
	assert.match(trig.executionId, /^wfrt-\d+$/);
	const trigStart = await ev.waitFor(
		(e) => e.type === 'started' && e.executionId === trig.executionId,
		'webhook started',
	);
	assert.equal(trigStart.mode, 'trigger');
	assert.equal(trigStart.versionId, 'v2');
	assert.deepEqual(trigStart.trigger.params, { id: '43' });
	assert.equal(
		ev.events.some((e) => e.type === 'trace' && e.executionId === trig.executionId),
		false,
		'no trace events without trace: true',
	);

	// Manual run with trace on version 2.
	r = await call('POST', '/_admin/executions', {
		workflowId: 'orders',
		versionId: 'v2',
		executionId: '1001',
		trigger: { body: { qty: 5 }, params: { id: '7' }, query: { q: 'm' } },
		trace: true,
	});
	assert.deepEqual(r, { status: 202, json: { executionId: '1001' } });
	const done = await ev.waitFor((e) => e.type === 'finished' && e.executionId === '1001', 'manual finished');
	assert.equal(done.status, 'ok');
	assert.deepEqual(done.result, { version: 2, items: [{ json: { id: '7', qty: 10, q: 'm' } }] });
	const started = ev.events.find((e) => e.type === 'started' && e.executionId === '1001');
	assert.equal(started.mode, 'manual');
	assert.equal(started.workflowId, 'orders');
	const traces = ev.events.filter((e) => e.type === 'trace' && e.executionId === '1001');
	assert.deepEqual(
		traces.map((t) => [t.step, t.items]),
		[
			['Webhook', [{ json: { id: '7', qty: 5, q: 'm' } }]],
			['Set', [{ json: { id: '7', qty: 10, q: 'm' } }]],
		],
	);
	const order = ev.events.filter((e) => e.executionId === '1001').map((e) => e.type);
	assert.deepEqual(order, ['started', 'trace', 'trace', 'finished']);

	r = await call('POST', '/_admin/executions', { workflowId: 'orders', versionId: 'v1', executionId: '1009' });
	assert.equal(r.status, 409, 'an old version cannot start');
	r = await call('POST', '/_admin/executions', { workflowId: 'orders', executionId: 'abc' });
	assert.equal(r.status, 400);
	r = await call('POST', '/_admin/executions', { workflowId: 'nope', executionId: '1010' });
	assert.equal(r.status, 404);

	// An inactive workflow has no webhook, but runs by hand. Its approval
	// waits, and the resume endpoint answers it.
	r = await call('PUT', '/_admin/workflows/approve', {
		versionId: 'a1',
		module: moduleB64('approve'),
		active: false,
	});
	assert.equal(r.status, 200);
	r = await call('POST', '/webhook/approve', {}, pub);
	assert.equal(r.status, 404);
	r = await call('POST', '/_admin/executions', { workflowId: 'approve', executionId: '1002', trigger: {} });
	assert.equal(r.status, 202);
	const waiting = await ev.waitFor((e) => e.type === 'waiting' && e.executionId === '1002', 'waiting');
	assert.equal(waiting.step, 'Approve');
	// 128 bits from the CSPRNG, as hex; the URL carries it as n8n does.
	assert.match(waiting.signature, /^[0-9a-f]{32}$/);
	assert.equal(waiting.resumeUrl, `/resume/1002/0?signature=${waiting.signature}`);
	r = await call('POST', '/_admin/resume/1002/0', { approved: true });
	assert.equal(r.status, 403, 'a resume needs the signature');
	r = await call('POST', '/_admin/resume/1002/0?signature=0123456789abcdef0123456789abcdef', { approved: true });
	assert.equal(r.status, 403);
	r = await call('POST', `/_admin/resume/1002/0?signature=${waiting.signature}`, { approved: true });
	assert.equal(r.status, 202);
	const approved = await ev.waitFor((e) => e.type === 'finished' && e.executionId === '1002', 'approved');
	assert.deepEqual(approved.result, { approved: true });

	// 1003 stays parked over a replacement and a restart.
	r = await call('POST', '/_admin/executions', { workflowId: 'approve', executionId: '1003' });
	assert.equal(r.status, 202);
	const w1003 = await ev.waitFor((e) => e.type === 'waiting' && e.executionId === '1003', 'waiting 1003');
	// The signature must stay valid after a restart: the log keeps the secret.
	writeFileSync(`${tmp}/sig-1003`, w1003.signature);

	// Unload orders: its webhook goes.
	r = await call('DELETE', '/_admin/workflows/orders');
	assert.equal(r.status, 200);
	r = await call('POST', '/webhook/orders/1', { qty: 1 }, pub);
	assert.equal(r.status, 404);
	r = await call('DELETE', '/_admin/workflows/orders');
	assert.equal(r.status, 404);

	// Replace approve with the orders module, active. 1003 keeps its version.
	r = await call('PUT', '/_admin/workflows/approve', {
		versionId: 'a2',
		module: moduleB64('orders-v1'),
		active: true,
	});
	assert.equal(r.status, 200);
	// Another workflow cannot take the same webhook path.
	r = await call('PUT', '/_admin/workflows/other', {
		versionId: 'o1',
		module: moduleB64('orders-v1'),
		active: true,
	});
	assert.equal(r.status, 409);
	r = await call('PUT', '/_admin/workflows/bad', { versionId: 'b1', module: 'AAAA', active: true });
	assert.equal(r.status, 400);

	await checkCredentials(ev);

	// Respond to Webhook in binary mode: decoded bytes and their type.
	r = await call('PUT', '/_admin/workflows/binary', { versionId: 'b1', module: moduleB64('binary'), active: true });
	assert.equal(r.status, 200);
	const file = await fetch(`${pub}/webhook/file`);
	assert.equal(file.status, 201);
	// The user's content type wins over mimeType; content-length stays ours.
	assert.equal(file.headers.get('content-type'), 'text/csv');
	assert.equal(file.headers.get('cache-control'), 'no-store');
	assert.equal(file.headers.get('content-length'), '12');
	assert.equal(await file.text(), 'hello binary');
	// JSON body with headers; a value with CR LF is dropped.
	const json = await fetch(`${pub}/webhook/file?mode=json`);
	assert.equal(json.status, 200);
	assert.equal(json.headers.get('access-control-allow-origin'), '*');
	assert.equal(json.headers.get('content-type'), 'application/json');
	assert.equal(json.headers.get('x-bad'), null);
	assert.equal(json.headers.get('x-injected'), null);
	assert.deepEqual(await json.json(), { ok: true });

	// Uploaded files: multipart text fields go to body, files to $binary.
	r = await call('PUT', '/_admin/workflows/upload', { versionId: 'u1', module: moduleB64('upload'), active: true });
	assert.equal(r.status, 200);
	const form = new FormData();
	form.append('title', 'Report');
	form.append('docs[]', new Blob(['first'], { type: 'text/plain' }), 'a.txt');
	form.append('docs[]', new Blob([new Uint8Array([0, 255, 10, 13])], { type: 'application/octet-stream' }), 'b.bin');
	let up = await fetch(`${pub}/webhook/upload`, { method: 'POST', body: form });
	assert.equal(up.status, 200);
	assert.deepEqual(await up.json(), {
		body: { title: 'Report' },
		binary: {
			docs0: { data: Buffer.from('first').toString('base64'), mimeType: 'text/plain', fileName: 'a.txt', fileExtension: 'txt', bytes: 5 },
			docs1: { data: Buffer.from([0, 255, 10, 13]).toString('base64'), mimeType: 'application/octet-stream', fileName: 'b.bin', fileExtension: 'bin', bytes: 4 },
		},
	});
	// A body of another type becomes binary `data`.
	up = await fetch(`${pub}/webhook/upload`, { method: 'POST', headers: { 'content-type': 'image/png' }, body: new Uint8Array([137, 80]) });
	assert.deepEqual(await up.json(), {
		body: {},
		binary: { data: { data: Buffer.from([137, 80]).toString('base64'), mimeType: 'image/png', bytes: 2 } },
	});
	up = await fetch(`${pub}/webhook/upload`, { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=x' }, body: 'junk' });
	assert.equal(up.status, 400);

	await checkHooksAndSendWait(ev);
	await checkLargeUpload();
	r = await call('DELETE', '/_admin/executions/999');
	assert.equal(r.status, 404);
	ev.close();
}

const inject = { headers: { authorization: 'Bearer {{$credentials.token}}' } };

/** Per-workflow credentials win over the global ones, for HTTP and the host. */
async function checkCredentials(ev) {
	let r = await call('PUT', '/_admin/credentials', {
		api: { type: 'httpHeaderAuth', data: { token: 'global' }, inject },
		model: { type: 'openAiApi', data: { apiKey: 'k' } },
		tool: { type: 'postgres', data: { host: 'db' } },
	});
	assert.equal(r.status, 200);
	r = await call('PUT', '/_admin/credentials', '[1]');
	assert.equal(r.status, 400);
	r = await call('PUT', '/_admin/workflows/creds', {
		versionId: 'c1',
		module: moduleB64('creds'),
		active: true,
		credentials: { api: { type: 'httpHeaderAuth', data: { token: 'mine' }, inject } },
	});
	assert.equal(r.status, 200);
	const url = `http://127.0.0.1:${echoPort}/x`;
	r = await call('POST', '/webhook/creds', { url }, pub);
	assert.deepEqual(r, {
		status: 200,
		json: {
			echo: { authorization: 'Bearer mine' },
			host: [
				{
					json: {
						credential: { type: 'httpHeaderAuth', data: { token: 'mine' } },
						// Sub-node slots too; `model` comes from the global document.
						credentials: {
							api: { type: 'httpHeaderAuth', data: { token: 'mine' } },
							model: { type: 'openAiApi', data: { apiKey: 'k' } },
							// From `subNodes[].slots`.
							tool: { type: 'postgres', data: { host: 'db' } },
						},
						targets: ['Legacy', 'Legacy'],
					},
				},
			],
		},
	});
	// A workflow with no credentials of its own uses the global document.
	// Its Respond step has step events with args (trace is on).
	r = await call('PUT', '/_admin/workflows/creds2', { versionId: 'c1', module: moduleB64('creds'), active: false });
	assert.equal(r.status, 200);
	r = await call('POST', '/_admin/executions', {
		workflowId: 'creds2',
		executionId: '1004',
		trigger: { body: { url } },
		trace: true,
	});
	assert.equal(r.status, 202);
	await ev.waitFor((e) => e.type === 'finished' && e.executionId === '1004', 'finished 1004');
	const steps = ev.events.filter((e) => e.type === 'step' && e.executionId === '1004');
	assert.deepEqual(
		steps.map((e) => [e.step, e.status]),
		[
			['Call', 'started'],
			['Call', 'completed'],
			['Legacy', 'started'],
			['Legacy', 'completed'],
			['Respond', 'started'],
			['Respond', 'completed'],
		],
	);
	const respond = steps[4];
	assert.deepEqual(respond.args.body, {
		echo: { authorization: 'Bearer global' },
		host: [
			{
				json: {
					credential: { type: 'httpHeaderAuth', data: { token: 'global' } },
					credentials: {
						api: { type: 'httpHeaderAuth', data: { token: 'global' } },
						model: { type: 'openAiApi', data: { apiKey: 'k' } },
						tool: { type: 'postgres', data: { host: 'db' } },
					},
					targets: ['Legacy', 'Legacy'],
				},
			},
		],
	});
	assert.equal(steps[1].result.body.authorization, 'Bearer global');
}

const sendwaitBody = {
	versionId: 's1',
	module: moduleB64('sendwait'),
	active: false,
	resumeUrlBase: 'https://n8n.test/webhook-waiting',
	resumeFormUrlBase: 'https://n8n.test/form-waiting',
};

/** n8n's `/<webhookId>/<path>`; ctx.execution(), ctx.vars(), send-and-wait. */
async function checkHooksAndSendWait(ev) {
	let r = await call('PUT', '/_admin/workflows/hooks', { versionId: 'h1', module: moduleB64('hooks'), active: true });
	assert.equal(r.status, 200);
	r = await call('GET', '/webhook/abc-123/items/5', undefined, pub);
	assert.deepEqual(r.json, { params: { id: '5' }, path: '/webhook/abc-123/items/5' });
	r = await call('GET', '/webhook/items/5', undefined, pub);
	assert.equal(r.status, 404);

	r = await call('PUT', '/_admin/variables', { region: 'eu', team: 'ops' });
	assert.equal(r.status, 200);
	r = await call('PUT', '/_admin/variables', '[1]');
	assert.equal(r.status, 400);
	r = await call('PUT', '/_admin/workflows/sendwait', sendwaitBody);
	assert.equal(r.status, 200);
	r = await call('POST', '/_admin/executions', { workflowId: 'sendwait', executionId: '1005', trigger: { body: {} } });
	assert.equal(r.status, 202);
	const w5 = await ev.waitFor((e) => e.type === 'waiting' && e.executionId === '1005', 'waiting 1005');
	const q5 = `?signature=${w5.signature}`;
	// The host got the message node, with the resume URL in `execution`.
	const frames = await (await fetch(`http://127.0.0.1:${echoPort}/frames`)).json();
	const send = frames.find((f) => f.id.endsWith(':send') && f.execution?.id === '1005');
	assert.deepEqual(send.execution, {
		id: '1005',
		mode: 'test',
		resumeUrl: `https://n8n.test/webhook-waiting/1005${q5}`,
		resumeFormUrl: `https://n8n.test/form-waiting/1005${q5}`,
	});
	assert.equal(send.args.parameters.text, `https://n8n.test/webhook-waiting/1005${q5}`);
	// The resume token: no effect seq, but the signature.
	r = await call('POST', '/_admin/resume/1005', { approved: true });
	assert.equal(r.status, 403);
	r = await call('POST', `/_admin/resume/1005${q5}`, { approved: true });
	assert.equal(r.status, 202);
	const fin = await ev.waitFor((e) => e.type === 'finished' && e.executionId === '1005', 'finished 1005');
	assert.deepEqual(fin.result, {
		ex: {
			id: '1005',
			mode: 'test',
			resumeUrl: `https://n8n.test/webhook-waiting/1005${q5}`,
			resumeFormUrl: `https://n8n.test/form-waiting/1005${q5}`,
		},
		vars: { region: 'eu', team: 'ops' },
		approved: true,
	});
	// A failed send fails the approval step like any other step.
	r = await call('POST', '/_admin/executions', { workflowId: 'sendwait', executionId: '1006', trigger: { body: { fail: true } } });
	assert.equal(r.status, 202);
	const failed = await ev.waitFor((e) => e.type === 'finished' && e.executionId === '1006', 'finished 1006');
	assert.equal(failed.status, 'needs_attention');
	assert.equal(failed.step, 'Ask');
}

/** A 16 MB file goes through the large request buffers; 33 MB is refused. */
async function checkLargeUpload() {
	let r = await call('PUT', '/_admin/workflows/big', { versionId: 'b1', module: moduleB64('bigupload'), active: true });
	assert.equal(r.status, 200);
	const bytes = new Uint8Array(16 << 20);
	for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 31) & 0xff;
	const form = new FormData();
	form.append('file', new Blob([bytes], { type: 'application/octet-stream' }), 'big.bin');
	const res = await fetch(`${pub}/webhook/big`, { method: 'POST', body: form });
	assert.equal(res.status, 200);
	const b64 = Buffer.from(bytes).toString('base64');
	assert.deepEqual(await res.json(), { fileName: 'big.bin', bytes: 16 << 20, base64: b64.length, tail: b64.slice(-8) });
	const tooBig = await fetch(`${pub}/webhook/big`, { method: 'POST', body: new Uint8Array(33 << 20) }).catch(() => null);
	// wfrt answers 413 and closes; the client may see the close first.
	if (tooBig) assert.equal(tooBig.status, 413);
}

async function after() {
	let r = await call('GET', '/_admin/workflows');
	assert.deepEqual(r.json.map((w) => w.workflowId).sort(), ['approve', 'big', 'binary', 'creds', 'creds2', 'hooks', 'sendwait', 'upload']);
	assert.deepEqual(r.json.filter((w) => w.workflowId === 'approve'), [
		{
			workflowId: 'approve',
			versionId: 'a2',
			active: true,
			executions: 0,
			routes: ['POST /webhook/orders/:id'],
			schedules: 0,
		},
	]);
	const ev = await openEvents();
	// The parked execution resumes on the module it started on.
	const sig1003 = readFileSync(`${tmp}/sig-1003`, 'utf8');
	r = await call('POST', `/_admin/resume/1003/0?signature=${sig1003}`, { approved: false });
	assert.equal(r.status, 202);
	const fin = await ev.waitFor((e) => e.type === 'finished' && e.executionId === '1003', 'finished 1003');
	assert.deepEqual(fin.result, { approved: false });
	r = await call('POST', '/webhook/orders/9', { qty: 2 }, pub);
	assert.deepEqual(r.json, { version: 1, id: '9', qty: 2 });
	// The variables and resume URL bases came back from the log.
	r = await call('POST', '/_admin/executions', { workflowId: 'sendwait', executionId: '1007', trigger: { body: {} } });
	assert.equal(r.status, 202);
	const w7 = await ev.waitFor((e) => e.type === 'waiting' && e.executionId === '1007', 'waiting 1007');
	r = await call('POST', `/_admin/resume/1007?signature=${w7.signature}`, { approved: false });
	assert.equal(r.status, 202);
	const fin7 = await ev.waitFor((e) => e.type === 'finished' && e.executionId === '1007', 'finished 1007');
	assert.deepEqual(fin7.result.vars, { region: 'eu', team: 'ops' });
	assert.equal(fin7.result.ex.resumeUrl, `https://n8n.test/webhook-waiting/1007?signature=${w7.signature}`);
	ev.close();
}

await (phase === 'before' ? before() : after());
console.log(`admin check ${phase}: ok`);
process.exit(0);
