import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { diffSnapshots, type ObjectGrowth } from './heap-diff.js';
import { manifestSchema, memoryKeys, observationSchema, type Observation } from './schema.js';

export async function createReport(directory: string) {
	const manifest = manifestSchema.parse(
		JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8')),
	);
	if (manifest.status === 'recording')
		throw new Error('The run is still recording. Finish or interrupt the capture first.');
	const lines = (await readFile(join(directory, 'samples.jsonl'), 'utf8')).trim();
	const observations = lines
		? lines.split('\n').map((line) => observationSchema.parse(JSON.parse(line)))
		: [];
	const checkpoints = observations.filter((observation) => observation.checkpoint !== undefined);
	const first = checkpoints[0];
	const last = checkpoints.at(-1);
	const delta =
		first && last && first !== last
			? Object.fromEntries(
					memoryKeys.map((key) => [key, last.reading.memory[key] - first.reading.memory[key]]),
				)
			: undefined;
	const firstSnapshot = manifest.snapshots[0];
	const lastSnapshot = manifest.snapshots.at(-1);
	let topGrowth: ObjectGrowth[] | undefined;
	let growthError: string | undefined;
	if (firstSnapshot && lastSnapshot && firstSnapshot !== lastSnapshot) {
		try {
			topGrowth = await diffSnapshots(
				join(directory, firstSnapshot.file),
				join(directory, lastSnapshot.file),
			);
		} catch (error) {
			// Very large snapshots exceed the maximum string length for parsing.
			growthError = error instanceof Error ? error.message : 'Snapshot comparison failed.';
		}
	}
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
		topGrowth,
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
			...(topGrowth
				? [
						'Object growth compares shallow sizes between the first and last snapshot. Open both snapshots in Chrome DevTools and check Retainers to see what keeps these objects alive.',
					]
				: []),
			...(growthError ? [`Object growth unavailable: ${growthError}`] : []),
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
