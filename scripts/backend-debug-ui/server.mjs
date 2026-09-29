#!/usr/bin/env node
// Loopback dev page for one n8n checkout.
//
// It reads controllers, services, and entities from disk and proxies API calls
// to the n8n process for this checkout. It does not start n8n. Bind is
// 127.0.0.1 only. Do not tunnel or port-forward it.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, watch } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { scanCatalog } from './catalog.mjs';
import { checkoutKind, resolvePorts } from './ports.mjs';

const UI_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ui');
const HOST = '127.0.0.1';
const BODY_LIMIT = 1_000_000;
const RESPONSE_LIMIT = 500_000;
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

const UI_FILES = new Map([
	['/', { name: 'index.html', type: 'text/html; charset=utf-8' }],
	['/index.html', { name: 'index.html', type: 'text/html; charset=utf-8' }],
	['/ui/app.js', { name: 'app.js', type: 'text/javascript; charset=utf-8' }],
	['/ui/app.css', { name: 'app.css', type: 'text/css; charset=utf-8' }],
]);

export function isLoopbackHost(rawHost) {
	const host = rawHost ?? '';
	const bracketed = /^\[([0-9a-fA-F:]+)\](?::\d+)?$/.exec(host);
	if (bracketed) return ['::1', '0:0:0:0:0:0:0:1'].includes(bracketed[1].toLowerCase());
	const plain = /^([0-9a-zA-Z.-]+)(?::\d+)?$/.exec(host);
	return plain !== null && ['127.0.0.1', 'localhost'].includes(plain[1].toLowerCase());
}

export function isAllowedApiPath(input, restPrefix = 'rest') {
	if (typeof input !== 'string' || input.length === 0 || input.length > 2048) return false;
	if (!input.startsWith('/') || input.startsWith('//')) return false;
	if (input.includes('\\') || input.includes('\0') || input.includes('..')) return false;
	let decoded;
	try {
		decoded = decodeURIComponent(input);
	} catch {
		return false;
	}
	if (decoded.includes('..') || decoded.includes('\\') || decoded.includes('\0')) return false;
	let pathname;
	try {
		pathname = new URL(decoded, 'http://127.0.0.1').pathname;
	} catch {
		return false;
	}
	if (pathname.includes('..') || pathname.includes('\\')) return false;
	const rest = `/${restPrefix}`;
	return (
		pathname === rest ||
		pathname.startsWith(`${rest}/`) ||
		pathname === '/api/v1' ||
		pathname.startsWith('/api/v1/')
	);
}

function httpError(status, message) {
	const error = new Error(message);
	error.status = status;
	return error;
}

function restSegment(value) {
	const segment = value == null || value === '' ? 'rest' : String(value);
	if (!/^[A-Za-z0-9_-]+$/.test(segment)) {
		throw new Error('N8N_ENDPOINT_REST must be a single path segment');
	}
	return segment;
}

export async function forwardCall({ n8nPort, restPrefix, method, apiPath, query, body, cookie, apiKey }) {
	const verb = String(method ?? '').toUpperCase();
	if (!METHODS.has(verb)) {
		throw httpError(400, 'Method must be GET, POST, PUT, PATCH, DELETE, HEAD, or OPTIONS.');
	}
	if (!isAllowedApiPath(apiPath, restPrefix)) {
		throw httpError(400, `Path must start with /${restPrefix}/ or /api/v1/.`);
	}
	if (cookie != null && String(cookie).length > 16_000) throw httpError(400, 'Cookie is too long.');
	if (apiKey != null && String(apiKey).length > 16_000) throw httpError(400, 'API key is too long.');

	const url = new URL(apiPath, `http://127.0.0.1:${n8nPort}`);
	if (url.hostname !== '127.0.0.1' || url.port !== String(n8nPort)) {
		throw httpError(400, 'The call must stay on the local n8n port.');
	}
	if (query != null) {
		if (typeof query !== 'object' || Array.isArray(query)) {
			throw httpError(400, 'Query must be a JSON object.');
		}
		for (const [key, value] of Object.entries(query)) {
			if (value == null) continue;
			const kind = typeof value;
			if (kind !== 'string' && kind !== 'number' && kind !== 'boolean') {
				throw httpError(400, 'Query values must be strings, numbers, or booleans.');
			}
			url.searchParams.set(key, String(value));
		}
	}

	const headers = { accept: 'application/json, text/plain, */*' };
	if (cookie) headers.cookie = String(cookie);
	if (apiKey) headers['x-n8n-api-key'] = String(apiKey);
	let payload;
	if (body !== undefined && verb !== 'GET' && verb !== 'HEAD') {
		payload = JSON.stringify(body);
		headers['content-type'] = 'application/json';
	}

	const started = Date.now();
	let response;
	try {
		response = await fetch(url, {
			method: verb,
			headers,
			body: payload,
			signal: AbortSignal.timeout(30_000),
		});
	} catch {
		throw httpError(502, `n8n didn't answer on port ${n8nPort}. Start it, then try again.`);
	}
	const text = await response.text();
	return {
		status: response.status,
		ok: response.ok,
		elapsedMs: Date.now() - started,
		contentType: response.headers.get('content-type'),
		body: text.length > RESPONSE_LIMIT ? text.slice(0, RESPONSE_LIMIT) : text,
		truncated: text.length > RESPONSE_LIMIT,
		method: verb,
		path: `${url.pathname}${url.search}`,
	};
}

export async function probeN8n(n8nPort) {
	try {
		const response = await fetch(`http://127.0.0.1:${n8nPort}/healthz`, {
			signal: AbortSignal.timeout(1500),
		});
		return { up: response.ok, status: response.status, port: n8nPort };
	} catch {
		return { up: false, status: 0, port: n8nPort };
	}
}

function branchName(root) {
	try {
		return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
			cwd: root,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim();
	} catch {
		return '';
	}
}

function findCheckoutRoot(start) {
	let dir = path.resolve(start);
	while (true) {
		if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
		const parent = path.dirname(dir);
		if (parent === dir) return path.resolve(start);
		dir = parent;
	}
}

async function readJson(req) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		size += chunk.length;
		if (size > BODY_LIMIT) throw httpError(413, 'Request body is too large.');
		chunks.push(chunk);
	}
	const text = Buffer.concat(chunks).toString('utf8');
	if (!text) return {};
	try {
		return JSON.parse(text);
	} catch {
		throw httpError(400, 'Request body must be JSON.');
	}
}

function sendJson(res, status, payload) {
	const body = JSON.stringify(payload);
	res.writeHead(status, {
		'Content-Type': 'application/json; charset=utf-8',
		'Cache-Control': 'no-store',
		'Content-Length': Buffer.byteLength(body),
	});
	res.end(body);
}

function sendFile(res, file, type) {
	res.writeHead(200, {
		'Content-Type': type,
		'Cache-Control': 'no-store',
	});
	res.end(file);
}

/**
 * @param {object} options
 * @param {string} options.root Checkout to scan.
 * @param {number} options.n8nPort Local n8n port.
 * @param {number} [options.port] Bench port. `0` asks the OS for one.
 * @param {string} [options.restPrefix]
 * @param {boolean} [options.watch]
 */
export function createServer(options) {
	const root = options.root;
	const n8nPort = options.n8nPort;
	const restPrefix = options.restPrefix ?? 'rest';
	const uiDir = options.uiDir ?? UI_DIR;
	const checkout = options.checkout ?? {
		kind: 'main',
		name: path.basename(root),
		branch: '',
	};
	let revision = 0;
	let uiRevision = 0;
	let catalog = null;

	const rebuild = () => {
		const scanned = scanCatalog(root, { restPrefix });
		revision += 1;
		catalog = {
			...scanned,
			revision,
			generatedAt: new Date().toISOString(),
			checkout,
			ports: { ui: options.port ?? null, n8n: n8nPort },
		};
		return catalog;
	};
	rebuild();

	const clients = new Set();
	const broadcast = (payload) => {
		const line = `data: ${JSON.stringify(payload)}\n\n`;
		for (const client of clients) client.write(line);
	};

	const server = http.createServer(async (req, res) => {
		if (!isLoopbackHost(req.headers.host)) {
			sendJson(res, 403, { error: 'This page answers only on localhost.' });
			return;
		}
		const url = new URL(req.url ?? '/', 'http://127.0.0.1');
		try {
			if (req.method === 'GET' && (url.pathname === '/api/catalog' || url.pathname === '/api/catalog/')) {
				if (catalog) catalog.ports.ui = server.address()?.port ?? catalog.ports.ui;
				sendJson(res, 200, catalog);
				return;
			}
			if (req.method === 'GET' && url.pathname === '/api/n8n-status') {
				sendJson(res, 200, await probeN8n(n8nPort));
				return;
			}
			if (req.method === 'GET' && url.pathname === '/api/events') {
				res.writeHead(200, {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-store',
					Connection: 'keep-alive',
				});
				res.write(`data: ${JSON.stringify({ type: 'hello', revision })}\n\n`);
				clients.add(res);
				req.on('close', () => clients.delete(res));
				return;
			}
			if (req.method === 'POST' && url.pathname === '/api/call') {
				const payload = await readJson(req);
				const result = await forwardCall({
					n8nPort,
					restPrefix,
					method: payload.method,
					apiPath: payload.path,
					query: payload.query,
					body: payload.body,
					cookie: payload.cookie,
					apiKey: payload.apiKey,
				});
				console.log(`${result.method} ${result.path} → ${result.status} ${result.elapsedMs}ms`);
				sendJson(res, 200, result);
				return;
			}
			if (req.method === 'GET') {
				const asset = UI_FILES.get(url.pathname);
				if (asset) {
					sendFile(res, readFileSync(path.join(uiDir, asset.name)), asset.type);
					return;
				}
			}
			sendJson(res, 404, { error: 'Not found.' });
		} catch (error) {
			const status = error.status ?? 500;
			sendJson(res, status, {
				error: error instanceof Error ? error.message : 'The bench failed.',
			});
		}
	});

	let watchers = [];
	let watchTimer = null;
	const stopWatch = () => {
		clearTimeout(watchTimer);
		for (const watcher of watchers) watcher.close();
		watchers = [];
	};

	if (options.watch) {
		let uiChange = false;
		let htmlChange = false;
		let sourceChange = false;
		const schedule = (filename) => {
			const name = String(filename ?? '');
			if (name.includes('__tests__') || name.endsWith('.test.ts')) return;
			if (name.endsWith('.html')) htmlChange = true;
			else if (name.endsWith('.css') || name.endsWith('.js')) uiChange = true;
			else if (name.endsWith('.ts') || name.endsWith('.mjs')) sourceChange = true;
			else return;
			clearTimeout(watchTimer);
			watchTimer = setTimeout(() => {
				const ui = uiChange;
				const html = htmlChange;
				const source = sourceChange;
				uiChange = false;
				htmlChange = false;
				sourceChange = false;
				if (source) {
					try {
						rebuild();
						broadcast({ type: 'catalog', revision });
					} catch (error) {
						console.error(error instanceof Error ? error.message : 'Scan failed');
					}
				}
				if (html) broadcast({ type: 'reload' });
				else if (ui) {
					uiRevision += 1;
					broadcast({ type: 'ui', revision: uiRevision });
				}
			}, 150);
		};
		const targets = [
			path.join(root, 'packages/cli/src'),
			path.join(root, 'packages/@n8n/db/src/entities'),
			path.join(root, 'packages/@n8n/db/src/repositories'),
			uiDir,
		];
		for (const target of targets) {
			if (!existsSync(target)) continue;
			try {
				watchers.push(watch(target, { recursive: true }, (_event, filename) => schedule(filename)));
			} catch (error) {
				console.error(error instanceof Error ? error.message : 'Watch failed');
			}
		}
	}

	const heartbeat = setInterval(() => {
		for (const client of clients) client.write(': ping\n\n');
	}, 20_000);
	heartbeat.unref?.();

	return {
		server,
		getCatalog: () => catalog,
		broadcast,
		close: () =>
			new Promise((resolve) => {
				clearInterval(heartbeat);
				stopWatch();
				for (const client of clients) client.end();
				server.close(() => resolve());
			}),
		listen: (port = 0) =>
			new Promise((resolve, reject) => {
				server.once('error', reject);
				server.listen(port, HOST, () => {
					server.off('error', reject);
					const address = server.address();
					const uiPort = typeof address === 'object' && address ? address.port : port;
					if (catalog) catalog.ports.ui = uiPort;
					resolve({ port: uiPort, url: `http://${HOST}:${uiPort}` });
				});
			}),
	};
}

function printBanner({ url, ports, checkout }) {
	const where = checkout.kind === 'worktree' ? 'Worktree' : 'Main checkout';
	console.log('');
	console.log('Backend bench');
	console.log(`${where}: ${checkout.name}${checkout.branch ? ` · ${checkout.branch}` : ''}`);
	console.log(`UI:  ${url}`);
	console.log(`n8n: http://127.0.0.1:${ports.n8n}`);
	if (ports.n8nDerived) {
		console.log(`Start n8n with N8N_PORT=${ports.n8n} pnpm dev:be`);
	}
	if (checkout.kind === 'worktree') {
		console.log('This worktree has its own ports. Another checkout can run the same command.');
	}
	console.log('The page refreshes when CLI, database, or UI sources change.');
	console.log('Loopback only. Do not tunnel this port.');
	console.log('');
}

async function main() {
	const root = findCheckoutRoot(process.cwd());
	const kind = checkoutKind(root);
	const ports = resolvePorts({ kind, checkoutPath: root });
	const checkout = { kind, name: path.basename(root), branch: branchName(root) };
	const bench = createServer({
		root,
		n8nPort: ports.n8n,
		port: ports.ui,
		restPrefix: restSegment(process.env.N8N_ENDPOINT_REST),
		watch: true,
		checkout,
	});
	try {
		const listened = await bench.listen(ports.ui);
		printBanner({ url: listened.url, ports, checkout });
	} catch (error) {
		const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
		if (code === 'EADDRINUSE') {
			console.error(`Port ${ports.ui} is in use. Set N8N_BACKEND_DEBUG_PORT to a free port.`);
		} else {
			console.error(error instanceof Error ? error.message : 'The bench failed to start.');
		}
		process.exit(1);
	}
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
	main();
}
