import { createReadStream } from 'node:fs';
import { readFile, rename, writeFile, access, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SourceMap } from 'node:module';
import { requestReport } from './requests.mjs';

export const SCHEMA_VERSION = 1;
export const MEMORY_METRICS = {
	rss: 'process_resident_memory_bytes',
	heapUsed: 'nodejs_heap_size_used_bytes',
	heapTotal: 'nodejs_heap_size_total_bytes',
	external: 'nodejs_external_memory_bytes',
	pss: 'process_pss_bytes',
};

export async function writeJson(filename, value) {
	const temporary = `${filename}.${randomUUID()}.tmp`;
	try {
		await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
		await rename(temporary, filename);
	} finally {
		await rm(temporary, { force: true });
	}
}

export function artifactPath(directory, filename) {
	const full = resolve(directory, filename);
	const path = relative(directory, full);
	if (path.startsWith('..') || isAbsolute(path))
		throw new Error('Artifact must be inside the session');
	return full;
}

export async function readSession(input) {
	const filename = resolve(input);
	const session = JSON.parse(await readFile(filename, 'utf8'));
	if (session.schemaVersion !== SCHEMA_VERSION || session.kind !== 'n8n-memory-session') {
		throw new Error('Unsupported memory session. Use a version 1 session.json file');
	}
	if (!Array.isArray(session.segments) || !Array.isArray(session.profiles) || !session.settings) {
		throw new Error('Invalid memory session');
	}
	return { session, directory: dirname(filename) };
}

export function parseMemoryMetrics(text) {
	const values = {};
	let processStartedAtMs;
	for (const line of text.split('\n')) {
		// Match unlabelled process gauges. Prometheus timestamps follow the value.
		const match = /^([a-zA-Z_:][\w:]*)\s+([^\s]+)(?:\s+\d+)?\s*$/.exec(line);
		if (!match) continue;
		const value = Number(match[2]);
		if (!Number.isFinite(value) || value < 0) continue;
		for (const [key, name] of Object.entries(MEMORY_METRICS)) {
			if (match[1] === name || match[1].endsWith(`_${name}`)) values[key] = value;
		}
		if (
			match[1] === 'process_start_time_seconds' ||
			match[1].endsWith('_process_start_time_seconds')
		) {
			processStartedAtMs = value * 1000;
		}
	}
	if (!['rss', 'heapUsed', 'heapTotal', 'external'].every((key) => key in values)) {
		throw new Error('Process memory gauges are missing. Enable N8N_METRICS and default metrics');
	}
	return { values, processStartedAtMs };
}

function median(values) {
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function statistics(values) {
	if (!values.count) return null;
	// Use disjoint endpoint windows for short recordings.
	const window = Math.min(5, Math.max(1, Math.floor(values.count / 2)));
	const initial = median(values.initial.slice(0, window));
	const final = median(values.final.slice(-window));
	return {
		count: values.count,
		initialMedian: initial,
		finalMedian: final,
		peak: values.peak,
		change: final - initial,
		changePercent: initial === 0 ? null : ((final - initial) / initial) * 100,
		windowSamples: window,
	};
}

export async function allocationSites(profile, limit = 25) {
	const sites = new Map();
	const maps = new Map();
	const visit = async (node) => {
		const frame = node.callFrame;
		let location = { url: frame.url, line: frame.lineNumber + 1, column: frame.columnNumber + 1 };
		if (frame.url?.startsWith('file:') || (frame.url && isAbsolute(frame.url))) {
			if (!maps.has(frame.url)) {
				try {
					const filename = frame.url.startsWith('file:') ? fileURLToPath(frame.url) : frame.url;
					maps.set(frame.url, {
						map: new SourceMap(JSON.parse(await readFile(`${filename}.map`, 'utf8'))),
						filename,
					});
				} catch {
					maps.set(frame.url, null);
				}
			}
			const sourceMap = maps.get(frame.url);
			const entry = sourceMap?.map.findEntry(frame.lineNumber, frame.columnNumber);
			if (entry?.originalSource) {
				location = {
					url: new URL(entry.originalSource, pathToFileURL(`${sourceMap.filename}.map`)).href,
					line: entry.originalLine + 1,
					column: entry.originalColumn + 1,
				};
			}
		}
		if (node.selfSize > 0) {
			const key = JSON.stringify([frame.functionName, location]);
			const site = sites.get(key) ?? {
				functionName: frame.functionName || '(anonymous)',
				...location,
				bytes: 0,
			};
			site.bytes += node.selfSize;
			sites.set(key, site);
		}
		for (const child of node.children ?? []) await visit(child);
	};
	await visit(profile.head);
	return [...sites.values()].sort((a, b) => b.bytes - a.bytes).slice(0, limit);
}

export async function buildReport(input, { timeline = false, verifyArtifacts = true } = {}) {
	const { session, directory } = await readSession(input);
	const points = [];
	const values = Object.fromEntries(
		Object.keys(MEMORY_METRICS).map((key) => [key, { count: 0, peak: 0, initial: [], final: [] }]),
	);
	const lines = createInterface({
		input: createReadStream(artifactPath(directory, session.timeline)),
		crlfDelay: Infinity,
	});
	let count = 0;
	let invalidRows = 0;
	let firstMeasurementAtMs;
	let lastMeasurementAtMs;
	const missing = [];
	for await (const line of lines) {
		if (!line) continue;
		let point;
		try {
			point = JSON.parse(line);
		} catch {
			invalidRows++;
			continue;
		}
		if (!point?.memory || !Number.isFinite(point.memory.rss)) {
			invalidRows++;
			continue;
		}
		count++;
		if (point.phase === 'measurement') {
			firstMeasurementAtMs ??= point.timestampMs;
			lastMeasurementAtMs = point.timestampMs;
			for (const key of Object.keys(values)) {
				if (Number.isFinite(point.memory[key])) {
					const stats = values[key];
					stats.count++;
					stats.peak = Math.max(stats.peak, point.memory[key]);
					if (stats.initial.length < 5) stats.initial.push(point.memory[key]);
					stats.final.push(point.memory[key]);
					if (stats.final.length > 5) stats.final.shift();
				}
			}
		}
		if (verifyArtifacts && point.raw) {
			try {
				await access(artifactPath(directory, point.raw));
			} catch {
				if (missing.length < 10) missing.push(point.raw);
			}
		}
		if (timeline) points.push(point);
	}
	const issues = [];
	if (invalidRows) issues.push(`Invalid timeline rows: ${invalidRows}`);
	if (verifyArtifacts) {
		for (const profile of session.profiles) {
			for (const file of [profile.file, profile.locationsFile].filter(Boolean)) {
				try {
					await access(artifactPath(directory, file));
				} catch {
					if (missing.length < 10) missing.push(file);
				}
			}
		}
	}
	if (missing.length) issues.push(`Missing artifacts: ${missing.join(', ')}`);
	if (session.status !== 'complete') issues.push(`Session is ${session.status}`);
	if (values.rss.count < 2) issues.push('Fewer than two measurement samples');
	if (['heapUsed', 'heapTotal', 'external'].some((key) => values[key].count !== values.rss.count))
		issues.push('Required memory samples are missing');
	if (session.gaps.length) issues.push('Capture has gaps');
	if (session.pauses?.length) issues.push('Capture includes recording pauses');
	if (session.captureChanges?.length) issues.push('Capture settings changed during recording');
	if (session.recordingIntervals?.length > 1)
		issues.push('Capture spans multiple recording intervals');
	if (session.segments.length !== 1) issues.push('Capture spans multiple process segments');
	if (!session.metadata.node) issues.push('Backend runtime is not verified');
	if (
		(session.settings.capture?.allocations ?? !session.settings.metricsOnly) &&
		!session.profiles.length
	)
		issues.push('Allocation profiles are missing');
	let requests;
	try {
		requests = await requestReport(
			session.requests ? artifactPath(directory, session.requests) : undefined,
			Boolean(session.settings.requestTracking),
		);
		if (requests.invalidEvents) issues.push(`Invalid request events: ${requests.invalidEvents}`);
	} catch {
		issues.push('Request data is unavailable');
		requests = await requestReport(undefined, false);
	}
	const lastProfile = session.profiles.at(-1);
	let sites = lastProfile?.allocationSites ?? [];
	if (lastProfile?.locationsFile) {
		try {
			sites = JSON.parse(
				await readFile(artifactPath(directory, lastProfile.locationsFile), 'utf8'),
			);
		} catch {
			issues.push('Allocation locations are unavailable');
		}
	}
	const intervalDurationMs = session.recordingIntervals?.length
		? session.recordingIntervals.reduce(
				(total, interval) =>
					total +
					Math.max(
						0,
						interval.endElapsedMs !== null && Number.isFinite(interval.endElapsedMs)
							? interval.endElapsedMs - interval.startElapsedMs
							: (interval.endedAtMs ?? session.endedAtMs ?? Date.now()) - interval.startedAtMs,
					),
				0,
			)
		: null;
	const measurementDurationMs =
		intervalDurationMs ??
		session.measurementDurationMs ??
		(session.measurementStartedAtMs && session.measurementEndedAtMs
			? session.measurementEndedAtMs - session.measurementStartedAtMs
			: firstMeasurementAtMs && lastMeasurementAtMs
				? lastMeasurementAtMs - firstMeasurementAtMs
				: null);
	const report = {
		schemaVersion: SCHEMA_VERSION,
		kind: 'n8n-memory-report',
		units: { memory: 'bytes', timestamp: 'unix-milliseconds', elapsed: 'milliseconds' },
		session,
		artifacts: { manifest: resolve(input), directory },
		sampleCount: count,
		measurementSampleCount: values.rss.count,
		measurementDurationMs,
		activeCaptureDurationMs: measurementDurationMs,
		memory: Object.fromEntries(
			Object.entries(values).map(([key, samples]) => [key, statistics(samples)]),
		),
		allocationSites: sites,
		requests,
		comparison: { eligible: issues.length === 0, issues },
		...(timeline ? { timeline: points } : {}),
	};
	return report;
}

export function compareReports(before, after) {
	const issues = [
		...before.comparison.issues.map((issue) => `Before: ${issue}`),
		...after.comparison.issues.map((issue) => `After: ${issue}`),
	];
	if (
		before.measurementDurationMs !== null &&
		after.measurementDurationMs !== null &&
		Math.abs(before.measurementDurationMs - after.measurementDurationMs) >
			Math.max(before.session.settings.intervalMs, after.session.settings.intervalMs) * 2
	)
		issues.push('Different measured durations');
	if (before.session.snapshots.length !== after.session.snapshots.length)
		issues.push('Different snapshot diagnostics');
	for (const key of ['hostname', 'platform', 'arch', 'node', 'role', 'launchMode']) {
		if (before.session.metadata[key] !== after.session.metadata[key])
			issues.push(`Different ${key}`);
	}
	for (const key of [
		'durationMs',
		'warmupMs',
		'intervalMs',
		'profileIntervalMs',
		'samplingIntervalBytes',
		'allocationMode',
		'metricsOnly',
		'workload',
		'frontend',
		'requestTracking',
	]) {
		if (before.session.settings[key] !== after.session.settings[key])
			issues.push(`Different ${key}`);
	}
	if (!before.session.settings.workload || !after.session.settings.workload)
		issues.push('Specify --workload for both recordings');
	for (const key of ['metrics', 'requests', 'allocations']) {
		const enabled = (session) =>
			session.settings.capture?.[key] ??
			(key === 'metrics' ||
				(key === 'requests'
					? Boolean(session.settings.requestTracking)
					: !session.settings.metricsOnly));
		if (enabled(before.session) !== enabled(after.session)) issues.push(`Different ${key} capture`);
	}
	if (
		JSON.stringify(before.session.metadata.configuration) !==
		JSON.stringify(after.session.metadata.configuration)
	)
		issues.push('Different backend configuration');
	const memory = {};
	for (const key of Object.keys(MEMORY_METRICS)) {
		const left = before.memory[key];
		const right = after.memory[key];
		if (!left || !right) continue;
		memory[key] = {};
		for (const stat of ['initialMedian', 'finalMedian', 'peak', 'change']) {
			memory[key][stat] = {
				before: left[stat],
				after: right[stat],
				delta: right[stat] - left[stat],
				deltaPercent:
					left[stat] === 0 ? null : ((right[stat] - left[stat]) / Math.abs(left[stat])) * 100,
			};
		}
	}
	return {
		schemaVersion: SCHEMA_VERSION,
		kind: 'n8n-memory-comparison',
		units: { memory: 'bytes' },
		comparable: issues.length === 0,
		issues,
		memory,
	};
}

export function markdownReport(report) {
	const rows = Object.entries(report.memory)
		.filter(([, value]) => value)
		.map(
			([key, value]) =>
				`| ${key} | ${value.initialMedian} | ${value.peak} | ${value.finalMedian} | ${value.change} |`,
		);
	return `# Backend memory recording\n\nStatus: ${report.session.status}\n\nActive capture: ${report.activeCaptureDurationMs ?? 'unknown'} ms.\n\nAll memory values use bytes.\n\n| Metric | Initial median | Peak | Final median | Change |\n| --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\nComparison limits: ${report.comparison.issues.join('; ') || 'No capture issues detected. Repeat the same workload to assess variation.'}\n`;
}
