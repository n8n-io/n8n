import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	coverageFromCounts,
	buildSummary,
	buildNoTestsSummary,
	scoreFromCounts,
} from './mutate.mjs';
import { buildPayload, coverageForLedger } from './emit-payload.mjs';

// A minimal Stryker Mutation Testing Elements report for one source file. Mix
// of statuses so coverage (anything that ran / ran + no-coverage) is a genuine
// fraction strictly between 0 and 1: 3 ran (killed/survived/timeout), 1 sat
// uncovered.
const RAW_FIXTURE = {
	files: {
		'src/cron.ts': {
			source: 'export const a = 1;\nexport const b = 2;\nexport const c = 3;\n',
			mutants: [
				{
					id: '1',
					mutatorName: 'ArithmeticOperator',
					status: 'Killed',
					location: { start: { line: 1, column: 18 }, end: { line: 1, column: 19 } },
					replacement: '2',
				},
				{
					id: '2',
					mutatorName: 'BooleanLiteral',
					status: 'Survived',
					location: { start: { line: 2, column: 18 }, end: { line: 2, column: 19 } },
					replacement: '3',
					coveredBy: ['t1'],
				},
				{
					id: '3',
					mutatorName: 'BlockStatement',
					status: 'Timeout',
					location: { start: { line: 3, column: 18 }, end: { line: 3, column: 19 } },
					replacement: '4',
				},
				{
					id: '4',
					mutatorName: 'StringLiteral',
					status: 'NoCoverage',
					location: { start: { line: 3, column: 0 }, end: { line: 3, column: 5 } },
					replacement: '""',
				},
			],
		},
	},
	testFiles: {
		'src/cron.test.ts': {
			tests: [{ id: 't1', name: 'cron computes next run' }],
		},
	},
};

const RUN_META = { threshold: 80, target: 'src/cron.ts', generatedAt: '2026-06-21T00:00:00.000Z' };

function isFractionInUnitInterval(v) {
	return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
}

describe('coverageFromCounts', () => {
	it('is the share of mutants that ran (ran / ran + no-coverage)', () => {
		// 3 ran (killed + timeout), 1 uncovered → 3/4
		const counts = { killed: 2, survived: 0, timeout: 1, noCoverage: 1, runtimeError: 0 };
		assert.equal(coverageFromCounts(counts), 0.75);
	});

	it('counts survived and runtime-error mutants as covered (they ran)', () => {
		const counts = { killed: 0, survived: 1, timeout: 0, noCoverage: 1, runtimeError: 1 };
		assert.equal(coverageFromCounts(counts), 0.6667);
	});

	it('is 1 when every mutant was covered', () => {
		assert.equal(coverageFromCounts({ killed: 5, survived: 0, timeout: 0, noCoverage: 0 }), 1);
	});

	it('is 0 when no mutant was covered', () => {
		assert.equal(coverageFromCounts({ killed: 0, survived: 0, timeout: 0, noCoverage: 7 }), 0);
	});

	it('is 0 — never NaN — when there is nothing to cover', () => {
		assert.equal(coverageFromCounts({ killed: 0, survived: 0, timeout: 0, noCoverage: 0 }), 0);
	});

	it('ignores compile-error and ignored mutants (they never ran for coverage reasons)', () => {
		const counts = {
			killed: 1,
			survived: 0,
			timeout: 0,
			noCoverage: 1,
			compileError: 3,
			ignored: 4,
			runtimeError: 0,
		};
		// only killed (ran) + noCoverage count → 1/2
		assert.equal(coverageFromCounts(counts), 0.5);
	});

	it('always lands in [0,1]', () => {
		for (const counts of [
			{ killed: 1, survived: 2, timeout: 3, noCoverage: 4, runtimeError: 5 },
			{ killed: 0, survived: 0, timeout: 0, noCoverage: 0 },
			{ killed: 9, survived: 0, timeout: 0, noCoverage: 0 },
		]) {
			assert.ok(isFractionInUnitInterval(coverageFromCounts(counts)));
		}
	});
});

describe('buildSummary', () => {
	it('writes a per-file coverage fraction in [0,1] onto every file row', () => {
		const summary = buildSummary(RAW_FIXTURE, RUN_META);
		assert.equal(summary.files.length, 1);
		const file = summary.files[0];
		assert.ok(isFractionInUnitInterval(file.coverage));
		// 3 ran (killed/survived/timeout) of 4 coverable → 0.75
		assert.equal(file.coverage, 0.75);
	});

	it('writes an overall coverage fraction in [0,1]', () => {
		const summary = buildSummary(RAW_FIXTURE, RUN_META);
		assert.ok(isFractionInUnitInterval(summary.overall.coverage));
	});

	it('preserves the existing summary contract (score, counts, survivors)', () => {
		const summary = buildSummary(RAW_FIXTURE, RUN_META);
		const file = summary.files[0];
		assert.equal(file.score, scoreFromCounts(file.counts));
		assert.equal(file.counts.killed, 1);
		assert.equal(file.counts.survived, 1);
		assert.equal(file.counts.noCoverage, 1);
		assert.equal(file.counts.timeout, 1);
		// Survived + NoCoverage are unjustified survivors
		assert.equal(file.survivors.length, 2);
		// names the covering test for the survived mutant
		const survived = file.survivors.find((s) => s.status === 'Survived');
		assert.deepEqual(survived.coveringTests, ['cron computes next run']);
	});
});

describe('buildNoTestsSummary (no covering tests)', () => {
	it('reports coverage 0 in [0,1] when nothing covers the file', () => {
		const summary = buildNoTestsSummary({
			threshold: 80,
			target: 'src/cron.ts',
			noCoverage: 12,
			generatedAt: RUN_META.generatedAt,
		});
		assert.equal(summary.files[0].coverage, 0);
		assert.ok(isFractionInUnitInterval(summary.files[0].coverage));
		assert.ok(isFractionInUnitInterval(summary.overall.coverage));
	});
});

// PR-gate contract (DEVP-496):
//   "mutate.mjs fixture run produces ledger row with coverage field in [0,1]"
describe('coverage writeback to the ledger row (DEVP-496 PR gate)', () => {
	it('a fixture run produces a ledger row whose coverage is in [0,1]', () => {
		const summary = buildSummary(RAW_FIXTURE, RUN_META);
		const { ledger } = buildPayload(summary, {
			pkg: 'n8n-workflow',
			sha: 'deadbeef',
			pkgRelToRepo: 'packages/workflow',
		});

		assert.equal(ledger.length, 1);
		const row = ledger[0];
		assert.ok(Object.hasOwn(row, 'coverage'), 'ledger row carries a coverage field');
		assert.ok(isFractionInUnitInterval(row.coverage), `coverage ${row.coverage} must be in [0,1]`);
		assert.equal(row.coverage, 0.75);
		assert.equal(row.source_file_path, 'packages/workflow/src/cron.ts');
	});

	it('forwards coverage onto the event row dimensions too', () => {
		const summary = buildSummary(RAW_FIXTURE, RUN_META);
		const { events } = buildPayload(summary, {
			pkg: 'n8n-workflow',
			sha: 'deadbeef',
			pkgRelToRepo: 'packages/workflow',
		});
		assert.ok(isFractionInUnitInterval(events[0].dimensions.coverage));
	});

	it('clamps an out-of-range summary coverage into [0,1]', () => {
		assert.equal(coverageForLedger({ coverage: 1.4, counts: {} }), 1);
		assert.equal(coverageForLedger({ coverage: -0.2, counts: {} }), 0);
	});

	it('falls back to deriving coverage from counts for pre-writeback summaries', () => {
		// No `coverage` field (an older summary) → derived from the mutant census.
		const row = coverageForLedger({
			counts: { killed: 3, survived: 0, timeout: 0, noCoverage: 1, runtimeError: 0 },
		});
		assert.equal(row, 0.75);
		assert.ok(isFractionInUnitInterval(row));
	});
});
