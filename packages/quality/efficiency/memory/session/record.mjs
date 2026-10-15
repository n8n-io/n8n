import { appendFile, mkdir, open, readFile, writeFile } from 'node:fs/promises';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { hostname, platform, arch } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { StringDecoder } from 'node:string_decoder';

import { InspectorClient } from './inspector.mjs';
import { RequestHistory, requestLimit } from './requests.mjs';
import {
	allocationSites,
	buildReport,
	markdownReport,
	parseMemoryMetrics,
	SCHEMA_VERSION,
	writeJson,
} from './report.mjs';
import { openViewer, serveViewer } from './viewer.mjs';

const exec = promisify(execFile);
export const repositoryRoot = fileURLToPath(new URL('../../../../..', import.meta.url));
const cliDirectory = join(repositoryRoot, 'packages/cli');
const configurationKeys = [
	'DB_TYPE',
	'EXECUTIONS_MODE',
	'N8N_RUNNERS_MODE',
	'N8N_RUNNERS_ENABLED',
	'N8N_DEFAULT_BINARY_DATA_MODE',
];
const identityExpression = `({pid:process.pid,entry:process.argv[1],startedAtMs:Date.now()-process.uptime()*1000,node:process.version,platform:process.platform,arch:process.arch,hostname:process.getBuiltinModule('node:os').hostname(),role:process.argv[2]||'main',requestTracking:globalThis[Symbol.for('n8n.memory-profiler.requests')]===true,requestDetails:globalThis[Symbol.for('n8n.memory-profiler.capture')] instanceof Map,configuration:{...Object.fromEntries(${JSON.stringify(configurationKeys)}.filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]])),heapLimitBytes:process.getBuiltinModule('node:v8').getHeapStatistics().heap_size_limit}})`;

async function git(...args) {
	try {
		return (await exec('git', args, { cwd: repositoryRoot, timeout: 3000 })).stdout.trim();
	} catch {
		return null;
	}
}

async function freePort(requestedPort = 0) {
	const server = createServer();
	server.listen(requestedPort, '127.0.0.1');
	await once(server, 'listening');
	const port = server.address().port;
	await new Promise((done) => server.close(done));
	return port;
}

export async function stopOwnedProcess(child) {
	if (!child?.pid) return;
	if (process.platform === 'win32') {
		await exec('taskkill', ['/pid', String(child.pid), '/T', '/F']).catch((error) => {
			if (child.exitCode === null && child.signalCode === null) throw error;
		});
		return;
	}
	const groupHasLiveProcesses = async () => {
		const { stdout } = await exec('ps', ['-axo', 'pgid=,stat='], { timeout: 1000 });
		return stdout.split('\n').some((line) => {
			const [group, state] = line.trim().split(/\s+/);
			return group === String(child.pid) && state && !state.startsWith('Z');
		});
	};
	const signal = async (name) => {
		try {
			process.kill(-child.pid, name);
		} catch (error) {
			if (error.code === 'ESRCH') return;
			// macOS can reject signals to a group that contains only exited processes.
			if (error.code === 'EPERM' && !(await groupHasLiveProcesses())) return;
			throw error;
		}
	};
	await signal('SIGTERM');
	// A launcher can exit before its server. Wait for the owned process group.
	const deadline = Date.now() + 5000;
	while (Date.now() < deadline) {
		try {
			process.kill(-child.pid, 0);
		} catch (error) {
			if (error.code === 'ESRCH') return;
			if (error.code !== 'EPERM') throw error;
			if (!(await groupHasLiveProcesses())) return;
		}
		await delay(50);
	}
	await signal('SIGKILL');
}

export async function record(options) {
	const capture = {
		metrics: true,
		requests: !options.metricsOnly,
		allocations: !options.metricsOnly && Boolean(options.allocations),
		intervalMs: options.intervalMs,
		requestLimit: requestLimit(options.requestLimit),
		requestDetails: Boolean(options.requestDetails),
		responseDetails: Boolean(options.responseDetails),
	};
	const directory = resolve(options.output);
	await mkdir(dirname(directory), { recursive: true, mode: 0o700 });
	await mkdir(directory, { mode: 0o700 });
	const manifest = join(directory, 'session.json');
	for (const folder of ['raw', 'profiles', 'snapshots'])
		await mkdir(join(directory, folder), { mode: 0o700 });
	await writeFile(join(directory, 'timeline.ndjson'), '', { mode: 0o600 });
	const startedAtMs = Date.now();
	const startedClock = performance.now();
	const session = {
		schemaVersion: SCHEMA_VERSION,
		kind: 'n8n-memory-session',
		status: 'starting',
		startedAtMs,
		measurementStartedAtMs: null,
		measurementEndedAtMs: null,
		measurementDurationMs: null,
		endedAtMs: null,
		timeline: 'timeline.ndjson',
		requests: 'requests.ndjson',
		requestCounts: 'request-counts.json',
		settings: {
			durationMs: options.durationMs,
			warmupMs: options.warmupMs,
			intervalMs: options.intervalMs,
			profileIntervalMs: options.profileIntervalMs,
			samplingIntervalBytes: options.samplingIntervalBytes,
			allocationMode: options.churn ? 'churn' : 'live',
			metricsOnly: options.metricsOnly,
			workload: options.workload ?? null,
			frontend: Boolean(options.frontend),
			requestTracking: false,
			capture: { ...capture },
		},
		metadata: {
			commit: await git('rev-parse', 'HEAD'),
			branch: await git('branch', '--show-current'),
			dirty: Boolean(await git('status', '--porcelain')),
			node: null,
			hostname: hostname(),
			platform: platform(),
			arch: arch(),
			role: 'main',
			launchMode: options.url ? 'attach' : options.dev ? 'dev' : 'built',
			configuration: {},
			coverage:
				'One backend process and its V8 isolate. Frontend dev server, compiler, viewer, workers, and task runners are excluded.',
		},
		segments: [],
		recordingIntervals: [],
		pauses: [],
		captureChanges: [],
		profiles: [],
		snapshots: [],
		markers: [],
		gaps: [],
		errors: [],
	};
	const status = {
		schemaVersion: SCHEMA_VERSION,
		session: manifest,
		phase: 'starting',
		ready: false,
		recording: false,
		recordingId: null,
		backendUrl: options.url ?? null,
		editorUrl: null,
		viewerUrl: null,
		pid: null,
		capabilities: { metrics: false, allocations: false, snapshots: false, requests: false },
		capture,
	};
	let child;
	let childError;
	let log;
	let frontend;
	let frontendError;
	let frontendLog;
	let viewer;
	let client;
	let segment;
	let sampling = false;
	let stopped = false;
	let interrupted = false;
	let finalized = false;
	let queue = Promise.resolve();
	let sampleCount = 0;
	let measurementSampleCount = 0;
	let lastProfileAtMs = 0;
	let endpoints = [];
	let currentEndpoint = options.inspector;
	let measurementStartedAtMs;
	let recordingInterval;
	let recordingClock;
	let activeCaptureDurationMs = 0;
	let requestTracking = false;
	let backendUrl;
	let healthUrl;
	let metricsUrl;
	let startupDeadline;
	let requestHistory;
	let writtenRequestCount = -1;
	const requestLeaseMs = () => Math.max(180_000, capture.intervalMs * 3);
	const controller = new AbortController();
	const stop = () => {
		stopped = true;
		controller.abort();
	};
	const interrupt = () => {
		interrupted = true;
		stop();
	};
	process.on('SIGINT', interrupt);
	process.on('SIGTERM', interrupt);
	const serialize = async (action) => {
		const result = queue.then(action);
		queue = result.catch(() => {});
		return await result;
	};
	const persist = async () => {
		await requestHistory?.flush();
		if (requestHistory && requestHistory.counts.completed !== writtenRequestCount) {
			const counts = requestHistory.counts.snapshot();
			await writeJson(join(directory, session.requestCounts), counts);
			writtenRequestCount = counts.completed;
		}
		await writeJson(manifest, session);
		await writeJson(join(directory, 'status.json'), status);
	};
	const event = () => ({ timestampMs: Date.now(), elapsedMs: performance.now() - startedClock });
	const mark = async ({ label }) => {
		if (finalized || stopped) throw new Error('Recording has stopped');
		if (typeof label !== 'string' || !label.trim() || label.length > 500)
			throw new Error('Supply a marker with 1 to 500 characters');
		const marker = { ...event(), label: label.trim() };
		session.markers.push(marker);
		await persist();
		return marker;
	};
	const captureDuration = () =>
		activeCaptureDurationMs +
		(recordingClock === undefined ? 0 : performance.now() - recordingClock);
	const closeInterval = () => {
		if (!recordingInterval) return;
		const { timestampMs, elapsedMs } = event();
		recordingInterval.endedAtMs = timestampMs;
		recordingInterval.endElapsedMs = elapsedMs;
		activeCaptureDurationMs = captureDuration();
		session.measurementDurationMs = activeCaptureDurationMs;
		recordingClock = undefined;
		recordingInterval = undefined;
		status.recording = false;
		status.recordingId = null;
	};
	const closePause = () => {
		const pause = session.pauses.at(-1);
		if (!pause || pause.endedAtMs !== null) return;
		const { timestampMs, elapsedMs } = event();
		pause.endedAtMs = timestampMs;
		pause.endElapsedMs = elapsedMs;
		pause.durationMs = elapsedMs - pause.startElapsedMs;
	};
	const checkpoint = async (finish = false) => {
		if (!client || !sampling) return;
		const timestamp = event();
		const { profile } = await client.request(
			finish ? 'HeapProfiler.stopSampling' : 'HeapProfiler.getSamplingProfile',
		);
		if (finish) sampling = false;
		const file = `profiles/${String(session.profiles.length + 1).padStart(6, '0')}.heapprofile`;
		const locationsFile = file.replace('.heapprofile', '.locations.json');
		await writeJson(join(directory, file), profile);
		await writeJson(join(directory, locationsFile), await allocationSites(profile));
		session.profiles.push({
			...timestamp,
			segmentId: segment.id,
			recordingId: recordingInterval?.id ?? null,
			file,
			locationsFile,
		});
		lastProfileAtMs = performance.now();
		await persist();
	};
	const startSampling = async () => {
		if (!client || sampling || !capture.allocations) return;
		await client.request('HeapProfiler.startSampling', {
			samplingInterval: options.samplingIntervalBytes,
			includeObjectsCollectedByMajorGC: options.churn,
			includeObjectsCollectedByMinorGC: options.churn,
		});
		sampling = true;
		lastProfileAtMs = performance.now();
	};
	const disconnect = () => {
		client?.close();
		client = undefined;
		sampling = false;
		status.capabilities.allocations = false;
		status.capabilities.snapshots = false;
		status.capabilities.requests = false;
		status.capabilities.requestDetails = false;
		status.capabilities.responseDetails = false;
	};
	const connect = async (endpoint) => {
		const candidate = await InspectorClient.connect(endpoint, options.requestTimeoutMs);
		let identity;
		try {
			identity = await candidate.evaluate(identityExpression);
		} catch (error) {
			candidate.close();
			throw error;
		}
		if (!options.url && resolve(identity.entry) !== join(cliDirectory, 'bin/n8n')) {
			candidate.close();
			throw new Error('Waiting for the n8n server Inspector endpoint');
		}
		await client?.stopRequests();
		disconnect();
		client = candidate;
		const previous = session.segments.at(-1);
		if (
			!previous ||
			previous.pid !== identity.pid ||
			Math.abs(previous.startedAtMs - identity.startedAtMs) > 1000
		) {
			if (previous) previous.endedAtMs = Date.now();
			segment = {
				id: `process-${session.segments.length + 1}`,
				pid: identity.pid,
				startedAtMs: identity.startedAtMs,
				observedAtMs: Date.now(),
				endedAtMs: null,
			};
			session.segments.push(segment);
		} else segment = previous;
		Object.assign(session.metadata, {
			node: identity.node,
			platform: identity.platform,
			arch: identity.arch,
			hostname: identity.hostname,
			role: identity.role,
			configuration: identity.configuration,
		});
		status.pid = identity.pid;
		status.capabilities.allocations = true;
		status.capabilities.snapshots = true;
		requestTracking = Boolean(identity.requestTracking);
		status.capabilities.requests = requestTracking;
		status.capabilities.requestDetails = Boolean(identity.requestDetails);
		status.capabilities.responseDetails = Boolean(identity.requestDetails);
		if (requestTracking) session.settings.requestTracking = true;
		if (status.recording) {
			await startSampling();
			await startRequests();
		}
	};
	const startRequests = async () => {
		if (!capture.requests || !requestTracking || !client || !recordingInterval) return;
		const interval = recordingInterval;
		const processSegment = segment;
		await client.trackRequests(
			(request) => {
				if (
					stopped ||
					!status.recording ||
					recordingInterval !== interval ||
					segment !== processSegment ||
					request.startedAtMs < interval.startedAtMs
				)
					return;
				requestHistory.add({
					...request,
					segmentId: processSegment.id,
					recordingId: interval.id,
					phase: 'measurement',
					elapsedMs: request.startedAtMs - startedAtMs,
				});
			},
			requestLeaseMs(),
			{ requestDetails: capture.requestDetails, responseDetails: capture.responseDetails },
		);
	};
	const startCapture = async () => {
		const { timestampMs, elapsedMs } = event();
		recordingInterval = {
			id: `recording-${session.recordingIntervals.length + 1}`,
			startedAtMs: timestampMs,
			endedAtMs: null,
			startElapsedMs: elapsedMs,
			endElapsedMs: null,
			capture: { ...capture },
		};
		session.recordingIntervals.push(recordingInterval);
		recordingClock = performance.now();
		status.recording = true;
		status.recordingId = recordingInterval.id;
		try {
			await startSampling();
			await startRequests();
		} catch (error) {
			await client?.stopRequests().catch(() => {});
			if (sampling) await checkpoint(true).catch(() => {});
			closeInterval();
			throw error;
		}
		closePause();
		status.phase = 'measurement';
		status.ready = true;
	};
	const requestText = async (url) => {
		const response = await fetch(url, {
			signal: AbortSignal.any([controller.signal, AbortSignal.timeout(options.requestTimeoutMs)]),
			redirect: 'error',
		});
		if (!response.ok) throw new Error(`${url.pathname} returned ${response.status}`);
		return await response.text();
	};
	const pauseCapture = async () => {
		if (finalized || stopped) throw new Error('Recording has stopped');
		if (!measurementStartedAtMs) throw new Error('Wait for recording readiness');
		if (status.recording) {
			try {
				await client?.stopRequests();
				if (sampling && !client?.closed) await checkpoint(true);
			} catch (error) {
				disconnect();
				throw error;
			} finally {
				// Close the connection if sampling could not stop.
				if (sampling) disconnect();
				closeInterval();
				const { timestampMs, elapsedMs } = event();
				session.pauses.push({
					startedAtMs: timestampMs,
					endedAtMs: null,
					startElapsedMs: elapsedMs,
					endElapsedMs: null,
					durationMs: null,
				});
				status.phase = 'paused';
				await persist();
			}
		}
		return { accepted: true, recording: false, recordingId: null };
	};
	const controls = {
		mark: async (body) => await serialize(async () => await mark(body)),
		pause: async () => await serialize(pauseCapture),
		configure: async (body) =>
			await serialize(async () => {
				if (finalized || stopped) throw new Error('Recording has stopped');
				if (!status.ready) throw new Error('Wait for recording readiness');
				if (!body || typeof body !== 'object' || Array.isArray(body))
					throw new Error('Supply capture settings');
				for (const [key, value] of Object.entries(body)) {
					if (key === 'intervalMs') {
						if (!Number.isInteger(value) || value < 50 || value > 60_000)
							throw new Error('Use a metric interval from 50 to 60000 milliseconds');
					} else if (key === 'requestLimit') {
						requestLimit(value);
					} else if (
						!['metrics', 'requests', 'allocations', 'requestDetails', 'responseDetails'].includes(
							key,
						)
					) {
						throw new Error('Unknown capture setting');
					} else {
						if (typeof value !== 'boolean') throw new Error('Capture settings must be boolean');
						if (value && !status.capabilities[key])
							throw new Error(
								`Capture is unavailable: ${key}. Start a new session with Inspector enabled`,
							);
					}
				}
				if (!Object.entries(body).some(([key, value]) => capture[key] !== value))
					return { capture: { ...capture } };
				const recording = status.recording;
				if (recording) await pauseCapture();
				Object.assign(capture, body);
				requestHistory.setLimit(capture.requestLimit);
				session.captureChanges.push({ ...event(), capture: { ...capture } });
				if (recording) await startCapture();
				await persist();
				return { capture: { ...capture } };
			}),
		resume: async () =>
			await serialize(async () => {
				if (finalized || stopped) throw new Error('Recording has stopped');
				if (!measurementStartedAtMs) throw new Error('Wait for recording readiness');
				if (!status.recording) {
					await requestText(healthUrl);
					if (!options.metricsOnly && (!client || client.closed)) {
						currentEndpoint = endpoints.shift() ?? currentEndpoint;
						await connect(currentEndpoint);
					}
					await startCapture();
					await persist();
				}
				return { accepted: true, recording: true, recordingId: recordingInterval.id };
			}),
		stop: async () => {
			stop();
			return { accepted: true };
		},
		snapshot: async () =>
			await serialize(async () => {
				if (!client || finalized || stopped) throw new Error('No active Inspector connection');
				const file = `snapshots/${String(session.snapshots.length + 1).padStart(6, '0')}.heapsnapshot`;
				const snapshot = {
					...event(),
					segmentId: segment.id,
					recordingId: recordingInterval?.id ?? null,
					file,
				};
				session.markers.push({
					...event(),
					label: 'Heap snapshot started. The capture pauses the backend.',
				});
				await persist();
				await client.snapshot(join(directory, file));
				snapshot.endedAtMs = Date.now();
				session.snapshots.push(snapshot);
				session.markers.push({
					...event(),
					label: 'Heap snapshot completed. The capture paused the backend.',
				});
				await persist();
				return snapshot;
			}),
	};
	try {
		requestHistory = new RequestHistory(join(directory, session.requests), capture.requestLimit);
		await persist();
		viewer = await serveViewer({ input: manifest, controls, getStatus: () => status });
		status.viewerUrl = viewer.url;
		await persist();
		process.stderr.write(`Memory session: ${manifest}\nViewer: ${viewer.url}\n`);
		if (options.open) openViewer(viewer.url);
		if (!options.url) {
			const port = await freePort(options.port ?? Number(process.env.N8N_PORT || 0));
			backendUrl = `http://localhost:${port}`;
			status.backendUrl = backendUrl;
			if (options.frontend) {
				const editorPort = await freePort(
					options.editorPort ?? Number(process.env.N8N_EDITOR_PORT || 0),
				);
				if (editorPort === port) throw new Error('Use different backend and editor ports');
				status.editorUrl = `http://localhost:${editorPort}`;
				frontendLog = await open(join(directory, 'frontend.log'), 'a', 0o600);
				frontend = spawn(
					process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
					['--silent', 'run', 'serve', '--host', '127.0.0.1'],
					{
						cwd: join(repositoryRoot, 'packages/frontend/editor-ui'),
						detached: process.platform !== 'win32',
						stdio: ['ignore', frontendLog.fd, frontendLog.fd],
						env: { ...process.env, N8N_PORT: String(port), N8N_EDITOR_PORT: String(editorPort) },
					},
				);
				frontend.on('error', (error) => {
					frontendError = error;
				});
				status.frontendPid = frontend.pid;
				process.stderr.write(`Editor: ${status.editorUrl}\n`);
			}
			await persist();
			log = await open(join(directory, 'backend.log'), 'a', 0o600);
			const nodeArgs = options.metricsOnly ? [] : ['--inspect=127.0.0.1:0', '--enable-source-maps'];
			let args = [...nodeArgs, join(cliDirectory, 'bin/n8n')];
			let command = process.execPath;
			if (options.dev) {
				const config = join(directory, 'nodemon.json');
				await writeJson(config, {
					watch: [join(cliDirectory, 'dist')],
					ext: 'js',
					delay: 1000,
					exec: [process.execPath, ...nodeArgs],
				});
				command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
				args = ['exec', 'nodemon', '--config', config, join(cliDirectory, 'bin/n8n')];
			}
			child = spawn(command, args, {
				cwd: cliDirectory,
				detached: process.platform !== 'win32',
				stdio: ['ignore', log.fd, 'pipe'],
				env: {
					...process.env,
					N8N_PORT: String(port),
					N8N_METRICS: 'true',
					N8N_METRICS_INCLUDE_DEFAULT_METRICS: 'true',
					N8N_MEMORY_PROFILING: 'true',
					...(status.editorUrl ? { N8N_EDITOR_BASE_URL: status.editorUrl } : {}),
					N8N_RUNNERS_BROKER_PORT: process.env.N8N_RUNNERS_BROKER_PORT || String(await freePort()),
				},
			});
			child.on('error', (error) => {
				childError = error;
			});
			const decoder = new StringDecoder('utf8');
			let remainder = '';
			child.stderr.on('data', (chunk) => {
				// Keep server logs off stdout in agent mode.
				log.write(chunk).catch(() => {});
				remainder += decoder.write(chunk);
				const lines = remainder.split('\n');
				remainder = lines.pop().slice(-4096);
				for (const line of lines) {
					const match = /^Debugger listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/.exec(line);
					if (match) endpoints = [...endpoints.slice(-19), match[1]];
				}
			});
		} else backendUrl = options.url;
		process.stderr.write(`Backend: ${backendUrl}\n`);
		healthUrl = new URL('/healthz', backendUrl);
		metricsUrl = new URL('/metrics', backendUrl);
		startupDeadline = performance.now() + options.startupTimeoutMs;
		let lastError;
		while (!stopped) {
			if (childError) throw new Error(childError.message);
			if (frontendError) throw new Error(frontendError.message);
			if (frontend && (frontend.exitCode !== null || frontend.signalCode !== null))
				throw new Error(`Frontend exited. Read ${join(directory, 'frontend.log')}`);
			if (child && (child.exitCode !== null || child.signalCode !== null))
				throw new Error(`Backend exited. Read ${join(directory, 'backend.log')}`);
			try {
				await requestText(healthUrl);
				parseMemoryMetrics(await requestText(metricsUrl));
				if (status.editorUrl) await requestText(new URL('/', status.editorUrl));
				if (!options.metricsOnly) {
					currentEndpoint = endpoints.shift() ?? currentEndpoint;
					if (!currentEndpoint) throw new Error('Waiting for the backend Inspector endpoint');
					await connect(currentEndpoint);
				}
				break;
			} catch (error) {
				lastError = error;
				status.lastError = error.message;
				await persist();
				if (performance.now() >= startupDeadline)
					throw new Error(
						`${options.frontend ? 'Backend or frontend' : 'Backend'} readiness timed out: ${lastError.message}`,
					);
				await delay(200, undefined, { signal: controller.signal }).catch(() => {});
			}
		}
		if (!stopped) {
			delete status.lastError;
			status.phase = 'warmup';
			session.status = 'recording';
			status.capabilities.metrics = true;
			await persist();
		}
		const warmupEnd = performance.now() + options.warmupMs;
		while (!stopped) {
			const iterationAtMs = performance.now();
			if (childError) throw new Error(childError.message);
			if (frontendError) throw new Error(frontendError.message);
			if (frontend && (frontend.exitCode !== null || frontend.signalCode !== null))
				throw new Error(
					`Frontend exited during recording. Read ${join(directory, 'frontend.log')}`,
				);
			if (child && (child.exitCode !== null || child.signalCode !== null))
				throw new Error('Backend exited during recording');
			if (!measurementStartedAtMs && iterationAtMs >= warmupEnd) {
				measurementStartedAtMs = Date.now();
				session.measurementStartedAtMs = measurementStartedAtMs;
				await serialize(startCapture);
				await persist();
			}
			try {
				await serialize(async () => {
					if (!options.metricsOnly && (!client || client.closed)) {
						currentEndpoint = endpoints.shift() ?? currentEndpoint;
						status.ready = false;
						await connect(currentEndpoint);
					}
					if (status.phase === 'paused') {
						await requestText(healthUrl);
						status.ready = true;
						await persist();
						return;
					}
					if (stopped) return;
					await client?.refreshRequests(requestLeaseMs());
					if (capture.metrics) {
						const raw = await requestText(metricsUrl);
						const metrics = parseMemoryMetrics(raw);
						if (options.metricsOnly) {
							if (!metrics.processStartedAtMs)
								throw new Error('Metrics-only capture requires process_start_time_seconds');
							if (!segment || segment.startedAtMs !== metrics.processStartedAtMs) {
								if (segment) segment.endedAtMs = Date.now();
								segment = {
									id: `process-${session.segments.length + 1}`,
									pid: null,
									startedAtMs: metrics.processStartedAtMs,
									observedAtMs: Date.now(),
									endedAtMs: null,
								};
								session.segments.push(segment);
							}
						} else if (
							metrics.processStartedAtMs &&
							Math.abs(metrics.processStartedAtMs - segment.startedAtMs) > 2000
						) {
							throw new Error('Metrics and Inspector refer to different processes');
						}
						const file = `raw/${String(++sampleCount).padStart(6, '0')}.prom`;
						await writeFile(join(directory, file), raw, { mode: 0o600 });
						const sample = {
							...event(),
							phase: measurementStartedAtMs ? 'measurement' : 'warmup',
							segmentId: segment.id,
							recordingId: recordingInterval?.id ?? null,
							intervalMs: capture.intervalMs,
							raw: file,
							memory: metrics.values,
						};
						await appendFile(join(directory, session.timeline), `${JSON.stringify(sample)}\n`);
						if (sample.phase === 'measurement') measurementSampleCount++;
						status.lastSampleAtMs = sample.timestampMs;
					} else await requestText(healthUrl);
					if (
						measurementStartedAtMs &&
						performance.now() - lastProfileAtMs >= options.profileIntervalMs
					)
						await checkpoint();
					status.ready = Boolean(measurementStartedAtMs);
					await persist();
				});
			} catch (error) {
				if (!stopped) {
					status.ready = false;
					session.gaps.push({ ...event(), message: error.message });
					if (client?.closed) disconnect();
					await persist();
				}
			}
			if (
				measurementStartedAtMs &&
				options.durationMs !== null &&
				captureDuration() >= options.durationMs
			)
				break;
			await delay(
				Math.max(1, capture.intervalMs - (performance.now() - iterationAtMs)),
				undefined,
				{
					signal: controller.signal,
				},
			).catch(() => {});
		}
		session.status = interrupted
			? 'interrupted'
			: session.gaps.length || measurementSampleCount < 2
				? 'partial'
				: measurementStartedAtMs
					? 'complete'
					: 'interrupted';
	} catch (error) {
		session.status = 'failed';
		session.errors.push({ ...event(), message: error.message });
	} finally {
		finalized = true;
		status.phase = 'stopping';
		status.ready = false;
		await queue;
		try {
			await client?.stopRequests();
			if (sampling && !client?.closed) await checkpoint(true);
		} catch (error) {
			session.errors.push({ ...event(), message: error.message });
			if (session.status === 'complete') session.status = 'partial';
		}
		closeInterval();
		closePause();
		if (measurementStartedAtMs) session.measurementEndedAtMs = Date.now();
		disconnect();
		const cleanup = await Promise.allSettled([stopOwnedProcess(child), stopOwnedProcess(frontend)]);
		for (const result of cleanup) {
			if (result.status === 'rejected') {
				session.errors.push({ ...event(), message: result.reason.message });
				session.status = 'failed';
			}
		}
		await log?.close();
		await frontendLog?.close();
		session.endedAtMs = Date.now();
		if (segment) segment.endedAtMs = session.endedAtMs;
		status.phase = session.status;
		status.capabilities = { metrics: false, allocations: false, snapshots: false, requests: false };
		try {
			await persist();
		} finally {
			process.off('SIGINT', interrupt);
			process.off('SIGTERM', interrupt);
			if (viewer && options.open && options.durationMs === null && !interrupted) {
				process.stderr.write(`Viewer: ${viewer.url}\nPress Ctrl+C to close the viewer.\n`);
				const close = async () => {
					process.off('SIGINT', close);
					process.off('SIGTERM', close);
					await viewer.close();
				};
				process.on('SIGINT', close);
				process.on('SIGTERM', close);
			} else await viewer?.close();
		}
	}
	const report = await buildReport(manifest);
	await writeJson(join(directory, 'summary.json'), report);
	await writeFile(join(directory, 'summary.md'), markdownReport(report), { mode: 0o600 });
	return report;
}

export async function controlSession(input, command, body = {}) {
	const filename = resolve(input);
	const status = JSON.parse(
		await readFile(
			join(filename.endsWith('session.json') ? resolve(filename, '..') : filename, 'status.json'),
			'utf8',
		),
	);
	if (command === 'status') return status;
	if (!['starting', 'warmup', 'measurement', 'paused'].includes(status.phase))
		throw new Error(`Session is ${status.phase}`);
	const response = await fetch(new URL(`api/${command}`, status.viewerUrl), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(command === 'snapshot' ? 125_000 : 10_000),
	});
	const result = await response.json();
	if (!response.ok) throw new Error(result.error);
	return result;
}
