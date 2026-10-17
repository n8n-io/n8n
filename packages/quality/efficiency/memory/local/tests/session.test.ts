import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer, type RequestListener, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
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

async function startServer(handler: RequestListener) {
	server = createServer(handler);
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('No server port');
	return `http://127.0.0.1:${address.port}`;
}

const reading = (processStartId: string) => ({
	version: 1,
	hostId: 'main-1',
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

test('detects a retained heap and Buffer allocation and its release', async () => {
	fixture = fork(fileURLToPath(new URL('./fixtures/process.mjs', import.meta.url)), [], {
		execArgv: ['--expose-gc'],
		stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
	});
	const [ready] = await once(fixture, 'message');
	const { port } = z.object({ port: z.number() }).parse(ready);
	const tell = async (message: 'allocate' | 'release') => {
		const reply = once(fixture!, 'message');
		fixture!.send(message);
		await reply;
	};
	async function* action() {
		await tell('allocate');
		yield 'allocated';
		await tell('release');
		yield 'released';
		yield 'quit';
	}

	const result = await captureSession(
		{ ...options(`http://127.0.0.1:${port}`), gc: true },
		[],
		action(),
		new AbortController().signal,
		silent,
	);

	const { checkpoints } = await createReport(result.directory);
	const [baseline, allocated, released] = checkpoints;
	const MiB = 1024 * 1024;
	expect(allocated.memory.heapUsed - baseline.memory.heapUsed).toBeGreaterThan(6 * MiB);
	expect(allocated.memory.arrayBuffers - baseline.memory.arrayBuffers).toBeGreaterThan(15 * MiB);
	expect(released.memory.heapUsed - baseline.memory.heapUsed).toBeLessThan(3 * MiB);
	expect(released.memory.arrayBuffers - baseline.memory.arrayBuffers).toBeLessThan(MiB);
}, 10000);

// A restart drops memory, which would otherwise read as a release.
test('fails the run and stops its workload when the n8n process restarts', async () => {
	let processStartId = randomUUID();
	const url = await startServer((_request, response) =>
		response.end(JSON.stringify({ data: reading(processStartId) })),
	);
	const marker = join(directory, 'ticks');
	const workload = `const fs=require('node:fs');fs.writeFileSync(${JSON.stringify(marker)},'');setInterval(()=>fs.appendFileSync(${JSON.stringify(marker)},'.'),20);`;
	const capture = captureSession(
		options(url),
		[process.execPath, '-e', workload],
		inputs(),
		new AbortController().signal,
		silent,
	);
	await waitForFile(marker);

	processStartId = randomUUID();
	const result = await capture;

	expect(result.manifest.status).toBe('failed');
	expect(result.manifest.error).toContain('process changed');
	const stopped = await readFile(marker, 'utf8');
	await delay(150);
	expect(await readFile(marker, 'utf8')).toBe(stopped);
}, 10000);

test('stops a workload descendant that ignores SIGTERM after its parent exits', async () => {
	const processStartId = randomUUID();
	const url = await startServer((_request, response) =>
		response.end(JSON.stringify({ data: reading(processStartId) })),
	);
	const marker = join(directory, 'descendant-ticks');
	const descendant = `const fs=require('node:fs');process.on('SIGTERM',()=>{});fs.writeFileSync(${JSON.stringify(marker)},'');setInterval(()=>fs.appendFileSync(${JSON.stringify(marker)},'.'),20);`;
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

	controller.abort(new Error('Interrupted'));
	const result = await capture;

	expect(result.manifest.status).toBe('interrupted');
	const stopped = await readFile(marker, 'utf8');
	await delay(150);
	expect(await readFile(marker, 'utf8')).toBe(stopped);
}, 10000);

// Playwright treats N8N_EDITOR_URL as dev mode and its teardown kills the backend port.
test('runs workloads without the caller N8N_EDITOR_URL', async () => {
	vi.stubEnv('N8N_EDITOR_URL', 'http://localhost:8080');
	const processStartId = randomUUID();
	const url = await startServer((_request, response) =>
		response.end(JSON.stringify({ data: reading(processStartId) })),
	);
	const marker = join(directory, 'editor-env');

	await captureSession(
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

	expect(await readFile(marker, 'utf8')).toBe('unset');
});
