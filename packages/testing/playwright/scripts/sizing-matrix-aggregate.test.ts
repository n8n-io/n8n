import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { extractInlineRunReports, findRunReports, loadReport } from './sizing-matrix-aggregate';
import { DEFAULT_MAPPING } from './sizing-matrix-topologies';
import { RunReportBuilder } from '../utils/benchmark/run-report';
import { aggregate, type HardwareInfo } from '../utils/benchmark/sizing-matrix';

function makeReport(spec: string) {
	return new RunReportBuilder(
		{ spec, dimensions: { commitSha: 'abc123' } },
		{ totalMs: 60_000, wallClockMs: 60_000 },
		{ execPerSec: 10, p50Ms: 5, p99Ms: 20 },
	).build();
}

/** Minimal Playwright JSON report wrapping run-report.json inline attachments. */
function testResultsWithReports(specs: string[]) {
	return {
		config: {},
		errors: [],
		stats: {},
		suites: [
			{
				title: 'benchmark',
				file: 'bench.spec.ts',
				column: 0,
				line: 0,
				specs: specs.map((spec) => ({
					title: spec,
					ok: true,
					tags: [],
					id: spec,
					file: 'bench.spec.ts',
					line: 0,
					column: 0,
					tests: [
						{
							results: [
								{
									attachments: [
										{
											name: 'run-report.json',
											contentType: 'application/json',
											path: '',
											body: Buffer.from(JSON.stringify(makeReport(spec))).toString('base64'),
										},
										{ name: 'trace', contentType: 'application/zip', path: 'trace.zip' },
									],
								},
							],
						},
					],
				})),
			},
		],
	};
}

describe('extractInlineRunReports', () => {
	const dirs: string[] = [];

	afterEach(() => {
		// vitest cleans the OS tmpdir; nothing persistent to remove between tests.
		dirs.length = 0;
	});

	function setupLane(name: string, specs: string[]): string {
		const root = mkdtempSync(join(tmpdir(), 'sizing-extract-'));
		dirs.push(root);
		const laneDir = join(root, name);
		mkdirSync(laneDir, { recursive: true });
		writeFileSync(
			join(laneDir, 'test-results.json'),
			JSON.stringify(testResultsWithReports(specs)),
		);
		return root;
	}

	it('decodes inline run-report.json attachments into loose files', () => {
		const root = setupLane('benchmark-webhook-shard-1', [
			'webhook/webhook-single-instance.spec.ts',
		]);

		const extracted = extractInlineRunReports(root);

		expect(extracted).toBe(1);
		const laneDir = join(root, 'benchmark-webhook-shard-1');
		const looseFiles = readdirSync(laneDir).filter((f) => f.includes('run-report'));
		expect(looseFiles).toHaveLength(1);

		const written = JSON.parse(readFileSync(join(laneDir, looseFiles[0]), 'utf8'));
		expect(written.schemaVersion).toBe(1);
		expect(written.scenario.spec).toBe('webhook/webhook-single-instance.spec.ts');
	});

	it('extracts one loose file per spec in a multi-spec shard', () => {
		const root = setupLane('benchmark-kafka-shard-1', [
			'kafka/single-instance-ceiling.spec.ts',
			'kafka/burst-drain-capacity.spec.ts',
		]);

		const extracted = extractInlineRunReports(root);

		expect(extracted).toBe(2);
		const laneDir = join(root, 'benchmark-kafka-shard-1');
		const looseFiles = readdirSync(laneDir).filter((f) => f.includes('run-report'));
		expect(looseFiles).toHaveLength(2);
	});

	it('returns 0 when no test-results.json contains run-report attachments', () => {
		const root = mkdtempSync(join(tmpdir(), 'sizing-extract-'));
		dirs.push(root);
		writeFileSync(
			join(root, 'test-results.json'),
			JSON.stringify({ suites: [{ specs: [{ tests: [{ results: [{ attachments: [] }] }] }] }] }),
		);

		expect(extractInlineRunReports(root)).toBe(0);
	});

	it('tolerates malformed test-results.json without throwing', () => {
		const root = mkdtempSync(join(tmpdir(), 'sizing-extract-'));
		dirs.push(root);
		writeFileSync(join(root, 'test-results.json'), '{ not valid json');

		expect(extractInlineRunReports(root)).toBe(0);
	});
});

// Uses a REAL captured artifact, not RunReportBuilder mocks: mocks set
// scenario.spec to a spec path so they always map — the real harness emits a
// human title, and only the extracted filename's spec stem routes it to a cell.
describe('sizing-matrix aggregation over a real captured fixture (DEVP-531)', () => {
	const FIXTURE_DIR = resolve(__dirname, '__fixtures__/sizing-matrix');
	const HARDWARE: HardwareInfo = { runner: 'test', vcpu: 8, ramGb: 16 };

	it('routes real run-reports to cells and emits a populated matrix with concurrency', () => {
		// Copy out of the repo: extraction writes loose files next to the source.
		const tmp = mkdtempSync(join(tmpdir(), 'sizing-fixture-'));
		cpSync(FIXTURE_DIR, tmp, { recursive: true });

		const extracted = extractInlineRunReports(tmp);
		expect(extracted).toBeGreaterThan(0);

		const reports = findRunReports(tmp)
			.map(loadReport)
			.filter((r): r is Exclude<typeof r, undefined> => r !== undefined);
		expect(reports.length).toBeGreaterThan(0);

		const matrix = aggregate({
			reports,
			mapping: DEFAULT_MAPPING,
			hardware: HARDWARE,
			n8nVersion: 'test',
			commitSha: 'deadbeef',
			runDate: '2026-01-01T00:00:00.000Z',
		});

		expect(matrix.cells.length).toBeGreaterThan(0);

		for (const cell of matrix.cells) {
			expect(typeof cell.topology.concurrency).toBe('number');
			for (const shape of Object.values(cell.shapes)) {
				if (!shape) continue;
				expect(shape.greenSustainedExecPerSec).toBeLessThanOrEqual(shape.ceilingExecPerSec.p50);
				for (const source of shape.sourceRuns) {
					expect(source.commitSha).toBe('deadbeef');
				}
			}
		}

		expect(matrix.cells.map((c) => c.scale)).toContain('S1');
	});
});
