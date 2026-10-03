import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { manifestSchema, memoryKeys, observationSchema, type Observation } from './schema.js';

export async function createReport(directory: string) {
	const manifest = manifestSchema.parse(
		JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8')),
	);
	if (manifest.status === 'recording' || manifest.endedAt === undefined)
		throw new Error('The run is still recording or has no completion record.');
	const lines = (await readFile(join(directory, 'samples.jsonl'), 'utf8')).trim();
	const observations = lines
		? lines.split('\n').map((line) => observationSchema.parse(JSON.parse(line)))
		: [];
	if (observations.length !== manifest.observationCount)
		throw new Error('The observation count does not match the manifest.');
	let previous = manifest.startedAt;
	for (const [index, observation] of observations.entries()) {
		if (
			observation.runId !== manifest.runId ||
			observation.sequence !== index + 1 ||
			observation.reading.hostId !== manifest.hostId ||
			observation.reading.processStartId !== manifest.processStartId ||
			observation.reading.instanceType !== manifest.instanceType ||
			observation.time < previous ||
			observation.time > manifest.endedAt
		) {
			throw new Error(
				'The run contains mixed identities, out-of-order records, or records outside its time window.',
			);
		}
		previous = observation.time;
	}
	const checkpoints = observations.filter((observation) => observation.checkpoint !== undefined);
	if (
		manifest.status === 'completed' &&
		(checkpoints[0]?.checkpoint !== 'baseline' || checkpoints.at(-1)?.checkpoint !== 'final')
	) {
		throw new Error('A completed run must contain baseline and final checkpoints.');
	}
	const snapshotSequences = new Set<number>();
	const snapshotFiles = new Set<string>();
	for (const snapshot of manifest.snapshots) {
		if (snapshotSequences.has(snapshot.sequence) || snapshotFiles.has(snapshot.file))
			throw new Error('The run contains duplicate snapshot records.');
		snapshotSequences.add(snapshot.sequence);
		snapshotFiles.add(snapshot.file);
		const observation = observations.find((entry) => entry.sequence === snapshot.sequence);
		if (!observation?.checkpoint || manifest.mode !== 'snapshots')
			throw new Error('A snapshot has no matching checkpoint.');
		if ((await stat(join(directory, snapshot.file))).size !== snapshot.sizeBytes)
			throw new Error(`Snapshot ${snapshot.file} is missing or incomplete.`);
		const hash = createHash('sha256');
		for await (const chunk of createReadStream(join(directory, snapshot.file))) hash.update(chunk);
		if (hash.digest('hex') !== snapshot.sha256)
			throw new Error(`Snapshot ${snapshot.file} does not match this capture.`);
	}
	if (
		manifest.mode === 'snapshots' &&
		manifest.status === 'completed' &&
		manifest.snapshots.length !== checkpoints.length
	) {
		throw new Error('A completed snapshot run is missing captures.');
	}
	const first = checkpoints[0];
	const last = checkpoints.at(-1);
	const delta =
		first && last && first !== last
			? Object.fromEntries(
					memoryKeys.map((key) => [key, last.reading.memory[key] - first.reading.memory[key]]),
				)
			: undefined;
	const report = {
		version: 1,
		runId: manifest.runId,
		status: manifest.status,
		error: manifest.error,
		mode: manifest.mode,
		observations: observations.length,
		checkpoints: checkpoints.map(({ sequence, checkpoint, time, gc, reading }) => ({
			sequence,
			label: checkpoint,
			time,
			gc,
			...reading,
		})),
		finalDeltaBytes: delta,
		snapshots: manifest.snapshots,
		notes: [
			manifest.status === 'completed'
				? 'Capture completed. This is not a leak-free verdict.'
				: 'Partial capture. The workload or collection did not complete.',
			'Values describe the process serving the diagnostics URL, not its children or browser.',
			'External and ArrayBuffer memory overlap. Do not add them to RSS or heap.',
			manifest.gc
				? 'Named checkpoints request GC. Background allocations can continue afterward.'
				: 'GC was not requested by this capture.',
			manifest.mode === 'snapshots'
				? 'Snapshots disturb process memory. Use this run for retention inspection, not benchmark comparisons.'
				: 'Peaks reflect sampling intervals and can miss short allocations.',
		],
	};
	await writeFile(join(directory, 'report.json'), JSON.stringify(report, null, 2));
	if (manifest.mode === 'measurements' && observations.length)
		await writeFile(join(directory, 'memory.svg'), renderChart(observations));
	return report;
}

function renderChart(observations: Observation[]): string {
	const first = observations[0].time;
	const duration = Math.max(1, observations[observations.length - 1].time - first);
	const peak = observations.reduce(
		(value, { reading }) =>
			Math.max(value, reading.memory.rss, reading.memory.heapUsed, reading.memory.external),
		1,
	);
	const maximum = Math.max(1, Math.ceil(peak / 1024 / 1024 / 50) * 50);
	const x = (time: number) => 75 + ((time - first) / duration) * 925;
	const y = (bytes: number) => 360 - (bytes / 1024 / 1024 / maximum) * 300;
	let svg =
		'<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="440" viewBox="0 0 1040 440"><rect width="100%" height="100%" fill="white"/><g font-family="sans-serif" font-size="12"><text x="75" y="30" font-size="18">Process memory (sampled)</text>';
	for (let tick = 0; tick <= 5; tick++) {
		const value = (maximum * tick) / 5;
		const py = y(value * 1024 * 1024);
		svg += `<path d="M75,${py}H1000" stroke="#e5e7eb"/><text x="8" y="${py + 4}">${value.toFixed(1)} MiB</text>`;
		const px = 75 + (tick / 5) * 925;
		svg += `<text x="${px - 15}" y="385">${(((duration / 1000) * tick) / 5).toFixed(1)}s</text>`;
	}
	const series = [
		{ key: 'heapUsed', label: 'Heap used', color: '#2563eb' },
		{ key: 'rss', label: 'RSS', color: '#dc2626' },
		{ key: 'external', label: 'External', color: '#16a34a' },
	] satisfies Array<{ key: keyof Observation['reading']['memory']; label: string; color: string }>;
	for (const [index, entry] of series.entries()) {
		const points = observations
			.map(
				({ time, reading }) => `${x(time).toFixed(2)},${y(reading.memory[entry.key]).toFixed(2)}`,
			)
			.join(' ');
		svg += `<polyline points="${points}" fill="none" stroke="${entry.color}" stroke-width="2"/><text x="${75 + index * 200}" y="420" fill="${entry.color}">${entry.label}</text>`;
	}
	for (const observation of observations.filter((entry) => entry.checkpoint)) {
		svg += `<path d="M${x(observation.time)},60V360" stroke="#9ca3af" stroke-dasharray="3 3"/>`;
	}
	return `${svg}</g></svg>`;
}
