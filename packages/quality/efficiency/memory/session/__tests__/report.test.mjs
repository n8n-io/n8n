import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile, appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
	allocationSites,
	artifactPath,
	buildReport,
	compareReports,
	parseMemoryMetrics,
} from '../report.mjs';
import { duration, parseCommand } from '../cli.mjs';

const directories = [];
afterEach(async () => {
	for (const directory of directories.splice(0))
		await rm(directory, { recursive: true, force: true });
});
async function temporary() {
	const directory = await mkdtemp(join(tmpdir(), 'n8n-memory-report-'));
	directories.push(directory);
	return directory;
}

describe('memory metrics', () => {
	it('reads exact process gauges with scientific notation and timestamps', () => {
		const result = parseMemoryMetrics(
			[
				'# TYPE n8n_process_resident_memory_bytes gauge',
				'n8n_process_resident_memory_bytes 1.2e+8 123456',
				'n8n_nodejs_heap_size_used_bytes 40',
				'n8n_nodejs_heap_size_total_bytes 80',
				'n8n_nodejs_external_memory_bytes 12',
				'n8n_process_start_time_seconds 123.5',
				'n8n_process_resident_memory_bytes_extra 99',
				'n8n_process_resident_memory_bytes{role="worker"} 5',
			].join('\n'),
		);
		expect(result.values).toEqual({ rss: 120_000_000, heapUsed: 40, heapTotal: 80, external: 12 });
		expect(result.processStartedAtMs).toBe(123_500);
	});
	it('rejects incomplete or non-finite memory metrics', () => {
		expect(() => parseMemoryMetrics('n8n_process_resident_memory_bytes NaN')).toThrow('missing');
	});
});

describe('recording reports', () => {
	async function fixture() {
		const directory = await temporary();
		const input = join(directory, 'session.json');
		const session = {
			schemaVersion: 1,
			kind: 'n8n-memory-session',
			status: 'complete',
			timeline: 'timeline.ndjson',
			segments: [{ id: 'process-1' }],
			profiles: [],
			snapshots: [],
			markers: [],
			gaps: [],
			settings: {
				metricsOnly: true,
				workload: 'workflow-execution',
				intervalMs: 1000,
				durationMs: 4000,
			},
			metadata: { node: 'v24', hostname: 'machine', configuration: {} },
		};
		await writeFile(input, JSON.stringify(session));
		const points = [1000, 100, 200, 300, 400].map((rss, i) => ({
			phase: i === 0 ? 'warmup' : 'measurement',
			memory: { rss, heapUsed: rss / 2, heapTotal: rss, external: 1 },
		}));
		await writeFile(
			join(directory, 'timeline.ndjson'),
			points.map((point) => JSON.stringify(point)).join('\n'),
		);
		return { input, session };
	}
	it('excludes warm-up and keeps the endpoint windows separate', async () => {
		const { input } = await fixture();
		const report = await buildReport(input);
		expect(report.measurementSampleCount).toBe(4);
		expect(report.memory.rss).toMatchObject({
			initialMedian: 150,
			finalMedian: 350,
			peak: 400,
			change: 200,
		});
		expect(report.comparison.eligible).toBe(true);
	});
	it('rejects comparisons with gaps, restarts, or different sampling settings', async () => {
		const { input } = await fixture();
		const before = await buildReport(input);
		const after = structuredClone(before);
		after.session.settings.intervalMs = 2000;
		after.session.settings.frontend = true;
		after.comparison.issues.push('Capture has gaps', 'Capture spans multiple process segments');
		const result = compareReports(before, after);
		expect(result.comparable).toBe(false);
		expect(result.issues).toEqual(
			expect.arrayContaining([
				'Different intervalMs',
				'Different frontend',
				'After: Capture has gaps',
			]),
		);
	});
	it('requires a named workload for a comparison', async () => {
		const { input } = await fixture();
		const report = await buildReport(input);
		report.session.settings.workload = null;
		expect(compareReports(report, report).comparable).toBe(false);
	});
	it('preserves readable samples after a truncated timeline row', async () => {
		const { input } = await fixture();
		await appendFile(join(input, '..', 'timeline.ndjson'), '\n{"memory":');
		const report = await buildReport(input);
		expect(report.measurementSampleCount).toBe(4);
		expect(report.comparison.issues).toContain('Invalid timeline rows: 1');
	});
	it('rejects a recording with missing native profile artifacts', async () => {
		const { input, session } = await fixture();
		session.profiles.push({ file: 'missing.heapprofile' });
		await writeFile(input, JSON.stringify(session));
		const report = await buildReport(input);
		expect(report.comparison.eligible).toBe(false);
		expect(report.comparison.issues.join(' ')).toContain('missing.heapprofile');
	});
	it('keeps artifact paths in the recording directory', () => {
		expect(() => artifactPath('/tmp/recording', '../another-file')).toThrow();
	});
	it.each(['url', 'path'])(
		'maps %s allocation frames to TypeScript and sums self sizes',
		async (format) => {
			const directory = await temporary();
			const filename = join(directory, 'compiled file.js');
			await writeFile(
				`${filename}.map`,
				JSON.stringify({ version: 3, sources: ['original.ts'], names: [], mappings: 'AAAA' }),
			);
			const frame = {
				functionName: 'allocate',
				url: format === 'url' ? pathToFileURL(filename).href : filename,
				lineNumber: 0,
				columnNumber: 0,
			};
			const sites = await allocationSites({
				head: {
					selfSize: 10,
					callFrame: frame,
					children: [{ selfSize: 20, callFrame: frame, children: [] }],
				},
			});
			expect(sites).toEqual([
				{
					functionName: 'allocate',
					url: pathToFileURL(join(directory, 'original.ts')).href,
					line: 1,
					column: 1,
					bytes: 30,
				},
			]);
		},
	);
});

describe('agent arguments', () => {
	it('accepts duration units and rejects unbounded values', () => {
		expect(duration('1.5s', 'duration')).toBe(1500);
		expect(duration('0s', 'warmup', true)).toBe(0);
		expect(() => duration('Infinity', 'duration')).toThrow();
		expect(() => duration('0s', 'duration')).toThrow();
	});
	it('accepts the pnpm separator and rejects unknown flags', () => {
		expect(parseCommand(['record', '--', '--duration=120s', '--no-open']).values.duration).toBe(
			'120s',
		);
		expect(() => parseCommand(['record', '--duraton=120s'])).toThrow();
	});
});
