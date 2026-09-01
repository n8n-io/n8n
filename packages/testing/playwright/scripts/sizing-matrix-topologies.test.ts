import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { RunReportBuilder, type RunReport } from '../utils/benchmark/run-report';
import {
	aggregate,
	type AggregateInput,
	type HardwareInfo,
} from '../utils/benchmark/sizing-matrix';
import { DEFAULT_MAPPING, QUEUE_WORKER_CONCURRENCY } from './sizing-matrix-topologies';

const HARDWARE: HardwareInfo = { runner: 'test', vcpu: 8, ramGb: 16 };

// Literal expected concurrency per measured-cell spec — hand-checked against the
// topology each spec maps to, NOT re-derived from QUEUE_WORKER_CONCURRENCY. If the
// constant drifts, these literals stay fixed and the schema test below catches it.
const EXPECTED_CONCURRENCY: Record<string, number> = {
	// single-main (workers: 0) → no dedicated queue workers → 0 slots.
	'webhook/webhook-single-instance.spec.ts': 0,
	'kafka/single-instance-ceiling.spec.ts': 0,
	'kafka/steady-rate-breaking-point.spec.ts': 0,
	// 1-worker topologies → 10 slots.
	'webhook/webhook-dedicated-proc-baseline.spec.ts': 10,
	'webhook/webhook-dedicated-proc-2wp-1w.spec.ts': 10,
	'webhook/webhook-save-data-overhead.spec.ts': 10,
	'kafka/queue-mode-sustained-rate.spec.ts': 10,
	'kafka/burst-drain-capacity.spec.ts': 10,
	'kafka/node-count-scaling.spec.ts': 10,
	'kafka/output-size-impact.spec.ts': 10,
	// 2-worker topology → 20 slots.
	'webhook/webhook-dedicated-proc-2wp-2w.spec.ts': 20,
};

function minimalReport(spec: string): RunReport {
	return new RunReportBuilder(
		{ spec, dimensions: { commitSha: 'abc123' } },
		{ totalMs: 60_000, wallClockMs: 60_000 },
		{ execPerSec: 10, reqPerSec: 10, p50Ms: 5, p99Ms: 20 },
	).build();
}

describe('sizing-matrix concurrency schema (DEVP-516)', () => {
	it('every measured-cell topology carries its expected literal concurrency value', () => {
		const specs = Object.keys(DEFAULT_MAPPING);
		expect(specs.length).toBeGreaterThan(0);
		// Every mapped spec must have a hand-checked literal expectation.
		expect(Object.keys(EXPECTED_CONCURRENCY).sort()).toEqual(specs.sort());

		for (const [spec, { topology }] of Object.entries(DEFAULT_MAPPING)) {
			expect(typeof topology.concurrency).toBe('number');
			expect(Number.isFinite(topology.concurrency)).toBe(true);
			expect(topology.concurrency).toBe(EXPECTED_CONCURRENCY[spec]);
		}
	});

	it('locks the single-main (zero-worker) topology to zero concurrency', () => {
		const singleMain = Object.values(DEFAULT_MAPPING).filter(
			({ topology }) => topology.workers === 0,
		);
		expect(singleMain.length).toBeGreaterThan(0);
		for (const { topology } of singleMain) {
			expect(topology.concurrency).toBe(0);
		}
	});

	// Guard: QUEUE_WORKER_CONCURRENCY must track the real worker `--concurrency`
	// default. If the CLI default changes, every published matrix cell silently
	// mislabels concurrency — so fail CI here instead.
	it('keeps QUEUE_WORKER_CONCURRENCY in sync with the worker CLI default', () => {
		const workerCmd = resolve(__dirname, '../../../cli/src/commands/worker.ts');
		const source = readFileSync(workerCmd, 'utf8');
		const match = source.match(/concurrency:\s*z\.number\(\)\.int\(\)\.default\((\d+)\)/);
		expect(
			match,
			'could not find the `--concurrency` default in worker.ts — update this guard if the flag moved',
		).not.toBeNull();
		const cliDefault = Number(match?.[1]);
		expect(cliDefault).toBe(QUEUE_WORKER_CONCURRENCY);
	});

	it('aggregate() preserves the mapped topology concurrency on every produced cell', () => {
		const orderedSpecs = Object.keys(DEFAULT_MAPPING);
		const reports = orderedSpecs.map((spec) => ({ path: spec, report: minimalReport(spec) }));

		// aggregate() groups by scale and keeps the first entry's topology, so the
		// expected concurrency per scale is the first spec of that scale in input order.
		const expectedByScale = new Map<string, number>();
		for (const spec of orderedSpecs) {
			const { scale, topology } = DEFAULT_MAPPING[spec];
			if (!expectedByScale.has(scale)) expectedByScale.set(scale, topology.concurrency);
		}

		const input: AggregateInput = {
			reports,
			mapping: DEFAULT_MAPPING,
			hardware: HARDWARE,
			n8nVersion: '1.0.0',
			commitSha: 'abc123',
			runDate: '2026-06-22T00:00:00.000Z',
		};

		const matrix = aggregate(input);

		expect(matrix.cells.length).toBeGreaterThan(0);
		for (const cell of matrix.cells) {
			expect(typeof cell.topology.concurrency).toBe('number');
			expect(cell.topology.concurrency).toBe(expectedByScale.get(cell.scale));
		}
	});
});
