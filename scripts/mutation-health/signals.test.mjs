import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	DEFAULT_HALF_LIFE_DAYS,
	computeChurn,
	computeFixDensity,
	isFixSubject,
	parseGitLog,
} from './signals.mjs';

const DAY = 86_400;
// Fixed reference epoch (2026-06-20 00:00:00 UTC) — tests must not depend on
// wall-clock; the signal API requires explicit `now` for exactly this reason.
const NOW = 1_750_377_600;

const commit = (sha, ageDays, subject, files) => {
	const lines = [`COMMIT ${sha} ${NOW - ageDays * DAY} ${subject}`];
	for (const [path, added, removed] of files) {
		lines.push(`${added}\t${removed}\t${path}`);
	}
	return lines.join('\n');
};

const fixture = (...blocks) => blocks.join('\n\n');

describe('isFixSubject', () => {
	it('matches conventional fix prefixes', () => {
		assert.equal(isFixSubject('fix: oops'), true);
		assert.equal(isFixSubject('fix(workflow): oops'), true);
		assert.equal(isFixSubject('fix(core)!: breaking fix'), true);
		assert.equal(isFixSubject('FIX: case-insensitive'), true);
	});

	it('rejects non-fix subjects', () => {
		assert.equal(isFixSubject('feat: new thing'), false);
		assert.equal(isFixSubject('chore: rename'), false);
		// "prefix" detection — we intentionally don't accept loose "fixes a bug"
		// in commit bodies; the convention here is `fix:` at the start.
		assert.equal(isFixSubject('refactor: this fixes a bug indirectly'), false);
	});
});

describe('parseGitLog', () => {
	it('parses sha, timestamp, subject, and files', () => {
		const log = commit('aaa1', 1, 'fix(core): null pointer', [['src/a.ts', 40, 10]]);
		const commits = parseGitLog(log);
		assert.equal(commits.length, 1);
		assert.equal(commits[0].sha, 'aaa1');
		assert.equal(commits[0].timestamp, NOW - DAY);
		assert.equal(commits[0].subject, 'fix(core): null pointer');
		assert.equal(commits[0].isFix, true);
		assert.deepEqual(commits[0].files, [{ path: 'src/a.ts', added: 40, removed: 10 }]);
	});

	it('treats binary numstat (- -) as zero-change', () => {
		const log = commit('bin1', 1, 'fix: refresh sprite', [
			['assets/foo.png', '-', '-'],
		]).replace('-\t-', '-\t-'); // sanity: still a real tab
		const commits = parseGitLog(log);
		assert.equal(commits[0].files[0].added, 0);
		assert.equal(commits[0].files[0].removed, 0);
	});

	it('returns [] on non-string input and tolerates noise lines', () => {
		assert.deepEqual(parseGitLog(undefined), []);
		const noisy = ['', 'totally not a commit line', '5\t5\torphan.ts', ''].join('\n');
		assert.deepEqual(parseGitLog(noisy), []);
	});

	it('marks non-fix commits as isFix=false', () => {
		const log = commit('c1', 1, 'chore: rename var', [['src/a.ts', 2, 2]]);
		assert.equal(parseGitLog(log)[0].isFix, false);
	});
});

describe('computeChurn', () => {
	it('aggregates commit count and total lines per file', () => {
		const log = fixture(
			commit('a', 1, 'fix: x', [['src/hot.ts', 40, 10]]),
			commit('b', 10, 'chore: y', [['src/hot.ts', 5, 5]]),
			commit('c', 30, 'fix: z', [
				['src/hot.ts', 20, 8],
				['src/other.ts', 1, 0],
			]),
		);
		const churn = computeChurn(parseGitLog(log));
		assert.deepEqual(churn.get('src/hot.ts'), { commits: 3, linesChanged: 88 });
		assert.deepEqual(churn.get('src/other.ts'), { commits: 1, linesChanged: 1 });
	});

	it('honours since/until windows', () => {
		const log = fixture(
			commit('recent', 1, 'fix: x', [['src/a.ts', 10, 0]]),
			commit('old', 365, 'fix: y', [['src/a.ts', 10, 0]]),
		);
		const commits = parseGitLog(log);
		const recent = computeChurn(commits, { since: NOW - 30 * DAY });
		assert.equal(recent.get('src/a.ts').commits, 1);
	});
});

describe('computeFixDensity', () => {
	it('refuses to run without an explicit `now`', () => {
		assert.throws(() => computeFixDensity([], {}), /requires explicit `now`/);
		assert.throws(
			() => computeFixDensity([], { now: NOW, halfLifeDays: 0 }),
			/halfLifeDays/,
		);
	});

	it('weighs recent fixes more than ancient fixes (same delta, same file)', () => {
		const log = fixture(
			commit('recent', 1, 'fix: x', [['src/a.ts', 10, 0]]),
			commit('ancient', 365, 'fix: y', [['src/b.ts', 10, 0]]),
		);
		const density = computeFixDensity(parseGitLog(log), {
			halfLifeDays: 90,
			now: NOW,
		});
		assert.ok(
			density.get('src/a.ts') > density.get('src/b.ts'),
			`recent ${density.get('src/a.ts')} should exceed ancient ${density.get('src/b.ts')}`,
		);
	});

	it('decays by exactly the half-life ratio', () => {
		const log = fixture(
			commit('t0', 0, 'fix: x', [['src/a.ts', 100, 0]]),
			commit('t1', DEFAULT_HALF_LIFE_DAYS, 'fix: y', [['src/b.ts', 100, 0]]),
		);
		const density = computeFixDensity(parseGitLog(log), { now: NOW });
		const ratio = density.get('src/b.ts') / density.get('src/a.ts');
		assert.ok(Math.abs(ratio - 0.5) < 1e-9, `expected half-life ratio, got ${ratio}`);
	});

	it('weighs bigger deltas more (same age, same file)', () => {
		const log = fixture(
			commit('big', 1, 'fix: x', [['src/a.ts', 100, 0]]),
			commit('small', 1, 'fix: y', [['src/b.ts', 5, 0]]),
		);
		const density = computeFixDensity(parseGitLog(log), {
			halfLifeDays: 90,
			now: NOW,
		});
		assert.ok(density.get('src/a.ts') > density.get('src/b.ts'));
	});

	it('ignores non-fix commits entirely', () => {
		const log = commit('chore', 1, 'chore: refactor', [['src/a.ts', 100, 0]]);
		const density = computeFixDensity(parseGitLog(log), {
			halfLifeDays: 90,
			now: NOW,
		});
		assert.equal(density.get('src/a.ts'), undefined);
	});

	it('treats future-dated commits (skew/clock-drift) as age 0, not negative', () => {
		// Floor at 0 guards against decay > 1 if a clock-skewed commit lands
		// "in the future" relative to `now`. Behaviour: weight === 1, not >1.
		const log = commit('future', -7, 'fix: x', [['src/a.ts', 10, 0]]);
		const density = computeFixDensity(parseGitLog(log), {
			halfLifeDays: 90,
			now: NOW,
		});
		assert.equal(density.get('src/a.ts'), 10);
	});
});

// PR-gate contract from DEVP-492:
//   "cold-file value < hot-file value at identical mutation status
//    using fixture git logs"
//
// Build two files that share the same hypothetical mutation status — what
// differs is purely their history. `hot.ts` has three recent fix commits with
// meaningful deltas; `cold.ts` has one ancient fix and one recent chore. The
// risk signal MUST rank hot above cold on both churn and fix-density,
// regardless of what their mutation score happens to be.
describe('cold-vs-hot contract (DEVP-492 PR gate)', () => {
	const log = fixture(
		commit('h1', 1, 'fix(core): null pointer in hot path', [['src/hot.ts', 40, 10]]),
		commit('h2', 10, 'fix: edge case', [['src/hot.ts', 30, 5]]),
		commit('h3', 30, 'fix(workflow): off-by-one', [['src/hot.ts', 20, 8]]),
		commit('c1', 600, 'fix: ancient bug', [['src/cold.ts', 40, 10]]),
		commit('c2', 5, 'chore: rename variable', [['src/cold.ts', 2, 2]]),
	);
	const commits = parseGitLog(log);

	it('hot file has higher churn (commit count and lines changed)', () => {
		const churn = computeChurn(commits);
		const hot = churn.get('src/hot.ts');
		const cold = churn.get('src/cold.ts');
		assert.ok(hot.commits > cold.commits, `hot.commits=${hot.commits} cold=${cold.commits}`);
		assert.ok(
			hot.linesChanged > cold.linesChanged,
			`hot.linesChanged=${hot.linesChanged} cold=${cold.linesChanged}`,
		);
	});

	it('hot file has higher fix-density across realistic half-lives', () => {
		for (const halfLifeDays of [30, 90, 180]) {
			const density = computeFixDensity(commits, { halfLifeDays, now: NOW });
			const hot = density.get('src/hot.ts');
			const cold = density.get('src/cold.ts') ?? 0;
			assert.ok(
				hot > cold,
				`half-life=${halfLifeDays}d: hot=${hot} must exceed cold=${cold}`,
			);
		}
	});
});
