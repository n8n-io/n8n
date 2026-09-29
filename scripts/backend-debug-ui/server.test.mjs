import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { createServer, isAllowedApiPath, isLoopbackHost } from './server.mjs';

function write(root, rel, source) {
	const file = path.join(root, rel);
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, source);
}

describe('isLoopbackHost', () => {
	it('accepts loopback and rejects a rebinding host', () => {
		assert.equal(isLoopbackHost('127.0.0.1'), true);
		assert.equal(isLoopbackHost('127.0.0.1:4317'), true);
		assert.equal(isLoopbackHost('localhost'), true);
		assert.equal(isLoopbackHost('[::1]'), true);
		assert.equal(isLoopbackHost('[::1]:4317'), true);
		assert.equal(isLoopbackHost('evil.example'), false);
		assert.equal(isLoopbackHost('127.0.0.1.evil.example'), false);
		assert.equal(isLoopbackHost('[::1]evil.example'), false);
		assert.equal(isLoopbackHost(''), false);
	});
});

describe('isAllowedApiPath', () => {
	it('allows the REST prefix and the public API only', () => {
		assert.equal(isAllowedApiPath('/rest/tags'), true);
		assert.equal(isAllowedApiPath('/api/v1/workflows?limit=1'), true);
		assert.equal(isAllowedApiPath('/custom/tags', 'custom'), true);
		assert.equal(isAllowedApiPath('/rest/../api/v1/tags'), false);
		assert.equal(isAllowedApiPath('/rest/%2e%2e/secret'), false);
		assert.equal(isAllowedApiPath('//evil.example/rest/tags'), false);
		assert.equal(isAllowedApiPath('http://127.0.0.1:5678/rest/tags'), false);
		assert.equal(isAllowedApiPath('/mcp-server'), false);
	});
});

describe('createServer', () => {
	let bench;
	let n8n;
	let base;
	let n8nPort;

	before(async () => {
		n8n = http.createServer((req, res) => {
			if (req.url === '/healthz') {
				res.end('ok');
				return;
			}
			const chunks = [];
			req.on('data', (chunk) => chunks.push(chunk));
			req.on('end', () => {
				res.setHeader('content-type', 'application/json');
				res.end(
					JSON.stringify({
						url: req.url,
						method: req.method,
						body: Buffer.concat(chunks).toString('utf8'),
						hasKey: Boolean(req.headers['x-n8n-api-key']),
					}),
				);
			});
		});
		await new Promise((resolve) => n8n.listen(0, '127.0.0.1', resolve));
		n8nPort = n8n.address().port;

		const root = mkdtempSync(path.join(tmpdir(), 'backend-bench-server-'));
		write(
			root,
			'packages/cli/src/controllers/tags.controller.ts',
			`
@RestController('/tags')
export class TagsController {
	@Get('/')
	async getAll() {}
}
`,
		);
		const uiDir = mkdtempSync(path.join(tmpdir(), 'backend-bench-ui-'));
		writeFileSync(path.join(uiDir, 'index.html'), '<!doctype html><title>Backend bench</title>');
		writeFileSync(path.join(uiDir, 'app.js'), 'export function mount() {}');
		writeFileSync(path.join(uiDir, 'app.css'), 'body { color: white; }');
		bench = createServer({
			root,
			uiDir,
			n8nPort,
			restPrefix: 'rest',
			watch: false,
			checkout: { kind: 'main', name: 'fixture', branch: 'master' },
		});
		const listened = await bench.listen(0);
		base = listened.url;
	});

	after(async () => {
		await bench.close();
		await new Promise((resolve) => n8n.close(resolve));
	});

	it('serves the page and the catalog on loopback', async () => {
		const page = await fetch(`${base}/`);
		assert.equal(page.status, 200);
		assert.match(await page.text(), /Backend bench/);
		const catalog = await (await fetch(`${base}/api/catalog`)).json();
		assert.equal(catalog.routes[0].fullPath, '/rest/tags');
		assert.equal(catalog.checkout.name, 'fixture');
		assert.equal(catalog.ports.n8n, n8nPort);
	});

	it('rejects a non-loopback Host', async () => {
		const url = new URL(base);
		const status = await new Promise((resolve, reject) => {
			const req = http.request(
				{ hostname: '127.0.0.1', port: url.port, path: '/api/catalog', headers: { host: 'evil.example' } },
				(res) => {
					res.resume();
					resolve(res.statusCode);
				},
			);
			req.on('error', reject);
			req.end();
		});
		assert.equal(status, 403);
	});

	it('proxies a local API call and refuses other paths', async () => {
		const ok = await fetch(`${base}/api/call`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				method: 'POST',
				path: '/api/v1/tags',
				body: { name: 'alpha' },
				apiKey: 'test-key',
			}),
		});
		const payload = await ok.json();
		assert.equal(payload.status, 200);
		const echoed = JSON.parse(payload.body);
		assert.equal(echoed.url, '/api/v1/tags');
		assert.equal(echoed.hasKey, true);
		assert.equal(echoed.body, '{"name":"alpha"}');
		assert.equal(payload.body.includes('test-key'), false);

		const blocked = await fetch(`${base}/api/call`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ method: 'GET', path: '/rest/../api/v1/tags' }),
		});
		assert.equal(blocked.status, 400);
	});

	it('reports when n8n answers /healthz', async () => {
		const status = await (await fetch(`${base}/api/n8n-status`)).json();
		assert.equal(status.up, true);
		assert.equal(status.port, n8nPort);
	});
});

describe('source refresh', () => {
	it('pushes a catalog event when a controller changes', async () => {
		const root = mkdtempSync(path.join(tmpdir(), 'backend-bench-watch-'));
		const uiDir = mkdtempSync(path.join(tmpdir(), 'backend-bench-watch-ui-'));
		write(
			root,
			'packages/cli/src/controllers/tags.controller.ts',
			`
@RestController('/tags')
export class TagsController {
	@Get('/')
	async getAll() {}
}
`,
		);
		writeFileSync(path.join(uiDir, 'index.html'), '<!doctype html><title>Backend bench</title>');
		writeFileSync(path.join(uiDir, 'app.js'), 'export function mount() {}');
		writeFileSync(path.join(uiDir, 'app.css'), 'body{}');
		const watched = createServer({
			root,
			uiDir,
			n8nPort: 9,
			watch: true,
			checkout: { kind: 'worktree', name: 'watch', branch: 'topic' },
		});
		const listened = await watched.listen(0);
		const events = new Promise((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error('No catalog event')), 3000);
			const req = http.get(`${listened.url}/api/events`, (res) => {
				res.setEncoding('utf8');
				let buf = '';
				res.on('data', (chunk) => {
					buf += chunk;
					if (buf.includes('"type":"catalog"')) {
						clearTimeout(timer);
						resolve(buf);
						req.destroy();
					}
				});
			});
			req.on('error', (error) => {
				if (error.code !== 'ECONNRESET') reject(error);
			});
		});
		await new Promise((resolve) => setTimeout(resolve, 50));
		write(
			root,
			'packages/cli/src/controllers/tags.controller.ts',
			`
@RestController('/tags')
export class TagsController {
	@Get('/')
	async getAll() {}

	@Post('/')
	async createTag() {}
}
`,
		);
		const payload = await events;
		assert.match(payload, /"type":"catalog"/);
		const catalog = watched.getCatalog();
		assert.equal(catalog.routes.length, 2);
		await watched.close();
	});
});
