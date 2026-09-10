// node --test scripts/serve-ready.test.mjs
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, afterEach, describe, it } from 'node:test';

import {
	reportUp,
	serveHealthPath,
	servePort,
	serveUrl,
	waitForHealth,
	waitForReady,
} from './serve-ready.mjs';

const NAME = 'psychic-umbrella-wqj9pvw9p939vp6';
const DOMAIN = 'app.github.dev';

const originalEnv = { ...process.env };
afterEach(() => {
	process.env = { ...originalEnv };
});
after(() => {
	process.env = originalEnv;
});

/** Serves `status` on every request; resolves once it has a port. */
function healthServer(status) {
	const server = createServer((_req, res) => {
		res.writeHead(status).end('');
	});
	return new Promise((resolve) => {
		server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
	});
}

/** Runs `fn` with console.log captured, and returns the lines it wrote. */
function captureLog(fn) {
	const lines = [];
	const original = console.log;
	console.log = (line) => lines.push(String(line));
	try {
		fn();
	} finally {
		console.log = original;
	}
	return lines;
}

describe('servePort', () => {
	it('defaults to 5678', () => {
		delete process.env.N8N_PORT;
		assert.equal(servePort(), '5678');
	});

	it('honours N8N_PORT', () => {
		process.env.N8N_PORT = '5679';
		assert.equal(servePort(), '5679');
	});
});

describe('serveHealthPath', () => {
	it('defaults to /healthz', () => {
		delete process.env.N8N_ENDPOINT_HEALTH;
		assert.equal(serveHealthPath(), '/healthz');
	});

	// The backend config takes the path without a slash, so both spellings must work.
	it('adds the leading slash when the config omits it', () => {
		process.env.N8N_ENDPOINT_HEALTH = 'alive';
		assert.equal(serveHealthPath(), '/alive');
	});

	it('does not double the leading slash', () => {
		process.env.N8N_ENDPOINT_HEALTH = '/alive';
		assert.equal(serveHealthPath(), '/alive');
	});
});

describe('serveUrl', () => {
	it('builds the forwarded codespace URL', () => {
		process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = DOMAIN;
		assert.equal(serveUrl('5678', NAME), `https://${NAME}-5678.${DOMAIN}`);
	});

	it('falls back to localhost off a codespace', () => {
		assert.equal(serveUrl('5678', undefined), 'http://localhost:5678');
	});
});

describe('waitForHealth', () => {
	it('resolves true once the endpoint answers ok', async () => {
		const { server, port } = await healthServer(200);
		try {
			assert.equal(await waitForHealth(port, '/healthz', 5000, 10), true);
		} finally {
			server.close();
		}
	});

	// A booting backend answers 503 before it is ready; that must not count as up.
	it('does not accept a non-ok status', async () => {
		const { server, port } = await healthServer(503);
		try {
			assert.equal(await waitForHealth(port, '/healthz', 60, 10), false);
		} finally {
			server.close();
		}
	});

	it('resolves false when nothing is listening', async () => {
		assert.equal(await waitForHealth(1, '/healthz', 60, 10), false);
	});
});

describe('reportUp', () => {
	it('reports an org-shared port as reachable by the org', () => {
		process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = DOMAIN;
		const lines = captureLog(() => reportUp('5678', { name: NAME, shared: true }));
		assert.match(lines[0], new RegExp(`Up: https://${NAME}-5678\\.${DOMAIN}`));
		assert.match(lines[1], /org-visible/);
	});

	// The share can fail while the backend is up, so say so and give the retry.
	it('reports a failed share with the retry command', () => {
		const lines = captureLog(() =>
			reportUp('5678', { name: NAME, shared: false, error: 'missing scope' }),
		);
		assert.match(lines[1], /still private: missing scope/);
		assert.match(lines[1], new RegExp(`gh codespace ports visibility 5678:org -c ${NAME}`));
	});

	it('prints only the localhost URL off a codespace', () => {
		const lines = captureLog(() =>
			reportUp('5678', { shared: false }, join(tmpdir(), 'no-such-codespaces-dir')),
		);
		assert.deepEqual(lines, ['\nUp: http://localhost:5678']);
	});

	// The bug this helper exists for: a tmux-started process can see an empty box
	// name, so the port is never shared. Saying "localhost" alone would hide that.
	it('flags a codespace whose box name did not resolve', () => {
		const dir = mkdtempSync(join(tmpdir(), 'codespaces-marker-'));
		const lines = captureLog(() => reportUp('5678', { shared: false }, dir));
		assert.equal(lines[0], '\nUp: http://localhost:5678');
		assert.match(lines[1], /the box name did not resolve, so 5678 was not shared/);
	});
});

describe('waitForReady', () => {
	/** Records the paths requested, and answers 200 only on /healthz/readiness. */
	function readinessServer() {
		const paths = [];
		const server = createServer((req, res) => {
			paths.push(req.url);
			res.writeHead(req.url === '/healthz/readiness' ? 200 : 503).end('');
		});
		return new Promise((resolve) => {
			server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port, paths }));
		});
	}

	it('probes the readiness path, not the health path', async () => {
		const { server, port, paths } = await readinessServer();
		try {
			assert.equal(await waitForReady(port, '/healthz', 5000, 10), true);
			assert.deepEqual(paths, ['/healthz/readiness']);
		} finally {
			server.close();
		}
	});

	// A backend that has migrated but not mounted its controllers answers 503 here,
	// while /healthz already answers ok. Seeding then races the REST routes.
	it('does not accept the 503 a booting backend serves', async () => {
		const { server, port } = await healthServer(503);
		try {
			assert.equal(await waitForReady(port, '/healthz', 60, 10), false);
		} finally {
			server.close();
		}
	});
});
