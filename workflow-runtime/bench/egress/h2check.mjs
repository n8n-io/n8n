// HTTP/2 behaviour checks: each case posts http args to a wfrt serve
// instance (bench/egress/workflow.ts) that calls h2server.mjs.
// usage: node h2check.mjs <serve port> <h2 upstream port> [go]
// With `go` the upstream is goserver/main.go (Go's net/http), and only the
// cases that it serves run.
import assert from 'node:assert/strict';

const [serve, h2port] = process.argv.slice(2).map(Number);
const go = process.argv[4] === 'go';
const up = `https://127.0.0.1:${h2port}`;
let failed = 0;

async function call(args) {
	const res = await fetch(`http://127.0.0.1:${serve}/egress`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(args),
	});
	return JSON.parse(await res.text());
}

async function check(name, fn) {
	const t = Date.now();
	try {
		await fn();
		console.log(`ok   ${name} (${Date.now() - t} ms)`);
	} catch (e) {
		failed++;
		console.log(`FAIL ${name}: ${e.message}`);
	}
}

if (go) {
	await check('go: requests are HTTP/2', async () => {
		const r = await call({ method: 'GET', url: `${up}/ok` });
		assert.equal(r.ok, true, r.error);
		assert.equal(r.body.proto, 'HTTP/2.0');
	});
	await check('go: 600 requests at once share few connections (250 streams each)', async () => {
		const rs = await Promise.all(Array.from({ length: 600 }, () => call({ method: 'GET', url: `${up}/slow?ms=200` })));
		for (const r of rs) assert.equal(r.ok, true, r.error);
		assert.ok(Math.max(...rs.map((r) => r.body.conns)) <= 8, `conns: ${Math.max(...rs.map((r) => r.body.conns))}`);
	});
	await check('go: a 5 MB response', async () => {
		const r = await call({ method: 'GET', url: `${up}/big?kb=5120` });
		assert.equal(r.ok, true, r.error);
		assert.equal(r.body.length, 5120 * 1024);
	});
	await check('go: a 1 MB request body', async () => {
		const r = await call({ method: 'POST', url: `${up}/echo`, body: 'y'.repeat(1 << 20) });
		assert.equal(r.ok, true, r.error);
		assert.equal(r.body.length, 1 << 20);
	});
	console.log(failed === 0 ? 'all go checks passed' : `${failed} go check(s) failed`);
	process.exit(failed === 0 ? 0 : 1);
}

await check('h2: a plain request', async () => {
	const r = await call({ method: 'GET', url: `${up}/ok` });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.body.ok, true);
});

await check('h2: 40 requests at once over a limit of 4 streams per connection', async () => {
	const rs = await Promise.all(Array.from({ length: 40 }, () => call({ method: 'GET', url: `${up}/slow?ms=100` })));
	for (const r of rs) assert.equal(r.ok, true, r.error);
	// They wait for streams instead of each opening a connection.
	assert.ok(Math.max(...rs.map((r) => r.body.sessions)) <= 12, `sessions: ${rs.map((r) => r.body.sessions)}`);
});

await check('h2: a 3 MB response needs WINDOW_UPDATE frames', async () => {
	const r = await call({ method: 'GET', url: `${up}/big?kb=3000` });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.body.length, 3000 * 1024);
});

await check('h2: a 300 KB request body waits for the server window', async () => {
	const body = 'x'.repeat(300_000);
	const r = await call({ method: 'POST', url: `${up}/echo`, body });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.body.length, body.length);
});

await check('h2: RST_STREAM fails the request with the code', async () => {
	const r = await call({ method: 'GET', url: `${up}/rst` });
	assert.equal(r.ok, false);
	assert.match(r.error, /reset the stream \(CANCEL\)/);
});

await check('h2: REFUSED_STREAM is sent again, also for POST', async () => {
	const r = await call({ method: 'POST', url: `${up}/refuse`, body: { a: 1 } });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.body.refusedBefore, true);
});

await check('h2: PING from the server is answered', async () => {
	const r = await call({ method: 'GET', url: `${up}/ping` });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.body.pinged, true);
});

await check('h2: trailers are read and dropped', async () => {
	const r = await call({ method: 'GET', url: `${up}/trailers` });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.body, 'with trailers');
	assert.equal(r.headers['x-checksum'], undefined);
});

await check('h2: a header block in CONTINUATION frames', async () => {
	const r = await call({ method: 'GET', url: `${up}/headers` });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.headers['x-h99'], `99-${'v'.repeat(400)}`);
	assert.equal(r.body, 'many headers');
});

await check('h2: an interim 103 is dropped', async () => {
	const r = await call({ method: 'GET', url: `${up}/interim` });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.status, 200);
	assert.equal(r.body.afterInterim, true);
});

await check('h2: 429 is a result; Retry-After does not retry it', async () => {
	const r = await call({ method: 'GET', url: `${up}/429` });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.status, 429);
	assert.equal(r.headers['retry-after'], '1');
});

await check('h2: GOAWAY drains the connection; later requests use a new one', async () => {
	const first = await call({ method: 'GET', url: `${up}/goaway` });
	assert.equal(first.ok, true, first.error);
	await new Promise((r) => setTimeout(r, 100));
	const rs = await Promise.all(Array.from({ length: 8 }, () => call({ method: 'GET', url: `${up}/ok` })));
	for (const r of rs) assert.equal(r.ok, true, r.error);
	assert.equal(Math.max(...rs.map((r) => r.body.late)), 0, 'no stream on a connection after its GOAWAY');
});

console.log(failed === 0 ? 'all h2 checks passed' : `${failed} h2 check(s) failed`);
process.exit(failed === 0 ? 0 : 1);
