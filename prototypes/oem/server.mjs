#!/usr/bin/env node
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { handleMockApi } from './mocks/api.mjs';

const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 3847);
const rootDir = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(rootDir, 'public');

// Keep the editor, API, and browser storage on the hub origin. A cookie is
// shared between ports, but the browser ID in localStorage is not.
const n8nTarget = new URL(process.env.N8N_ORIGIN ?? 'http://127.0.0.1:5678');

const mimeTypes = {
	'.css': 'text/css; charset=utf-8',
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
};

function sendFile(res, filePath) {
	const type = mimeTypes[extname(filePath)] ?? 'application/octet-stream';
	res.writeHead(200, { 'Content-Type': type });
	createReadStream(filePath).pipe(res);
}

function resolvePublicPath(pathname) {
	const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
	const candidate = resolve(publicDir, relative);
	if (!candidate.startsWith(publicDir)) {
		return null;
	}
	return normalize(candidate);
}

// OEM chrome overrides. The proxy adds this to every proxied HTML page, so it
// applies in the embed frame and when a page is opened directly.
const overrideTag = '<link rel="stylesheet" href="/oem-overrides.css" />';

function injectOverrides(html) {
	if (html.includes('/oem-overrides.css') || !html.includes('</head>')) {
		return html;
	}
	return html.replace('</head>', `\t\t${overrideTag}\n\t</head>`);
}

function makeBackendUrlsSameOrigin(body) {
	const origins = new Set([
		n8nTarget.origin,
		`http://localhost:${n8nTarget.port}`,
		`http://127.0.0.1:${n8nTarget.port}`,
		`//localhost:${n8nTarget.port}`,
		`//127.0.0.1:${n8nTarget.port}`,
	]);
	for (const origin of origins) {
		body = body.replaceAll(origin, '');
	}
	return body;
}

function endProxyError(res, target, error) {
	if (error.code !== 'ECONNRESET') {
		console.error(`Proxy error from ${target.origin}:`, error.message);
	}
	if (res.destroyed || res.writableEnded) return;
	if (!res.headersSent) {
		res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
	}
	res.end(`${target.origin} is not reachable\n${error.message}`);
}

function proxyRequest(req, res, target, { rewriteText = false } = {}) {
	const headers = { ...req.headers, host: target.host, 'accept-encoding': 'identity' };

	const upstream = httpRequest(
		{
			host: target.hostname,
			port: target.port,
			method: req.method,
			path: req.url,
			headers,
		},
		(upstreamRes) => {
			const status = upstreamRes.statusCode ?? 502;
			const contentType = upstreamRes.headers['content-type'] ?? '';
			const shouldRewrite =
				rewriteText &&
				(contentType.includes('text/html') ||
					contentType.includes('javascript') ||
					contentType.includes('application/json'));

			if (!shouldRewrite) {
				res.writeHead(status, upstreamRes.headers);
				upstreamRes.pipe(res);
				upstreamRes.on('error', (error) => endProxyError(res, target, error));
				return;
			}

			const chunks = [];
			upstreamRes.on('data', (chunk) => chunks.push(chunk));
			upstreamRes.on('end', () => {
				if (res.destroyed || res.writableEnded) return;
				let body = makeBackendUrlsSameOrigin(Buffer.concat(chunks).toString('utf8'));
				if (contentType.includes('text/html')) {
					body = injectOverrides(body);
				}
				const outHeaders = { ...upstreamRes.headers };
				delete outHeaders['content-length'];
				res.writeHead(status, {
					...outHeaders,
					'content-length': Buffer.byteLength(body),
				});
				res.end(body);
			});
			upstreamRes.on('error', (error) => endProxyError(res, target, error));
		},
	);

	upstream.on('error', (error) => {
		endProxyError(res, target, error);
	});
	req.on('aborted', () => upstream.destroy());
	req.on('error', () => upstream.destroy());
	res.on('close', () => {
		if (!res.writableEnded) upstream.destroy();
	});

	req.pipe(upstream);
}

const server = createServer((req, res) => {
	const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `${host}:${port}`}`);

	if (handleMockApi(req, res, url)) {
		return;
	}

	const filePath = resolvePublicPath(url.pathname);
	if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
		proxyRequest(req, res, n8nTarget, { rewriteText: true });
		return;
	}

	sendFile(res, filePath);
});

// The editor keeps a websocket open for push updates.
server.on('upgrade', (req, socket, head) => {
	const upstream = httpRequest({
		host: n8nTarget.hostname,
		port: n8nTarget.port,
		method: req.method,
		path: req.url,
		headers: { ...req.headers, host: n8nTarget.host },
	});

	upstream.on('upgrade', (upstreamRes, upstreamSocket, upstreamHead) => {
		const statusLine = Object.entries(upstreamRes.headers)
			.map(([key, value]) => `${key}: ${value}`)
			.join('\r\n');
		socket.write(`HTTP/1.1 101 Switching Protocols\r\n${statusLine}\r\n\r\n`);
		if (upstreamHead?.length) socket.write(upstreamHead);
		if (head?.length) upstreamSocket.write(head);
		upstreamSocket.pipe(socket);
		socket.pipe(upstreamSocket);
	});

	upstream.on('error', () => socket.destroy());
	socket.on('error', () => upstream.destroy());
	socket.on('close', () => upstream.destroy());
	upstream.end();
});

server.listen(port, host, () => {
	console.log(`OEM prototype hub: http://${host}:${port}`);
	console.log(`n8n proxied from: ${n8nTarget.origin}`);
});
