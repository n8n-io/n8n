import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type RequestListener, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { z } from 'zod';

import { createReport } from '../src/report.js';
import { captureSession, type SessionOptions } from '../src/session.js';

let directory: string;
let server: Server | undefined;
let fixture: ReturnType<typeof fork> | undefined;

beforeEach(async () => {
	directory = await mkdtemp(join(tmpdir(), 'n8n-memory-test-'));
});
afterEach(async () => {
	vi.unstubAllEnvs();
	if (fixture && fixture.exitCode === null && fixture.signalCode === null) {
		fixture.kill('SIGTERM');
		await once(fixture, 'exit');
	}
	fixture = undefined;
	if (server) {
		server.closeAllConnections();
		await new Promise<void>((resolve) => server!.close(() => resolve()));
		server = undefined;
	}
	await rm(directory, { recursive: true, force: true });
});

async function* inputs(...labels: string[]) {
	yield* labels;
}
const silent = () => {};
const options = (url: string): SessionOptions => ({
	url,
	output: directory,
	cwd: directory,
	intervalMs: 50,
	timeoutMs: 1000,
	gc: false,
	snapshots: false,
});

async function startFixture() {
	fixture = fork(fileURLToPath(new URL('./fixtures/process.mjs', import.meta.url)), [], {
		cwd: directory,
		execArgv: ['--expose-gc'],
		stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
	});
	const [message] = await once(fixture, 'message');
	const { port } = z.object({ port: z.number() }).parse(message);
	return `http://127.0.0.1:${port}`;
}

async function tellFixture(message: 'allocate' | 'release') {
	const reply = once(fixture!, 'message');
	fixture!.send(message);
	await reply;
}

async function startServer(handler: RequestListener) {
	server = createServer(handler);
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('No server port');
	return `http://127.0.0.1:${address.port}`;
}

const reading = (hostId = 'original', processStartId = '11111111-1111-4111-8111-111111111111') => ({
	version: 1,
	hostId,
	processStartId,
	instanceType: 'main',
	isLeader: true,
	memory: {
		rss: 40_000_000,
		heapTotal: 20_000_000,
		heapUsed: 10_000_000,
		external: 500_000,
		arrayBuffers: 100_000,
	},
	resources: {},
	collections: {},
});

async function waitForFile(path: string) {
	for (let attempt = 0; attempt < 100; attempt++) {
		try {
			return await readFile(path, 'utf8');
		} catch {
			await delay(20);
		}
	}
	throw new Error(`Workload did not create ${path}`);
}

describe('capture contracts', () => {
	test('records a real retained heap and Buffer allocation and verifies its release', async () => {
		const url = await startFixture();
		async function* action() {
			await tellFixture('allocate');
			yield 'allocated';
			await tellFixture('release');
			yield 'released';
			yield 'quit';
		}
		const result = await captureSession(
			{ ...options(url), gc: true },
			[],
			action(),
			new AbortController().signal,
			silent,
		);
		expect(result.manifest.status).toBe('completed');
		const report = await createReport(result.directory);
		const baseline = report.checkpoints[0];
		const allocated = report.checkpoints.find((entry) => entry.label === 'allocated')!;
		const released = report.checkpoints.find((entry) => entry.label === 'released')!;
		expect(allocated.memory.heapUsed - baseline.memory.heapUsed).toBeGreaterThan(6 * 1024 * 1024);
		expect(allocated.memory.arrayBuffers - baseline.memory.arrayBuffers).toBeGreaterThan(
			15 * 1024 * 1024,
		);
		expect(released.memory.heapUsed - baseline.memory.heapUsed).toBeLessThan(3 * 1024 * 1024);
		expect(released.memory.arrayBuffers - baseline.memory.arrayBuffers).toBeLessThan(1024 * 1024);
		expect(released.collections.fixture).toBe(0);
	}, 10000);

	test('reports retained allocation without declaring a completed capture leak-free', async () => {
		const url = await startFixture();
		async function* action() {
			await tellFixture('allocate');
			yield 'quit';
		}
		const result = await captureSession(
			{ ...options(url), gc: true },
			[],
			action(),
			new AbortController().signal,
			silent,
		);
		const report = await createReport(result.directory);
		expect(report.finalDeltaBytes?.heapUsed).toBeGreaterThan(6 * 1024 * 1024);
		expect(report.notes).toContain('Capture completed. This is not a leak-free verdict.');
	}, 10000);

	test('creates unique runs, never resets the target, and rejects mixed evidence', async () => {
		const paths: Array<string | undefined> = [];
		const url = await startServer((request, response) => {
			paths.push(request.url);
			response.end(JSON.stringify({ data: reading() }));
		});
		const first = await captureSession(
			options(url),
			[],
			inputs('quit'),
			new AbortController().signal,
			silent,
		);
		const second = await captureSession(
			options(url),
			[],
			inputs('quit'),
			new AbortController().signal,
			silent,
		);
		expect(first.directory).not.toBe(second.directory);
		expect(paths.every((path) => path === '/rest/e2e/internals')).toBe(true);
		await writeFile(
			join(second.directory, 'samples.jsonl'),
			await readFile(join(first.directory, 'samples.jsonl')),
		);
		await expect(createReport(second.directory)).rejects.toThrow('mixed identities');
	});

	test('saves partial failure and cancels its workload when the target process changes', async () => {
		let processStartId = randomUUID();
		const url = await startServer((_request, response) =>
			response.end(JSON.stringify({ data: reading('unchanged-container-host', processStartId) })),
		);
		const marker = join(directory, 'ticks');
		const script = `const fs=require('node:fs'); fs.writeFileSync(${JSON.stringify(marker)},process.env.RESET_E2E_DB);setInterval(()=>fs.appendFileSync(${JSON.stringify(marker)},'.'),20);`;
		const capture = captureSession(
			options(url),
			[process.execPath, '-e', script],
			inputs(),
			new AbortController().signal,
			silent,
		);
		expect(await waitForFile(marker)).toContain('false');
		processStartId = randomUUID();
		const result = await capture;
		expect(result.manifest.status).toBe('failed');
		expect(result.manifest.error).toContain('process changed');
		const stopped = await readFile(marker, 'utf8');
		await delay(150);
		expect(await readFile(marker, 'utf8')).toBe(stopped);
		expect((await createReport(result.directory)).status).toBe('failed');
	}, 10000);

	test('fails promptly when sampling fails while interactive input is waiting', async () => {
		let calls = 0;
		const url = await startServer((_request, response) => {
			if (++calls > 2) {
				response.statusCode = 503;
				response.end();
			} else response.end(JSON.stringify({ data: reading() }));
		});
		async function* waiting() {
			await delay(1000);
			yield 'quit';
		}
		const start = Date.now();
		const result = await captureSession(
			options(url),
			[],
			waiting(),
			new AbortController().signal,
			silent,
		);
		expect(Date.now() - start).toBeLessThan(900);
		expect(result.manifest.status).toBe('failed');
		expect(result.manifest.error).toContain('503');
		expect((await createReport(result.directory)).checkpoints).toHaveLength(1);
	});

	test('saves interruption and stops its child while leaving the target running', async () => {
		let calls = 0;
		const url = await startServer((_request, response) => {
			calls++;
			response.end(JSON.stringify({ data: reading() }));
		});
		const marker = join(directory, 'active');
		const controller = new AbortController();
		const capture = captureSession(
			options(url),
			[
				process.execPath,
				'-e',
				`const fs=require('node:fs');fs.writeFileSync(${JSON.stringify(marker)},'ready');setInterval(()=>fs.appendFileSync(${JSON.stringify(marker)},'.'),20);`,
			],
			inputs(),
			controller.signal,
			silent,
		);
		await waitForFile(marker);
		controller.abort(new Error('Test interruption'));
		const result = await capture;
		expect(result.manifest.status).toBe('interrupted');
		expect(result.manifest.error).toContain('Test interruption');
		expect(server?.listening).toBe(true);
		expect(calls).toBeGreaterThanOrEqual(2);
		const stopped = await readFile(marker, 'utf8');
		await delay(150);
		expect(await readFile(marker, 'utf8')).toBe(stopped);
	});

	test('bounds stalled requests and saves a failed partial capture', async () => {
		let calls = 0;
		const url = await startServer((_request, response) => {
			if (++calls <= 2) response.end(JSON.stringify({ data: reading() }));
		});
		async function* waiting() {
			await delay(1000);
			yield 'quit';
		}
		const result = await captureSession(
			{ ...options(url), timeoutMs: 80 },
			[],
			waiting(),
			new AbortController().signal,
			silent,
		);
		expect(result.manifest.status).toBe('failed');
		expect(result.manifest.observationCount).toBe(1);
	});

	test('records a workload failure and keeps the caller working directory', async () => {
		const url = await startServer((_request, response) =>
			response.end(JSON.stringify({ data: reading() })),
		);
		const result = await captureSession(
			options(url),
			[
				process.execPath,
				'-e',
				"require('node:fs').writeFileSync('cwd-marker','ok');process.exit(9);",
			],
			inputs(),
			new AbortController().signal,
			silent,
		);
		expect(result.manifest.status).toBe('failed');
		expect(result.manifest.workloadExitCode).toBe(9);
		expect(await readFile(join(directory, 'cwd-marker'), 'utf8')).toBe('ok');
	});

	test('clears split-editor lifecycle settings inherited from the caller', async () => {
		vi.stubEnv('N8N_EDITOR_URL', 'http://localhost:8080');
		const url = await startServer((_request, response) =>
			response.end(JSON.stringify({ data: reading() })),
		);
		const marker = join(directory, 'editor-env');
		const result = await captureSession(
			options(url),
			[
				process.execPath,
				'-e',
				`require('node:fs').writeFileSync(${JSON.stringify(marker)},process.env.N8N_EDITOR_URL??'unset')`,
			],
			inputs(),
			new AbortController().signal,
			silent,
		);
		expect(result.manifest.status).toBe('completed');
		expect(await readFile(marker, 'utf8')).toBe('unset');
	});

	test('stops an uncooperative descendant after the parent exits on cancellation', async () => {
		const url = await startServer((_request, response) =>
			response.end(JSON.stringify({ data: reading() })),
		);
		const marker = join(directory, 'descendant-ticks');
		const descendant = `const fs=require('node:fs');process.on('SIGTERM',()=>{});fs.writeFileSync(${JSON.stringify(marker)},'ready');setInterval(()=>fs.appendFileSync(${JSON.stringify(marker)},'.'),20);`;
		const parent = `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:'ignore'});process.on('SIGTERM',()=>process.exit(0));setInterval(()=>{},1000);`;
		const controller = new AbortController();
		const capture = captureSession(
			options(url),
			[process.execPath, '-e', parent],
			inputs(),
			controller.signal,
			silent,
		);
		await waitForFile(marker);
		controller.abort(new Error('Test group interruption'));
		const result = await capture;
		expect(result.manifest.status).toBe('interrupted');
		const stopped = await readFile(marker, 'utf8');
		await delay(150);
		expect(await readFile(marker, 'utf8')).toBe(stopped);
	}, 10000);

	test('downloads snapshots completely and rejects missing captures during offline reporting', async () => {
		const url = await startFixture();
		const result = await captureSession(
			{ ...options(url), snapshots: true },
			[],
			inputs('quit'),
			new AbortController().signal,
			silent,
		);
		expect(result.manifest.snapshots).toHaveLength(2);
		const report = await createReport(result.directory);
		expect(report.mode).toBe('snapshots');
		const first = result.manifest.snapshots[0];
		expect(JSON.parse(await readFile(join(result.directory, first.file), 'utf8'))).toHaveProperty(
			'snapshot',
		);
		const original = await readFile(join(result.directory, first.file));
		const altered = Buffer.from(original);
		altered[0] = 0;
		await writeFile(join(result.directory, first.file), altered);
		await expect(createReport(result.directory)).rejects.toThrow('does not match');
		await writeFile(join(result.directory, first.file), original);
		await rm(join(result.directory, first.file));
		await expect(createReport(result.directory)).rejects.toThrow();
	}, 15000);
});
