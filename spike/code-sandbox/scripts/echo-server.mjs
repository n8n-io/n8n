#!/usr/bin/env node
/**
 * Local HTTP echo server for the workloads, and a forward proxy for the W6
 * proxy case. Requests that come through the proxy get `viaProxy: true`.
 *
 *   node spike/code-sandbox/scripts/echo-server.mjs [port=5680] [proxyPort=5681]
 *
 * n8n uses the proxy with HTTP_PROXY=http://127.0.0.1:5681 (and NO_PROXY unset
 * for 127.0.0.1).
 */
import http from 'node:http';

const port = Number(process.argv[2] ?? 5680);
const proxyPort = Number(process.argv[3] ?? 5681);
let proxied = 0;

function echo(req, res, viaProxy) {
	const chunks = [];
	req.on('data', (c) => chunks.push(c));
	req.on('end', () => {
		const body = JSON.stringify({
			method: req.method,
			url: req.url,
			viaProxy,
			headers: req.headers,
			body: Buffer.concat(chunks).toString('utf-8'),
		});
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(body);
	});
}

http.createServer((req, res) => echo(req, res, false)).listen(port, '0.0.0.0', () => {
	console.log(`echo server on :${port}`);
});

// A forward proxy for plain HTTP: the request line holds the absolute URL.
http
	.createServer((req, res) => {
		proxied++;
		const target = new URL(req.url);
		if (target.port === String(port) || target.port === '') {
			// Answer local echo requests directly, marked as proxied.
			echo(req, res, true);
			return;
		}
		const upstream = http.request(
			target,
			{ method: req.method, headers: req.headers },
			(up) => {
				res.writeHead(up.statusCode ?? 502, up.headers);
				up.pipe(res);
			},
		);
		upstream.on('error', () => {
			res.writeHead(502);
			res.end();
		});
		req.pipe(upstream);
	})
	.listen(proxyPort, '0.0.0.0', () => console.log(`forward proxy on :${proxyPort}`));

setInterval(() => {
	if (proxied) console.log(`proxied requests: ${proxied}`);
}, 10_000).unref();
