import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { emptyCounts, overallGate, reportLines } from './summary.mjs';

function summary({ counts = {}, thresholdMet = true, partial, testRunner, files = [] } = {}) {
	return {
		target: 'src/a.ts',
		...(testRunner ? { testRunner } : {}),
		...(partial ? { partial } : {}),
		overall: { counts: { ...emptyCounts(), ...counts }, thresholdMet },
		files,
	};
}

function fileRow(overrides = {}) {
	return {
		file: 'src/a.ts',
		score: 90,
		coverage: 0.5,
		thresholdMet: false,
		counts: { ...emptyCounts(), killed: 9, survived: 1 },
		survivors: [{ status: 'Survived', mutator: 'EqualityOperator', location: 'src/a.ts:4:2' }],
		ignored: [
			{ mutator: 'StringLiteral', location: 'src/a.ts:9:1', reason: 'log text' },
			{ mutator: 'BlockStatement', location: 'src/a.ts:12:1', reason: '' },
		],
		...overrides,
	};
}

describe('overallGate', () => {
	it('passes when every package run passed', () => {
		const gate = overallGate([summary(), summary({ counts: { ignored: 2 } })]);
		assert.deepEqual(gate, { survived: 0, ignored: 2, passed: true, partial: false });
	});

	it('fails when one package run fails, and counts uncovered mutants as survivors', () => {
		const gate = overallGate([
			summary(),
			summary({ thresholdMet: false, counts: { survived: 2, noCoverage: 1 } }),
		]);
		assert.equal(gate.passed, false);
		assert.equal(gate.survived, 3);
	});

	// The mutants a partial run never tested can be survivors.
	it('never passes a partial run, even when its score met the gate', () => {
		const gate = overallGate([summary({ partial: true })]);
		assert.equal(gate.passed, false);
		assert.equal(gate.partial, true);
	});
});

describe('reportLines', () => {
	const base = {
		packageDir: 'packages/pkg',
		summaryPath: 'packages/pkg/reports/mutation/summary.json',
	};

	it('prints nothing for a failed run: the caller already said why', () => {
		assert.deepEqual(reportLines({ ...base, failed: true }), []);
	});

	it('prints a score-0 red line when no test covers the target', () => {
		const lines = reportLines({ ...base, noTests: true, summary: summary() });
		assert.match(lines[0], /^✗ packages\/pkg src\/a\.ts {2}0\.00% {2}\(no covering tests/);
		assert.equal(lines.at(-1), `  summary: ${base.summaryPath}`);
	});

	it('prints the score, coverage and each unjustified and justified mutant', () => {
		const lines = reportLines({ ...base, summary: summary({ files: [fileRow()] }) });
		assert.equal(
			lines[0],
			'✗ src/a.ts  90.00%  cov 50%  (killed 9 / survived 1 / no-cov 0 / timeout 0 / ignored 0)',
		);
		assert.match(lines[1], /^ {3}- survived +EqualityOperator +src\/a\.ts:4:2$/);
		assert.match(lines[2], /^ {3}· ignored +StringLiteral +src\/a\.ts:9:1 — log text$/);
		assert.match(lines[3], /src\/a\.ts:12:1 — \(no reason given\)$/);
		assert.equal(lines[4], `  summary: ${base.summaryPath}`);
	});

	it('marks a passing file with a tick', () => {
		const row = fileRow({ thresholdMet: true, survivors: [], ignored: [] });
		const [line] = reportLines({ ...base, summary: summary({ files: [row] }) });
		assert.match(line, /^✓ src\/a\.ts/);
	});

	// The command runner runs every test for every mutant: a coverage figure
	// would always read 100% and mean nothing.
	it('prints no coverage figure for a command-runner run', () => {
		const [line] = reportLines({
			...base,
			summary: summary({ testRunner: 'command', files: [fileRow()] }),
		});
		assert.match(line, / cov n\/a /);
	});

	it('warns before the rows when the run was partial', () => {
		const lines = reportLines({ ...base, summary: summary({ partial: true, files: [fileRow()] }) });
		assert.match(
			lines[0],
			/^⚠ packages\/pkg: Stryker exited non-zero.*results may be incomplete\.$/,
		);
	});
});
