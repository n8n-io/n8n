import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	buildNoTestsSummary,
	buildSummary,
	coverageFromCounts,
	emptyCounts,
	gatePassed,
	mutantCountFromOutput,
	scoreFromCounts,
} from './summary.mjs';

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

function mutant(id, status, line, extra = {}) {
	return {
		id,
		mutatorName: 'ConditionalExpression',
		status,
		location: { start: { line, column: 0 }, end: { line, column: 6 } },
		replacement: 'true',
		...extra,
	};
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

describe('gatePassed', () => {
	const clean = { survived: 0, noCoverage: 0 };

	it('passes at the threshold with no unjustified survivor', () => {
		assert.equal(gatePassed(80, clean, 80), true);
	});

	it('fails below the threshold', () => {
		assert.equal(gatePassed(79.99, clean, 80), false);
	});

	// The score alone lets weak tests clear 80% and leave real gaps (DEVP-442).
	it('fails on one survivor or one uncovered mutant, also at 100%', () => {
		assert.equal(gatePassed(100, { survived: 1, noCoverage: 0 }, 80), false);
		assert.equal(gatePassed(100, { survived: 0, noCoverage: 1 }, 80), false);
	});
});

describe('scoreFromCounts', () => {
	// Timeouts count as detected. Uncovered mutants count against the score.
	it('is detected (killed + timeout) over every mutant that could be detected', () => {
		const counts = { killed: 2, timeout: 1, survived: 1, noCoverage: 1 };
		assert.equal(scoreFromCounts(counts), 60);
	});

	it('rounds to two decimals', () => {
		assert.equal(scoreFromCounts({ killed: 2, timeout: 0, survived: 1, noCoverage: 0 }), 66.67);
	});

	it('is 0 — never NaN — when no mutant could be detected', () => {
		assert.equal(scoreFromCounts({ killed: 0, timeout: 0, survived: 0, noCoverage: 0 }), 0);
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
		assert.equal(survived.location, 'src/cron.ts:2:18');
	});
});

describe('buildSummary counts', () => {
	it('counts compile errors and runtime errors apart, and leaves them out of the score', () => {
		const raw = {
			files: {
				'src/a.ts': {
					source: 'a\n',
					mutants: [
						mutant('1', 'Killed', 1),
						mutant('2', 'CompileError', 1),
						mutant('3', 'RuntimeError', 1),
						mutant('4', 'RuntimeError', 1),
					],
				},
			},
		};
		const file = buildSummary(raw, RUN_META).files[0];
		assert.equal(file.counts.compileError, 1);
		assert.equal(file.counts.runtimeError, 2);
		assert.equal(file.score, 100);
	});

	// A status from a newer Stryker must not add a count that nothing reads.
	it('keeps exactly the known counts when a mutant has an unknown status', () => {
		const raw = { files: { 'src/a.ts': { source: 'a\n', mutants: [mutant('1', 'Pending', 1)] } } };
		const file = buildSummary(raw, RUN_META).files[0];
		assert.deepEqual(file.counts, emptyCounts());
	});
});

describe('buildSummary rows', () => {
	it('quotes the mutated source, also across lines', () => {
		const source = 'if (a === b) {\n\treturn 1;\n} // end\n';
		const raw = {
			files: {
				'src/a.ts': {
					source,
					mutants: [
						{
							...mutant('1', 'Survived', 1),
							location: { start: { line: 1, column: 4 }, end: { line: 1, column: 11 } },
						},
						{
							...mutant('2', 'Survived', 1),
							location: { start: { line: 1, column: 13 }, end: { line: 3, column: 1 } },
						},
					],
				},
			},
		};
		const [single, multi] = buildSummary(raw, RUN_META).files[0].survivors;
		assert.equal(single.original, 'a === b');
		assert.equal(multi.original, '{\n\treturn 1;\n}');
	});

	it('lists survivors and justified mutants by line, with the reason for each ignore', () => {
		const raw = {
			files: {
				'src/a.ts': {
					source: 'line1\nline2\nline3\n',
					mutants: [
						mutant('9', 'Survived', 3),
						mutant('8', 'Survived', 1),
						mutant('7', 'Ignored', 2, { statusReason: 'equivalent: same output' }),
						mutant('6', 'Ignored', 1),
					],
				},
			},
		};
		const file = buildSummary(raw, RUN_META).files[0];
		assert.deepEqual(
			file.survivors.map((s) => s.line),
			[1, 3],
		);
		assert.deepEqual(
			file.ignored.map((ig) => [ig.line, ig.reason]),
			[
				[1, ''],
				[2, 'equivalent: same output'],
			],
		);
		// Ignored mutants stay out of the score: 0 killed of 2 valid.
		assert.equal(file.score, 0);
		assert.equal(file.counts.ignored, 2);
	});

	it('adds the counts of every file into the overall row', () => {
		const raw = {
			files: {
				'src/a.ts': { source: 'a\n', mutants: [mutant('1', 'Killed', 1)] },
				'src/b.ts': {
					source: 'b\n',
					mutants: [mutant('2', 'Killed', 1), mutant('3', 'Survived', 1)],
				},
			},
		};
		const summary = buildSummary(raw, RUN_META);
		assert.equal(summary.overall.counts.killed, 2);
		assert.equal(summary.overall.counts.survived, 1);
		assert.equal(summary.overall.score, 66.67);
		assert.equal(summary.overall.thresholdMet, false);
	});

	// The command runner reports no `coveredBy`, so a survivor names no test.
	it('records the test runner and accepts survivors without covering tests', () => {
		const raw = { files: { 'src/a.ts': { source: 'a\n', mutants: [mutant('1', 'Survived', 1)] } } };
		const summary = buildSummary(raw, { ...RUN_META, testRunner: 'command' });
		assert.equal(summary.testRunner, 'command');
		assert.deepEqual(summary.files[0].survivors[0].coveringTests, []);
		assert.equal('testRunner' in buildSummary(raw, RUN_META), false);
	});
});

describe('buildNoTestsSummary (no covering tests)', () => {
	it('reports a score-0 red result with every mutant uncovered', () => {
		const summary = buildNoTestsSummary({
			threshold: 80,
			target: 'src/cron.ts',
			noCoverage: 12,
			generatedAt: RUN_META.generatedAt,
		});
		assert.equal(summary.files[0].coverage, 0);
		assert.equal(summary.overall.score, 0);
		assert.equal(summary.overall.counts.noCoverage, 12);
		assert.equal(summary.overall.thresholdMet, false);
		assert.ok(isFractionInUnitInterval(summary.overall.coverage));
	});

	it('writes one red file row for the target, with no survivor to list', () => {
		const summary = buildNoTestsSummary({ threshold: 80, target: 'src/cron.ts', noCoverage: 3 });
		assert.deepEqual(summary.files, [
			{
				file: 'src/cron.ts',
				score: 0,
				coverage: 0,
				thresholdMet: false,
				counts: { ...emptyCounts(), noCoverage: 3 },
				survivors: [],
				ignored: [],
			},
		]);
	});
});

describe('mutantCountFromOutput', () => {
	it("reads the mutant count from Stryker's instrumenter line", () => {
		assert.equal(
			mutantCountFromOutput('INFO Instrumenter Instrumented 1 source file(s) with 38 mutant(s)'),
			38,
		);
	});

	it('reads counts of any width, with any space between the words', () => {
		const output = 'Instrumented  12 \tsource file(s)\n with  340   mutant(s)';
		assert.equal(mutantCountFromOutput(output), 340);
	});

	it('is 0 when Stryker never instrumented a file', () => {
		assert.equal(mutantCountFromOutput('ERROR Could not read the config'), 0);
	});
});
