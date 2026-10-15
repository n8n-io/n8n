import { afterEach, describe, expect, it, vi } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

import { record, controlSession, stopOwnedProcess } from '../record.mjs';
import { buildReport } from '../report.mjs';
import { serveViewer } from '../viewer.mjs';
import { InspectorClient } from '../inspector.mjs';

const directories = [];
const children = [];
const viewers = [];
afterEach(async () => {
	vi.restoreAllMocks();
	for (const viewer of viewers.splice(0)) await viewer.close();
	for (const child of children.splice(0)) {
		if (child.exitCode === null && child.signalCode === null) {
			child.kill('SIGKILL');
			await once(child, 'exit');
		}
	}
	for (const directory of directories.splice(0))
		await rm(directory, { recursive: true, force: true });
});

async function temporary() {
	const directory = await mkdtemp(join(tmpdir(), 'n8n-memory-record-'));
	directories.push(directory);
	return directory;
}
async function waitFor(read, timeout = 10_000) {
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) {
		try {
			const result = await read();
			if (result) return result;
		} catch {}
		await delay(25);
	}
	throw new Error('Condition timed out');
}
async function backend({ port = 0, inspectorPort = 0 } = {}) {
	const child = spawn(
		process.execPath,
		[
			`--inspect=127.0.0.1:${inspectorPort}`,
			fileURLToPath(new URL('../__fixtures__/backend.mjs', import.meta.url)),
			String(port),
		],
		{ stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, N8N_MEMORY_PROFILING: 'true' } },
	);
	children.push(child);
	let stdout = '';
	let stderr = '';
	child.stdout.on('data', (chunk) => {
		stdout += chunk;
	});
	child.stderr.on('data', (chunk) => {
		stderr += chunk;
	});
	return await waitFor(() => {
		const match = /Debugger listening on (ws:\/\/[^\s]+)/.exec(stderr);
		if (stdout.includes('\n') && match)
			return { child, url: JSON.parse(stdout.trim()).url, inspector: match[1] };
	});
}
function settings(output, target, overrides = {}) {
	return {
		output,
		url: target.url,
		inspector: target.inspector,
		open: false,
		metricsOnly: false,
		churn: false,
		workload: 'test-workload',
		durationMs: 350,
		warmupMs: 50,
		intervalMs: 50,
		profileIntervalMs: 100,
		samplingIntervalBytes: 32768,
		startupTimeoutMs: 1000,
		requestTimeoutMs: 500,
		...overrides,
	};
}

describe('backend recording', () => {
	it('accepts a signal error when the owned process group has exited', async () => {
		const child = spawn(process.execPath, ['-e', ''], { detached: true, stdio: 'ignore' });
		children.push(child);
		await once(child, 'exit');
		vi.spyOn(process, 'kill').mockImplementation(() => {
			throw Object.assign(new Error('kill EPERM'), { code: 'EPERM' });
		});
		await expect(stopOwnedProcess(child)).resolves.toBeUndefined();
	});
	it('reaps an owned process group after shutdown', async () => {
		const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
			detached: true,
			stdio: 'ignore',
		});
		children.push(child);
		await once(child, 'spawn');
		await stopOwnedProcess(child);
		await waitFor(() => child.exitCode !== null || child.signalCode !== null);
	});
	it('waits for an owned process group when a shutdown probe fails', async () => {
		const child = spawn(
			process.execPath,
			[
				'-e',
				`
			process.on('SIGTERM', () => setTimeout(() => process.exit(), 200));
			setInterval(() => {}, 1000);
			process.stdout.write('ready');
		`,
			],
			{ detached: true, stdio: ['ignore', 'pipe', 'ignore'] },
		);
		children.push(child);
		await once(child.stdout, 'data');
		const childPid = child.pid;
		if (!childPid) throw new Error('Missing test process ID');
		const kill = process.kill.bind(process);
		let probes = 0;
		vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
			if (pid === -childPid && signal === 0 && probes++ === 0)
				throw Object.assign(new Error('kill EPERM'), { code: 'EPERM' });
			return kill(pid, signal);
		});
		await stopOwnedProcess(child);
		expect(probes).toBeGreaterThan(1);
		await waitFor(() => child.exitCode !== null || child.signalCode !== null);
	});
	it('records an attached backend, supports controls, and replays the same evidence', async () => {
		const target = await backend();
		const output = join(await temporary(), 'recording');
		const recording = record(settings(output, target, { durationMs: 700 }));
		await waitFor(async () => (await controlSession(output, 'status')).ready);
		await controlSession(output, 'mark', { label: 'allocated workload' });
		await fetch(`${target.url}/allocate`);
		const status = await controlSession(output, 'status');
		expect(status.capabilities.requests).toBe(true);
		const liveResponse = await fetch(new URL('api/report', status.viewerUrl));
		expect((await liveResponse.json()).live).toBe(true);
		const report = await recording;
		expect(report.session.status).toBe('complete');
		expect(report.session.segments[0].pid).toBe(target.child.pid);
		expect(report.session.profiles.length).toBeGreaterThan(0);
		expect(report.session.markers[0].label).toBe('allocated workload');
		expect(report.measurementSampleCount).toBeGreaterThan(1);
		const requests = (await readFile(join(output, 'requests.ndjson'), 'utf8'))
			.trim()
			.split('\n')
			.map((line) => JSON.parse(line));
		expect(requests.map((request) => request.event)).toEqual(['start', 'finish']);
		expect(requests[1]).toMatchObject({
			route: '/rest/workflows/:id',
			statusCode: 200,
			segmentId: 'process-1',
		});
		const profile = JSON.parse(
			await readFile(join(output, report.session.profiles[0].file), 'utf8'),
		);
		expect(profile.head.callFrame).toBeDefined();
		expect((await fetch(`${target.url}/healthz`)).ok).toBe(true);
		const inspector = await InspectorClient.connect(target.inspector);
		try {
			expect(
				await inspector.evaluate(
					"process.getBuiltinModule('node:diagnostics_channel').channel('n8n.memory-profiler.requests').hasSubscribers",
				),
			).toBe(false);
		} finally {
			inspector.close();
		}
		const viewer = await serveViewer({ input: join(output, 'session.json') });
		viewers.push(viewer);
		const secondViewer = await serveViewer({ input: join(output, 'session.json') });
		viewers.push(secondViewer);
		expect(new URL(viewer.url).port).not.toBe(new URL(secondViewer.url).port);
		const replay = await fetch(new URL('api/report', viewer.url)).then(
			async (response) => await response.json(),
		);
		expect(replay.memory).toEqual(report.memory);
		expect(replay.live).toBe(false);
		expect(
			(
				await fetch(new URL('api/strings', viewer.url)).then(
					async (response) => await response.json(),
				)
			).title,
		).toBe('Backend memory profile');
		expect((await fetch(new URL('api/stop', viewer.url), { method: 'POST' })).status).toBe(404);
	});
	it('keeps partial artifacts after a bounded readiness failure', async () => {
		const target = await backend();
		const output = join(await temporary(), 'recording');
		await fetch(`${target.url}/unavailable`);
		const report = await record(settings(output, target, { startupTimeoutMs: 100 }));
		expect(report.session.status).toBe('failed');
		expect(report.session.errors[0].message).toContain('readiness timed out');
		expect(report.comparison.eligible).toBe(false);
		expect(JSON.parse(await readFile(join(output, 'summary.json'), 'utf8')).session.status).toBe(
			'failed',
		);
	});
	it('stops early without stopping an attached backend', async () => {
		const target = await backend();
		const output = join(await temporary(), 'recording');
		const recording = record(settings(output, target, { durationMs: 60_000 }));
		await waitFor(async () => (await controlSession(output, 'status')).ready);
		await controlSession(output, 'stop');
		await recording;
		expect((await fetch(`${target.url}/healthz`)).ok).toBe(true);
	});
	it('pauses all capture and resumes within the active duration limit', async () => {
		const target = await backend();
		const output = join(await temporary(), 'recording');
		const recording = record(settings(output, target, { durationMs: 800 }));
		await waitFor(async () => (await controlSession(output, 'status')).ready);
		await fetch(`${target.url}/allocate`);
		await controlSession(output, 'pause');
		await controlSession(output, 'pause');
		const paused = await controlSession(output, 'status');
		expect(paused).toMatchObject({
			phase: 'paused',
			ready: true,
			recording: false,
			recordingId: null,
		});
		const readTimeline = async () => await readFile(join(output, 'timeline.ndjson'), 'utf8');
		const timeline = await readTimeline();
		const requestEvents = await readFile(join(output, 'requests.ndjson'), 'utf8');
		const inspector = await InspectorClient.connect(target.inspector);
		try {
			expect(
				await inspector.evaluate(
					"process.getBuiltinModule('node:diagnostics_channel').channel('n8n.memory-profiler.requests').hasSubscribers",
				),
			).toBe(false);
		} finally {
			inspector.close();
		}
		await fetch(`${target.url}/allocate`);
		await delay(900);
		expect((await controlSession(output, 'status')).phase).toBe('paused');
		expect(await readTimeline()).toBe(timeline);
		expect(await readFile(join(output, 'requests.ndjson'), 'utf8')).toBe(requestEvents);
		await controlSession(output, 'resume');
		await controlSession(output, 'resume');
		await fetch(`${target.url}/allocate`);
		const report = await recording;
		expect(report.session.status).toBe('complete');
		expect(report.session.recordingIntervals).toHaveLength(2);
		expect(report.session.pauses).toHaveLength(1);
		expect(report.session.pauses[0].durationMs).toBeGreaterThanOrEqual(900);
		expect(report.activeCaptureDurationMs).toBeGreaterThanOrEqual(800);
		expect(report.activeCaptureDurationMs).toBeLessThan(1600);
		expect(report.comparison.issues).toContain('Capture includes recording pauses');
		const samples = (await readTimeline())
			.trim()
			.split('\n')
			.map((line) => JSON.parse(line));
		expect(
			new Set(
				samples
					.filter((sample) => sample.phase === 'measurement')
					.map((sample) => sample.recordingId),
			),
		).toEqual(new Set(['recording-1', 'recording-2']));
		expect(new Set(report.session.profiles.map((profile) => profile.recordingId))).toEqual(
			new Set(['recording-1', 'recording-2']),
		);
		const events = (await readFile(join(output, 'requests.ndjson'), 'utf8'))
			.trim()
			.split('\n')
			.map((line) => JSON.parse(line));
		expect(events.map((event) => event.id)).toEqual([1, 1, 3, 3]);
		expect(events.map((event) => event.recordingId)).toEqual([
			'recording-1',
			'recording-1',
			'recording-2',
			'recording-2',
		]);
		expect((await fetch(`${target.url}/healthz`)).ok).toBe(true);
	});
	it('reports scrape gaps and prevents a complete comparison', async () => {
		const target = await backend();
		const output = join(await temporary(), 'recording');
		const recording = record(settings(output, target, { durationMs: 500 }));
		await waitFor(async () => (await controlSession(output, 'status')).ready);
		await fetch(`${target.url}/unavailable`);
		const report = await recording;
		expect(report.session.status).toBe('partial');
		expect(report.session.gaps.length).toBeGreaterThan(0);
		expect(report.comparison.eligible).toBe(false);
	});
	it('tracks an attached backend restart through Inspector discovery', async () => {
		const target = await backend();
		const output = join(await temporary(), 'recording');
		const inspectorPort = Number(new URL(target.inspector).port);
		const recording = record(
			settings(output, target, {
				inspector: `http://127.0.0.1:${inspectorPort}`,
				durationMs: 1500,
			}),
		);
		await waitFor(async () => (await controlSession(output, 'status')).ready);
		target.child.kill('SIGKILL');
		await once(target.child, 'exit');
		const replacement = await backend({ port: Number(new URL(target.url).port), inspectorPort });
		const report = await recording;
		expect(report.session.segments.map((segment) => segment.pid)).toEqual([
			target.child.pid,
			replacement.child.pid,
		]);
		expect(report.comparison.issues).toContain('Capture spans multiple process segments');
	});
	it('writes one final JSON result for a headless CLI run', async () => {
		const target = await backend();
		const output = join(await temporary(), 'recording');
		const child = spawn(
			process.execPath,
			[
				fileURLToPath(new URL('../cli.mjs', import.meta.url)),
				'record',
				'--url',
				target.url,
				'--inspector',
				target.inspector,
				'--duration',
				'300ms',
				'--interval',
				'50ms',
				'--json',
				'--output',
				output,
			],
			{ stdio: ['ignore', 'pipe', 'pipe'] },
		);
		children.push(child);
		let stdout = '';
		child.stdout.on('data', (chunk) => {
			stdout += chunk;
		});
		child.stderr.resume();
		const [code] = await once(child, 'exit');
		expect(code).toBe(0);
		expect(JSON.parse(stdout).kind).toBe('n8n-memory-report');
		expect(stdout.trim().split('\n')).toHaveLength(1);
		const saved = await buildReport(join(output, 'session.json'));
		expect(saved.session.status).toBe('complete');
	});
	it('streams an explicit snapshot and opens its standalone summary', async () => {
		const target = await backend();
		const output = join(await temporary(), 'recording');
		const recording = record(settings(output, target, { durationMs: 10_000 }));
		await waitFor(async () => (await controlSession(output, 'status')).ready);
		const snapshot = await controlSession(output, 'snapshot');
		await controlSession(output, 'stop');
		const report = await recording;
		expect(report.session.snapshots).toHaveLength(1);
		const file = join(output, snapshot.file);
		expect(JSON.parse(await readFile(file, 'utf8')).snapshot.meta.node_fields).toContain(
			'self_size',
		);
		const viewer = await serveViewer({ input: file });
		viewers.push(viewer);
		const response = await fetch(new URL('api/report', viewer.url));
		const summary = await response.json();
		expect(summary.kind).toBe('heapsnapshot');
		expect(summary.constructors.length).toBeGreaterThan(0);
		expect(summary.session).toBeUndefined();
	});
	it('finishes a signaled CLI recording with an interrupted result', async () => {
		const target = await backend();
		const output = join(await temporary(), 'recording');
		const child = spawn(
			process.execPath,
			[
				fileURLToPath(new URL('../cli.mjs', import.meta.url)),
				'record',
				'--url',
				target.url,
				'--inspector',
				target.inspector,
				'--duration',
				'60s',
				'--json',
				'--output',
				output,
			],
			{ stdio: ['ignore', 'pipe', 'pipe'] },
		);
		children.push(child);
		let stdout = '';
		child.stdout.on('data', (chunk) => {
			stdout += chunk;
		});
		child.stderr.resume();
		await waitFor(async () => (await controlSession(output, 'status')).ready);
		child.kill('SIGTERM');
		const [code] = await once(child, 'exit');
		expect(code).toBe(130);
		expect(JSON.parse(stdout).session.status).toBe('interrupted');
		expect((await fetch(`${target.url}/healthz`)).ok).toBe(true);
	});
});
