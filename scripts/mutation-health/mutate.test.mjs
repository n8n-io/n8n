import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	coverageFromCounts,
	buildSummary,
	buildNoTestsSummary,
	scoreFromCounts,
} from './mutate.mjs';
import {
	buildPayload,
	coverageForLedger,
	makeChurnFor,
	makeFixDensityFor,
} from './emit-payload.mjs';

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

// DEVP-546: the ledger row also carries a git-derived `churn` count so the
// global picker can rank by the value formula's churn term.
describe('churn writeback to the ledger row (DEVP-546)', () => {
	it('forwards the per-file churn count and fix-density onto the ledger and event rows', () => {
		const summary = buildSummary(RAW_FIXTURE, RUN_META);
		const churnFor = (p) => (p === 'packages/workflow/src/cron.ts' ? 7 : null);
		const fixDensityFor = (p) => (p === 'packages/workflow/src/cron.ts' ? 2.5 : null);
		const { ledger, events } = buildPayload(summary, {
			pkg: 'n8n-workflow',
			sha: 'deadbeef',
			pkgRelToRepo: 'packages/workflow',
			churnFor,
			fixDensityFor,
		});

		assert.ok(Object.hasOwn(ledger[0], 'churn'), 'ledger row carries a churn field');
		assert.equal(ledger[0].churn, 7);
		assert.equal(events[0].dimensions.churn, 7);
		assert.ok(Object.hasOwn(ledger[0], 'fix_density'), 'ledger row carries a fix_density field');
		assert.equal(ledger[0].fix_density, 2.5);
		assert.equal(events[0].dimensions.fix_density, 2.5);
	});

	it('defaults churn and fix_density to null when no signal source is wired in', () => {
		const summary = buildSummary(RAW_FIXTURE, RUN_META);
		const { ledger } = buildPayload(summary, {
			pkg: 'n8n-workflow',
			sha: 'deadbeef',
			pkgRelToRepo: 'packages/workflow',
		});

		assert.ok(Object.hasOwn(ledger[0], 'churn'), 'ledger row carries a churn field');
		assert.equal(ledger[0].churn, null);
		assert.ok(Object.hasOwn(ledger[0], 'fix_density'), 'ledger row carries a fix_density field');
		assert.equal(ledger[0].fix_density, null);
	});
});

describe('makeChurnFor (git-derived churn)', () => {
	// Stub git: shallow probe answers `false`, every rev-list answers `count`.
	function stubGit({ shallow = 'false', count } = {}) {
		return (args) => {
			if (args.includes('--is-shallow-repository')) return `${shallow}\n`;
			if (typeof count === 'function') return count(args);
			return `${count}\n`;
		};
	}

	it('counts commits touching a file within the window', () => {
		const churnFor = makeChurnFor({ runGit: stubGit({ count: 7 }) });
		assert.equal(churnFor('packages/workflow/src/cron.ts'), 7);
	});

	it('passes the configured window through to git rev-list', () => {
		const seen = [];
		const runGit = (args) => {
			seen.push(args);
			return args.includes('--is-shallow-repository') ? 'false\n' : '3\n';
		};
		const churnFor = makeChurnFor({ since: '30 days', runGit });
		churnFor('a/b.ts');
		const revList = seen.find((a) => a[0] === 'rev-list');
		assert.ok(revList.includes('--since=30 days'));
		assert.ok(revList.includes('a/b.ts'));
	});

	it('returns null on a shallow clone (truncated history would undercount)', () => {
		const churnFor = makeChurnFor({ runGit: stubGit({ shallow: 'true', count: 999 }) });
		assert.equal(churnFor('any/file.ts'), null);
	});

	it('returns null when git fails for a file', () => {
		const runGit = (args) => {
			if (args.includes('--is-shallow-repository')) return 'false\n';
			throw new Error('git boom');
		};
		assert.equal(makeChurnFor({ runGit })('x.ts'), null);
	});

	it('returns null when the count is not a finite number', () => {
		const churnFor = makeChurnFor({ runGit: stubGit({ count: 'not-a-number' }) });
		assert.equal(churnFor('x.ts'), null);
	});

	it('treats a non-git directory (probe throws) as unknown churn', () => {
		const runGit = () => {
			throw new Error('not a git repository');
		};
		assert.equal(makeChurnFor({ runGit })('x.ts'), null);
	});
});

describe('makeFixDensityFor (git-derived fix-density)', () => {
	const NOW = 1_700_000_000; // fixed reference time (unix seconds) for determinism

	// Stub git: shallow probe answers `shallow`, the log read answers `log`
	// (synthetic `git log --numstat` output in signals.mjs's GIT_LOG_FORMAT).
	function stubGit({ shallow = 'false', log = '' } = {}) {
		return (args) => (args.includes('--is-shallow-repository') ? `${shallow}\n` : log);
	}

	// A fix commit and a non-fix commit, both touching the same file at `NOW`.
	const FIX_AT_NOW = [
		`COMMIT abc123 ${NOW} fix(core): patch a bug`,
		'10\t0\tpackages/core/src/hot.ts',
		'',
		`COMMIT def456 ${NOW} feat(core): add a feature`,
		'5\t0\tpackages/core/src/hot.ts',
	].join('\n');

	it('sums delta-weighted contributions of fix commits touching the file', () => {
		const fixDensityFor = makeFixDensityFor({ now: NOW, runGit: stubGit({ log: FIX_AT_NOW }) });
		// Only the fix commit counts; age 0 → weight 1 → 10 lines changed.
		assert.equal(fixDensityFor('packages/core/src/hot.ts'), 10);
	});

	it('scores a file with no fix commits as 0 (known: no fixes), not null', () => {
		const fixDensityFor = makeFixDensityFor({ now: NOW, runGit: stubGit({ log: FIX_AT_NOW }) });
		assert.equal(fixDensityFor('packages/core/src/cold.ts'), 0);
	});

	it('decays older fixes by the configured half-life', () => {
		const oneHalfLifeAgo = NOW - 90 * 86_400;
		const log = [
			`COMMIT old111 ${oneHalfLifeAgo} fix: older patch`,
			'8\t0\tpackages/core/src/hot.ts',
		].join('\n');
		const fixDensityFor = makeFixDensityFor({
			now: NOW,
			halfLifeDays: 90,
			runGit: stubGit({ log }),
		});
		// One half-life old → weight 0.5 → 8 * 0.5 = 4.
		assert.equal(fixDensityFor('packages/core/src/hot.ts'), 4);
	});

	it('passes the configured window + pathspec through to git log', () => {
		const seen = [];
		const runGit = (args) => {
			seen.push(args);
			return args.includes('--is-shallow-repository') ? 'false\n' : '';
		};
		makeFixDensityFor({ since: '6 months', pathspec: 'packages/core', now: NOW, runGit })('x.ts');
		const logArgs = seen.find((a) => a[0] === 'log');
		assert.ok(logArgs.includes('--since=6 months'));
		assert.ok(logArgs.includes('packages/core'));
	});

	it('returns null on a shallow clone (truncated history would undercount)', () => {
		const fixDensityFor = makeFixDensityFor({
			now: NOW,
			runGit: stubGit({ shallow: 'true', log: FIX_AT_NOW }),
		});
		assert.equal(fixDensityFor('packages/core/src/hot.ts'), null);
	});

	it('returns null when git fails', () => {
		const runGit = (args) => {
			if (args.includes('--is-shallow-repository')) return 'false\n';
			throw new Error('git boom');
		};
		assert.equal(makeFixDensityFor({ now: NOW, runGit })('x.ts'), null);
	});

	it('treats a non-git directory (probe throws) as unknown fix-density', () => {
		const runGit = () => {
			throw new Error('not a git repository');
		};
		assert.equal(makeFixDensityFor({ now: NOW, runGit })('x.ts'), null);
	});
});
