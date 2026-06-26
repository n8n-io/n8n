import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { extractInlineRunReports } from './sizing-matrix-aggregate';
import { RunReportBuilder } from '../utils/benchmark/run-report';

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
