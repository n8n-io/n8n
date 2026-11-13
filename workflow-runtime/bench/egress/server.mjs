// Upstream for the egress test: the same handler over https, http and a raw
// TLS socket that sends a close-delimited body.
// usage: node server.mjs <dir with cert.pem and key.pem> <https port> <http port> <raw tls port>
// With H2=1 the https port speaks HTTP/2 (ALPN h2, HTTP/1.1 as the fallback).
import { readFileSync } from 'node:fs';
import http from 'node:http';
import http2 from 'node:http2';
import https from 'node:https';
import tls from 'node:tls';

const [dir, httpsPort, httpPort, rawPort] = process.argv.slice(2);
const cert = readFileSync(`${dir}/cert.pem`);
const key = readFileSync(`${dir}/key.pem`);

function handler(req, res) {
	const url = new URL(req.url, 'http://x');
	const chunks = [];
	req.on('data', (c) => chunks.push(c));
	req.on('end', () => {
		const body = Buffer.concat(chunks).toString('utf8');
		const path = url.pathname;
		if (path === '/json') {
			res.setHeader('content-type', 'application/json');
			res.setHeader('x-test', 'a');
			res.setHeader('set-cookie', ['a=1', 'b=2']);
			res.end(JSON.stringify({ hello: 'world' }));
		} else if (path.startsWith('/echo')) {
			res.setHeader('content-type', 'application/json');
			res.end(JSON.stringify({ method: req.method, url: req.url, headers: req.headers, body }));
		} else if (path === '/chunked') {
			res.setHeader('content-type', 'text/plain');
			const parts = ['alpha-', 'beta-', 'x'.repeat(40000), '-gamma'];
			let i = 0;
			const next = () => {
				if (i === parts.length) return res.end();
				res.write(parts[i++]);
				setTimeout(next, 5);
			};
			next();
		} else if (path === '/large') {
			const mb = Number(url.searchParams.get('mb') ?? '5');
			res.setHeader('content-type', 'application/octet-stream');
			res.end(Buffer.alloc(mb * 1024 * 1024, 'z'));
		} else if (path === '/large-json') {
			res.setHeader('content-type', 'application/json');
			res.end(JSON.stringify({ items: Array.from({ length: 50000 }, (_, i) => ({ i, name: `item-${i}` })) }));
		} else if (path === '/redirect') {
			const n = Number(url.searchParams.get('n') ?? '1');
			res.statusCode = 302;
			res.setHeader('location', n <= 1 ? '/json' : `/redirect?n=${n - 1}`);
			res.end();
		} else if (path === '/slow') {
			setTimeout(() => res.end('late'), 3000);
		} else if (path === '/proto') {
			res.setHeader('content-type', 'application/json');
			res.end(JSON.stringify({ version: req.httpVersion }));
		} else if (path === '/status') {
			res.statusCode = Number(url.searchParams.get('code') ?? '500');
			res.end('status');
		} else {
			res.statusCode = 404;
			res.end('not found');
		}
	});
}

if (process.env.H2 === '1') {
	http2.createSecureServer({ cert, key, allowHTTP1: true }, handler).listen(Number(httpsPort), '::');
} else {
	https.createServer({ cert, key }, handler).listen(Number(httpsPort), '::');
}
http.createServer(handler).listen(Number(httpPort), '::');
tls
	.createServer({ cert, key }, (s) => {
		s.once('data', () => {
			s.end('HTTP/1.1 200 OK\r\ncontent-type: text/plain\r\nconnection: close\r\n\r\nclose-delimited body');
		});
	})
	.listen(Number(rawPort), '127.0.0.1');
console.log('egress test upstream ready');
