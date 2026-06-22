import { describe, expect, it } from 'vitest';

import { RunReportBuilder, type RunReport } from '../utils/benchmark/run-report';
import {
	aggregate,
	type AggregateInput,
	type HardwareInfo,
} from '../utils/benchmark/sizing-matrix';
import { DEFAULT_MAPPING, QUEUE_WORKER_CONCURRENCY } from './sizing-matrix-topologies';

const HARDWARE: HardwareInfo = { runner: 'test', vcpu: 8, ramGb: 16 };

function minimalReport(spec: string): RunReport {
	return new RunReportBuilder(
		{ spec, dimensions: { commitSha: 'abc123' } },
		{ totalMs: 60_000, wallClockMs: 60_000 },
		{ execPerSec: 10, reqPerSec: 10, p50Ms: 5, p99Ms: 20 },
	).build();
}

describe('sizing-matrix concurrency schema (DEVP-516)', () => {
	it('every measured-cell topology carries a numeric concurrency value', () => {
		const cells = Object.values(DEFAULT_MAPPING);
		expect(cells.length).toBeGreaterThan(0);
		for (const { topology } of cells) {
			expect(typeof topology.concurrency).toBe('number');
			expect(Number.isFinite(topology.concurrency)).toBe(true);
			// Concurrency is the queue's total in-flight slots: workers × per-worker.
			expect(topology.concurrency).toBe(topology.workers * QUEUE_WORKER_CONCURRENCY);
		}
	});

	it('aggregate() emits a numeric concurrency on every produced cell', () => {
		const reports = Object.keys(DEFAULT_MAPPING).map((spec) => ({
			path: spec,
			report: minimalReport(spec),
		}));
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
			expect(Number.isFinite(cell.topology.concurrency)).toBe(true);
			expect(cell.topology.concurrency).toBeGreaterThanOrEqual(0);
		}
	});
});
