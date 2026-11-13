// Checks for the egress test. Each case posts http args to a wfrt serve
// instance and checks what the workflow returns.
// usage: node check.mjs <insecure serve port> <verifying serve port> <https port> <http port> <raw tls port>
import assert from 'node:assert/strict';

const [insecure, verifying, httpsPort, httpPort, rawPort] = process.argv.slice(2).map(Number);
const up = `https://localhost:${httpsPort}`;
let failed = 0;
let skipped = 0;

async function call(port, args) {
	const res = await fetch(`http://127.0.0.1:${port}/egress`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(args),
	});
	const text = await res.text();
	try {
		return JSON.parse(text);
	} catch {
		throw new Error(`reply is not JSON (${res.status}): ${text.slice(0, 200)}`);
	}
}

async function check(name, fn) {
	const t = Date.now();
	try {
		const note = await fn();
		if (note === 'skip') {
			skipped++;
			console.log(`skip ${name}`);
		} else {
			console.log(`ok   ${name} (${Date.now() - t} ms)`);
		}
	} catch (e) {
		failed++;
		console.log(`FAIL ${name}: ${e.message}`);
	}
}

await check('https GET, JSON body, response headers', async () => {
	const r = await call(insecure, { method: 'GET', url: `${up}/json` });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.status, 200);
	assert.deepEqual(r.body, { hello: 'world' });
	assert.equal(r.headers['x-test'], 'a');
	assert.deepEqual(r.headers['set-cookie'], ['a=1', 'b=2']);
	assert.equal(r.headers['content-type'], 'application/json');
});

await check('https POST: qs, headers and JSON body round trip', async () => {
	const r = await call(insecure, {
		method: 'POST',
		url: `${up}/echo?x=0`,
		headers: { 'X-Custom': 'v 1', 'content-type': 'application/json; charset=utf-8' },
		qs: { a: '1 2&', list: [1, 'two'], skip: null, t: true },
		body: { name: 'é', n: [1, 2] },
	});
	assert.equal(r.ok, true, r.error);
	const e = r.body;
	assert.equal(e.method, 'POST');
	assert.equal(e.url, '/echo?x=0&a=1%202%26&list=1&list=two&t=true');
	assert.equal(e.headers['x-custom'], 'v 1');
	assert.equal(e.headers['content-type'], 'application/json; charset=utf-8');
	assert.equal(e.headers['accept-encoding'], 'identity');
	// HTTP/2 carries the host as :authority (RFC 9113 8.3.1).
	const host = process.env.UPSTREAM === 'h2' ? e.headers[':authority'] : e.headers.host;
	assert.equal(host, `localhost:${httpsPort}`);
	assert.deepEqual(JSON.parse(e.body), { name: 'é', n: [1, 2] });
});

await check('string body is sent as it is', async () => {
	const r = await call(insecure, { method: 'PUT', url: `${up}/echo`, body: 'line1\nline2' });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.body.body, 'line1\nline2');
	assert.equal(r.body.headers['content-type'], undefined);
});

await check('chunked response', async () => {
	const r = await call(insecure, { method: 'GET', url: `${up}/chunked` });
	assert.equal(r.ok, true, r.error);
	// HTTP/2 has no transfer-encoding: DATA frames carry the body.
	assert.equal(r.headers['transfer-encoding'], process.env.UPSTREAM === 'h2' ? undefined : 'chunked');
	assert.equal(r.body, `alpha-beta-${'x'.repeat(40000)}-gamma`);
});

await check('large body, 5 MB', async () => {
	const r = await call(insecure, { method: 'GET', url: `${up}/large?mb=5` });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.body.length, 5 * 1024 * 1024);
	assert.equal(r.body[12345], 'z');
});

await check('large JSON body, about 1.4 MB', async () => {
	const r = await call(insecure, { method: 'GET', url: `${up}/large-json` });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.body.items.length, 50000);
	assert.equal(r.body.items[49999].name, 'item-49999');
});

await check('body larger than the limit fails', async () => {
	const r = await call(insecure, { method: 'GET', url: `${up}/large?mb=17` });
	assert.equal(r.ok, false);
	assert.match(r.error, /limit is 16777216|larger than 16777216 bytes/);
});

await check('three redirects are followed', async () => {
	const r = await call(insecure, { method: 'GET', url: `${up}/redirect?n=3` });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.status, 200);
	assert.deepEqual(r.body, { hello: 'world' });
});

await check('more than five redirects fail', async () => {
	const r = await call(insecure, { method: 'GET', url: `${up}/redirect?n=7` });
	assert.equal(r.ok, false);
	assert.match(r.error, /more than 5 redirects/);
});

await check('POST is not redirected', async () => {
	const r = await call(insecure, { method: 'POST', url: `${up}/redirect?n=1`, body: {} });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.status, 302);
});

await check('non-2xx status is a result, not an error', async () => {
	const r = await call(insecure, { method: 'GET', url: `${up}/status?code=503` });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.status, 503);
	assert.equal(r.body, 'status');
});

await check('credential injection and templates', async () => {
	const r = await call(insecure, {
		cred: true,
		method: 'POST',
		url: `${up}/echo/{{$credentials.key}}`,
		headers: { authorization: 'mine' },
		body: { text: 'key={{$credentials.key}}' },
	});
	assert.equal(r.ok, true, r.error);
	const e = r.body;
	assert.equal(e.headers.authorization, 'Bearer s3cret');
	assert.equal(e.url, '/echo/k1?api_key=k1');
	assert.deepEqual(JSON.parse(e.body), { text: 'key=k1' });
});

await check('missing credential slot', async () => {
	const r = await call(verifying, { cred: true, method: 'GET', url: `${up}/json` });
	assert.equal(r.ok, false);
	assert.equal(r.error, 'credential "api" is not configured');
});

await check('plain http by name (localhost)', async () => {
	const r = await call(insecure, { method: 'GET', url: `http://localhost:${httpPort}/json` });
	assert.equal(r.ok, true, r.error);
	assert.deepEqual(r.body, { hello: 'world' });
});

await check('IPv6 literal', async () => {
	const r = await call(insecure, { method: 'GET', url: `https://[::1]:${httpsPort}/json` });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.status, 200);
});

await check('close-delimited body over TLS', async () => {
	const r = await call(insecure, { method: 'GET', url: `https://127.0.0.1:${rawPort}/` });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.body, 'close-delimited body');
});

await check('timeoutMs', async () => {
	const r = await call(insecure, { method: 'GET', url: `${up}/slow`, timeoutMs: 500 });
	assert.equal(r.ok, false);
	assert.match(r.error, /timed out after 500 ms/);
});

await check('connection refused', async () => {
	const r = await call(insecure, { method: 'GET', url: 'http://127.0.0.1:1/' });
	assert.equal(r.ok, false);
	assert.match(r.error, /connect to 127\.0\.0\.1:1 failed: Connection refused/);
});

await check('self-signed certificate fails without --insecure-tls', async () => {
	const r = await call(verifying, { method: 'GET', url: `${up}/json` });
	assert.equal(r.ok, false);
	assert.match(r.error, /certificate verify failed/);
});

await check('unknown name fails with a DNS error', async () => {
	const r = await call(verifying, { method: 'GET', url: 'https://does-not-exist.invalid/' });
	assert.equal(r.ok, false);
	assert.match(r.error, /cannot resolve "does-not-exist\.invalid"/);
});

await check('public name: DNS, TLS verification, SNI (https://example.com)', async () => {
	const r = await call(verifying, { method: 'GET', url: 'https://example.com/', timeoutMs: 15000 });
	if (!r.ok && /resolve|connect|timed out/.test(r.error)) return 'skip';
	assert.equal(r.ok, true, r.error);
	assert.equal(r.status, 200);
	assert.match(r.body, /Example Domain/);
	// A second call reuses the cached name and the kept-alive connection.
	const again = await call(verifying, { method: 'GET', url: 'https://example.com/' });
	assert.equal(again.status, 200);
});

await check('protocol: the upstream sees HTTP/2 when it offers it, else HTTP/1.1', async () => {
	const r = await call(insecure, { method: 'GET', url: `${up}/proto` });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.body.version, process.env.UPSTREAM === 'h2' ? '2.0' : '1.1');
});

await check('100 requests at once to one origin', async () => {
	const rs = await Promise.all(
		Array.from({ length: 100 }, (_, i) => call(insecure, { method: 'POST', url: `${up}/echo?i=${i}`, body: { i } })),
	);
	rs.forEach((r, i) => {
		assert.equal(r.ok, true, r.error);
		assert.equal(r.body.body, JSON.stringify({ i }));
	});
});

await check('a request body larger than the HTTP/2 initial window (100 KB)', async () => {
	const big = 'b'.repeat(100_000);
	const r = await call(insecure, { method: 'POST', url: `${up}/echo`, body: big });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.body.body.length, big.length);
});

await check('429 with Retry-After is a result, not a retry', async () => {
	const r = await call(insecure, { method: 'GET', url: `${up}/status?code=429` });
	assert.equal(r.ok, true, r.error);
	assert.equal(r.status, 429);
});

console.log(failed === 0 ? `all checks passed (${skipped} skipped)` : `${failed} check(s) failed`);
process.exit(failed === 0 ? 0 : 1);
