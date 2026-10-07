import { spawn } from 'child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { createServer } from 'http';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import {
	getFreePort,
	isPortFree,
	removeDir,
	signalProcessGroup,
	stopProcessGroup,
	waitForN8n,
	waitForReadiness,
} from './local-n8n-process.mjs';

const cleanups = [];

afterEach(async () => {
	for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

/** Start an HTTP server that answers with the next reply of `replies`, and then with the last one. */
async function startServer(replies) {
	const calls = [];
	const server = createServer((req, res) => {
		calls.push(`${req.method} ${req.url}`);
		const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
		res.writeHead(reply.status, { 'content-type': reply.type ?? 'application/json' });
		res.end(reply.body ?? '{}');
	});
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	cleanups.push(async () => await new Promise((resolve) => server.close(resolve)));
	return { url: `http://127.0.0.1:${server.address().port}`, calls };
}

function isAlive(pid) {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

/** Start a detached Node.js process that ignores SIGTERM when `ignoreTerm` is set. */
function startDetached(ignoreTerm) {
	const code = `${ignoreTerm ? "process.on('SIGTERM', () => {});" : ''} setInterval(() => {}, 1000); console.log('up');`;
	const child = spawn(process.execPath, ['-e', code], {
		detached: true,
		stdio: ['ignore', 'pipe', 'ignore'],
	});
	cleanups.push(() => signalProcessGroup(child, 'SIGKILL'));
	return new Promise((resolve) => child.stdout.once('data', () => resolve(child)));
}

describe('ports', () => {
	it('reports a free port as free and a used port as used', async () => {
		const port = await getFreePort();
		expect(port).toBeGreaterThan(0);
		expect(await isPortFree(port)).toBe(true);

		const server = await startServer([{ status: 200 }]);
		const usedPort = Number(new URL(server.url).port);

		expect(await isPortFree(usedPort)).toBe(false);
	});
});

describe('waitForReadiness', () => {
	it('waits until /healthz/readiness answers 200', async () => {
		const server = await startServer([{ status: 503 }, { status: 503 }, { status: 200 }]);

		await waitForReadiness(server.url, 10_000);

		expect(server.calls).toEqual([
			'GET /healthz/readiness',
			'GET /healthz/readiness',
			'GET /healthz/readiness',
		]);
	});

	it('names the last status when the time is up', async () => {
		const server = await startServer([{ status: 503 }]);

		await expect(waitForReadiness(server.url, 300)).rejects.toThrow(
			`n8n at ${server.url} was not ready within 300ms (last: HTTP 503)`,
		);
	});

	it('names the connection error when nothing listens', async () => {
		const port = await getFreePort();

		await expect(waitForReadiness(`http://127.0.0.1:${port}`, 300)).rejects.toThrow(
			/was not ready within 300ms \(last: fetch failed\)/,
		);
	});
});

describe('waitForN8n', () => {
	it('waits while the reset route is not registered', async () => {
		const server = await startServer([
			{ status: 404, type: 'text/html', body: '<pre>Cannot POST /rest/e2e/reset</pre>' },
			{ status: 400, body: '{"message":"bad request"}' },
		]);

		await waitForN8n(server.url, 10_000);

		expect(server.calls).toEqual(['POST /rest/e2e/reset', 'POST /rest/e2e/reset']);
	});

	it('accepts a JSON 404 from the registered route', async () => {
		const server = await startServer([{ status: 404, body: '{"message":"not found"}' }]);

		await waitForN8n(server.url, 10_000);

		expect(server.calls).toHaveLength(1);
	});
});

describe('process groups', () => {
	it('stops a process that exits on SIGTERM', async () => {
		const child = await startDetached(false);

		await stopProcessGroup(child, { graceMs: 5_000 });

		expect(child.signalCode).toBe('SIGTERM');
		expect(isAlive(child.pid)).toBe(false);
	});

	it('kills a process that ignores the first signal after the grace time', async () => {
		const child = await startDetached(true);
		const started = Date.now();

		await stopProcessGroup(child, { signal: 'SIGTERM', graceMs: 300 });
		await new Promise((resolve) =>
			child.exitCode !== null || child.signalCode ? resolve() : child.once('exit', resolve),
		);

		expect(Date.now() - started).toBeGreaterThanOrEqual(250);
		expect(child.signalCode).toBe('SIGKILL');
	});

	it('does nothing for a child without a pid', async () => {
		expect(() => signalProcessGroup(undefined)).not.toThrow();
		expect(() => signalProcessGroup({ pid: undefined })).not.toThrow();
		await expect(stopProcessGroup(undefined)).resolves.toBeUndefined();
	});
});

describe('removeDir', () => {
	it('removes a directory tree and ignores a missing one', () => {
		const root = mkdtempSync(path.join(os.tmpdir(), 'local-n8n-process-test-'));
		mkdirSync(path.join(root, 'a', 'b'), { recursive: true });
		writeFileSync(path.join(root, 'a', 'b', 'file.txt'), 'x');

		removeDir(root);
		removeDir(root);

		expect(existsSync(root)).toBe(false);
	});
});
