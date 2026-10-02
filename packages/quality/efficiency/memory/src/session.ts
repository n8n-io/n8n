import { runSerially } from '@n8n/utils/run-serially';
import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, mkdtemp, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { DiagnosticsClient, normalizeUrl } from './client.js';
import type { Manifest, Observation } from './schema.js';
import { runWorkload } from './workload.js';

export interface SessionOptions {
	url: string;
	output: string;
	intervalMs: number;
	timeoutMs: number;
	gc: boolean;
	snapshots: boolean;
	cwd: string;
}

async function nextInput(
	iterator: AsyncIterator<string>,
	signal: AbortSignal,
): Promise<IteratorResult<string>> {
	signal.throwIfAborted();
	let rejectAbort: (reason: unknown) => void = () => {};
	const aborted = new Promise<never>((_, reject) => {
		rejectAbort = reject;
	});
	const stop = () => rejectAbort(signal.reason);
	signal.addEventListener('abort', stop, { once: true });
	try {
		return await Promise.race([iterator.next(), aborted]);
	} finally {
		signal.removeEventListener('abort', stop);
	}
}

export interface SessionResult {
	directory: string;
	manifest: Manifest;
}

export async function captureSession(
	options: SessionOptions,
	command: string[],
	input: AsyncIterable<string>,
	signal: AbortSignal,
	log: (message: string) => void = console.log,
): Promise<SessionResult> {
	const url = normalizeUrl(options.url);
	const controller = new AbortController();
	const abort = () => controller.abort(signal.reason);
	signal.addEventListener('abort', abort, { once: true });
	if (signal.aborted) abort();
	const client = new DiagnosticsClient(url, options.timeoutMs, controller.signal);
	let directory: string | undefined;
	let manifest: Manifest | undefined;
	const pending = new Map<string, Promise<unknown>>();
	const sampling = new AbortController();
	let sampler: Promise<void> = Promise.resolve();
	let samplerError: unknown;
	const saveManifest = async () => {
		if (!directory || !manifest) return;
		const partial = join(directory, 'manifest.json.partial');
		await writeFile(partial, JSON.stringify(manifest, null, 2));
		await rename(partial, join(directory, 'manifest.json'));
	};
	try {
		const initial = await client.read();
		const parent = resolve(options.cwd, options.output);
		await mkdir(parent, { recursive: true });
		directory = await mkdtemp(join(parent, 'run-'));
		manifest = {
			version: 1,
			runId: randomUUID(),
			status: 'recording',
			startedAt: Date.now(),
			url,
			hostId: initial.hostId,
			processStartId: initial.processStartId,
			instanceType: initial.instanceType,
			mode: options.snapshots ? 'snapshots' : 'measurements',
			intervalMs: options.intervalMs,
			gc: options.gc || options.snapshots,
			observationCount: 0,
			snapshots: [],
		};
		await writeFile(join(directory, 'samples.jsonl'), '', { flag: 'wx' });
		await saveManifest();
		log(`Run: ${directory}`);
		log(`Attached to ${initial.instanceType} ${initial.hostId}. n8n stays under your control.`);
		const runDirectory = directory;
		const state = manifest;
		const record = async (checkpoint?: string) =>
			await runSerially(pending, 'capture', async () => {
				controller.signal.throwIfAborted();
				if (checkpoint && state.gc) {
					await client.gc();
					await delay(500, undefined, { signal: controller.signal });
				}
				const reading = await client.read();
				if (
					reading.hostId !== state.hostId ||
					reading.processStartId !== state.processStartId ||
					reading.instanceType !== state.instanceType
				) {
					throw new Error('The n8n process changed during capture. Start a new run.');
				}
				const observation: Observation = {
					runId: state.runId,
					sequence: state.observationCount + 1,
					time: Date.now(),
					reading,
					checkpoint,
					gc: Boolean(checkpoint && state.gc),
				};
				await appendFile(join(runDirectory, 'samples.jsonl'), `${JSON.stringify(observation)}\n`);
				state.observationCount++;
				if (checkpoint && options.snapshots) {
					const file = `snapshot-${observation.sequence}.heapsnapshot`;
					const artifact = await client.snapshot(join(runDirectory, file));
					state.snapshots.push({ sequence: observation.sequence, file, ...artifact });
					// Check identity again after the snapshot's blocking capture and download.
					if ((await client.read()).processStartId !== state.processStartId)
						throw new Error('The n8n process changed during snapshot capture.');
				}
				if (checkpoint) {
					await saveManifest();
					log(
						`${checkpoint}: heap ${(reading.memory.heapUsed / 1024 / 1024).toFixed(2)} MiB; RSS ${(reading.memory.rss / 1024 / 1024).toFixed(2)} MiB${observation.gc ? ' (after GC)' : ''}`,
					);
				}
			});
		await record('baseline');
		if (!options.snapshots) {
			sampler = (async () => {
				while (!sampling.signal.aborted) {
					await delay(options.intervalMs, undefined, { signal: sampling.signal });
					if (!sampling.signal.aborted) await record();
				}
			})().catch((error: unknown) => {
				if (sampling.signal.aborted && error instanceof Error && error.name === 'AbortError')
					return;
				samplerError = error;
				controller.abort(error);
			});
		}
		if (command.length) {
			state.workloadExitCode = await runWorkload(command, url, controller.signal, options.cwd);
			if (state.workloadExitCode !== 0)
				throw new Error(`The workload exited with code ${state.workloadExitCode ?? 'signal'}.`);
		} else {
			log('Enter a checkpoint name after an action finishes. Type quit to save the run.');
			const iterator = input[Symbol.asyncIterator]();
			while (true) {
				const next = await nextInput(iterator, controller.signal);
				if (next.done) break;
				controller.signal.throwIfAborted();
				const label = next.value.trim();
				if (label === 'quit') break;
				if (!label || label.length > 100) {
					log('Use a checkpoint name from 1 to 100 characters, or quit.');
					continue;
				}
				await record(label);
			}
		}
		sampling.abort();
		await sampler;
		controller.signal.throwIfAborted();
		await record('final');
		state.status = 'completed';
	} catch (error) {
		if (!manifest || !directory) throw error;
		manifest.status = signal.aborted ? 'interrupted' : 'failed';
		const cause = samplerError ?? error;
		manifest.error = cause instanceof Error ? cause.message : 'Capture failed.';
	} finally {
		sampling.abort();
		controller.abort();
		await sampler;
		signal.removeEventListener('abort', abort);
		if (manifest) {
			manifest.endedAt = Date.now();
			await saveManifest();
		}
	}
	if (!directory || !manifest) throw new Error('No capture was created.');
	log(`Capture ${manifest.status}. Report: pnpm memory report ${directory}`);
	return { directory, manifest };
}
