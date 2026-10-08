/**
 * Generative checks of the pure helpers, with seeded samples (see samples.mjs).
 * Each check states a rule that must hold for every input, so it also catches
 * an off-by-one, an inverted condition or a missing branch that the example
 * tests in the other files do not reach.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { forEachSample } from './samples.mjs';
import { toCommandLine } from './stryker.mjs';
import { coverageFromCounts, emptyCounts, scoreFromCounts } from './summary.mjs';
import {
	mergeRanges,
	parseHunkRanges,
	parseTestFiles,
	splitRange,
	toPackageRelative,
} from './targets.mjs';
import { toNestedNamePattern } from './vitest-compat.mjs';

// The pattern @stryker-mutator/vitest-runner 10.0.0 builds for a mutant (see
// vitest-compat.test.mjs, which also runs the installed runner).
function escapeRegExp(input) {
	return input.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}
function runnerPattern(names) {
	return new RegExp(names.map(escapeRegExp).join('|'));
}

describe('toNestedNamePattern for any test names', () => {
	// Name characters: spaces, `>` and every character a regex gives a meaning.
	const NAME_CHARS = 'ab xy>.*+?^${}()|[]\\-';
	// Segment `i` (a suite or the test) starts with the digit `i`, and no other
	// segment has that digit. A name that lacks a segment thus has no match.
	const segments = (r) =>
		r.array(1, 5, () => '').map((_, i) => `${i}${r.string(NAME_CHARS, 0, 6)}`);
	const vitest4 = (segs) => segs.join(' ');
	const vitest5 = (segs) => segs.join(' > ');

	it('selects each covering test by its Vitest 5 and its Vitest 4 full name', () => {
		forEachSample(
			{ seed: 101 },
			(r) => r.array(1, 3, () => segments(r)),
			(tests) => {
				const pattern = toNestedNamePattern(runnerPattern(tests.map(vitest4)));
				for (const segs of tests) {
					assert.equal(pattern.test(vitest5(segs)), true, vitest5(segs));
					assert.equal(pattern.test(vitest4(segs)), true, vitest4(segs));
				}
			},
		);
	});

	it('rejects a test of another suite and another test of the same suite', () => {
		forEachSample(
			{ seed: 202 },
			(r) => ({ segs: segments(r), other: r.string('QJ', 1, 4) }),
			({ segs, other }) => {
				const pattern = toNestedNamePattern(runnerPattern([vitest4(segs)]));
				for (const index of segs.keys()) {
					const changed = segs.with(index, other);
					assert.equal(pattern.test(vitest5(changed)), false, vitest5(changed));
				}
			},
		);
	});

	it('returns a pattern that it made unchanged', () => {
		forEachSample(
			{ seed: 303, count: 50 },
			(r) => segments(r),
			(segs) => {
				const nested = toNestedNamePattern(runnerPattern([vitest4(segs)]));
				assert.equal(toNestedNamePattern(nested), nested);
			},
		);
	});
});

// Every line that a list of ranges covers.
function coveredLines(ranges) {
	const lines = new Set();
	for (const { start, end } of ranges) for (let line = start; line <= end; line++) lines.add(line);
	return [...lines].sort((a, b) => a - b);
}

// Sorted, each range valid, and a gap of at least one line between ranges.
function assertMerged(ranges) {
	for (const [index, range] of ranges.entries()) {
		assert.ok(range.start <= range.end, JSON.stringify(range));
		const previous = ranges[index - 1];
		if (previous) assert.ok(range.start > previous.end + 1, JSON.stringify(ranges));
	}
}

describe('mergeRanges for any ranges', () => {
	const ranges = (r) =>
		r.array(0, 8, () => {
			const start = r.int(1, 40);
			return { start, end: start + r.int(0, 6) };
		});

	it('covers the same lines, in sorted ranges with a gap between each two', () => {
		forEachSample({ seed: 404 }, ranges, (input) => {
			const merged = mergeRanges(input);
			assertMerged(merged);
			assert.deepEqual(coveredLines(merged), coveredLines(input));
		});
	});

	it('leaves its input as it was', () => {
		forEachSample({ seed: 505, count: 50 }, ranges, (input) => {
			const copy = structuredClone(input);
			mergeRanges(input);
			assert.deepEqual(input, copy);
		});
	});
});

describe('parseHunkRanges for any diff', () => {
	// A `git diff -U0` text with hunks between other diff lines. A count is
	// left out at random: git writes `+12` for a count of one.
	const diff = (r) => {
		const hunks = r.array(0, 6, () => ({ start: r.int(1, 60), count: r.int(0, 5) }));
		const lines = ['diff --git a/x.ts b/x.ts', '--- a/x.ts', '+++ b/x.ts'];
		for (const { start, count } of hunks) {
			const newSide = count === 1 && r.int(0, 1) === 0 ? `${start}` : `${start},${count}`;
			lines.push(`@@ -${r.int(1, 60)},${r.int(0, 5)} +${newSide} @@ export function a() {`);
			lines.push(...r.array(0, 2, () => `${r.pick(['+', '-'])}${r.string('ab @+-', 0, 6)}`));
		}
		return { hunks, text: lines.join('\n') };
	};

	it('covers exactly the added lines of every hunk, merged', () => {
		forEachSample({ seed: 606 }, diff, ({ hunks, text }) => {
			const ranges = parseHunkRanges(text);
			assertMerged(ranges);
			const added = hunks
				.filter(({ count }) => count > 0)
				.map(({ start, count }) => ({ start, end: start + count - 1 }));
			assert.deepEqual(coveredLines(ranges), coveredLines(added));
		});
	});
});

describe('toPackageRelative for any path', () => {
	const segment = (r) => `${r.pick([...'abc'])}${r.string('abc@_-.', 0, 4)}`;
	const sample = (r) => ({
		packageDir: r.array(1, 3, () => segment(r)).join('/'),
		rel: r.array(1, 4, () => segment(r)).join('/'),
	});

	it('removes the package prefix of a repo-relative path, also after `./`', () => {
		forEachSample({ seed: 707 }, sample, ({ packageDir, rel }) => {
			assert.equal(toPackageRelative(`${packageDir}/${rel}`, packageDir), rel);
			assert.equal(toPackageRelative(`./${packageDir}/${rel}`, packageDir), rel);
		});
	});

	it('keeps a path in a sibling dir whose name starts with the package name', () => {
		forEachSample({ seed: 808 }, sample, ({ packageDir, rel }) => {
			const sibling = `${packageDir}x/${rel}`;
			assert.equal(toPackageRelative(sibling, packageDir), sibling);
		});
	});

	it('keeps a path that is already package-relative', () => {
		forEachSample({ seed: 909 }, sample, ({ packageDir, rel }) => {
			if (rel.startsWith(`${packageDir}/`)) return;
			assert.equal(toPackageRelative(rel, packageDir), rel);
		});
	});
});

describe('parseTestFiles for any flag values', () => {
	// The values of repeated --test-files flags: paths, commas and blanks.
	const values = (r) => r.array(0, 5, () => r.string('ab/.,  \t', 0, 10));
	// Each non-blank path of the values, as typed, with repeats.
	const pathsIn = (vals) =>
		vals
			.flatMap((value) => value.split(','))
			.map((part) => part.trim())
			.filter(Boolean);

	it('keeps each typed path once, trimmed, in the order it first appears', () => {
		forEachSample({ seed: 1401 }, values, (vals) => {
			const files = parseTestFiles(vals);
			const typed = pathsIn(vals);
			assert.deepEqual(new Set(files), new Set(typed));
			assert.equal(new Set(files).size, files.length);
			for (const file of files)
				assert.ok(file !== '' && file === file.trim() && !file.includes(','));
			const firstSeen = files.map((file) => typed.indexOf(file));
			assert.deepEqual(
				firstSeen,
				[...firstSeen].sort((a, b) => a - b),
			);
		});
	});

	it('reads one comma-joined value as the repeated flag, and a second parse changes nothing', () => {
		forEachSample({ seed: 1402 }, values, (vals) => {
			const files = parseTestFiles(vals);
			assert.deepEqual(parseTestFiles([vals.join(',')]), files);
			assert.deepEqual(parseTestFiles(files), files);
			assert.deepEqual(parseTestFiles([files.join(',')]), files);
		});
	});
});

describe('splitRange for any target', () => {
	// Colons, dashes and digits in a file name look like parts of a range.
	const FILE_CHARS = 'ab:-0123./';

	it('splits off a trailing `:<start>-<end>` and keeps the rest as the file', () => {
		forEachSample(
			{ seed: 1501 },
			(r) => ({ file: r.string(FILE_CHARS, 0, 10), start: r.int(0, 999), end: r.int(0, 999) }),
			({ file, start, end }) => {
				const range = `${start}-${end}`;
				assert.deepEqual(splitRange(`${file}:${range}`), { file, range });
			},
		);
	});

	it('keeps a target that does not end in a whole range as the file', () => {
		forEachSample(
			{ seed: 1502 },
			(r) => {
				const [a, b] = [r.int(0, 99), r.int(0, 99)];
				const end = r.pick(['.ts', `:${a}`, `:${a}-`, `:-${b}`, `:${a}-${b}x`]);
				return `${r.string(FILE_CHARS, 0, 10)}${end}`;
			},
			(target) => assert.deepEqual(splitRange(target), { file: target, range: null }),
		);
	});
});

describe('toCommandLine for any file names', () => {
	// Every character the shell gives a meaning, but no newline: the shell
	// output below puts each sample on its own line. No program has a name made
	// of q, j and Q, so a name that the shell runs as a command runs nothing.
	const ARG_CHARS = 'qjQ _-./@%+=:,\'"$`\\*?[]{}~#!&;|<>()^';
	const skip = process.platform === 'win32' && 'the command runner uses a POSIX shell here';

	it('gives the command each file name as one argument, as it was', { skip }, () => {
		// Each special character alone and next to letters, then random names.
		const samples = [...ARG_CHARS].map((c) => [c, `q${c}`, `${c}j`, `q${c}j`]);
		forEachSample(
			{ seed: 1001, count: 100 },
			(r) => r.array(1, 4, () => r.string(ARG_CHARS, 0, 8)),
			(args) => samples.push(args),
		);
		// One shell for every sample. Each line prints its arguments with a NUL after each.
		const script = samples
			.map((args) => `${toCommandLine("printf '%s\\0'", args)}; printf '\\n'`)
			.join('\n');
		// Files in the working dir let a glob that is not quoted expand.
		const cwd = mkdtempSync(path.join(tmpdir(), 'mutate-shell-'));
		try {
			for (const file of ['q', 'j', 'qj']) writeFileSync(path.join(cwd, file), '');
			const res = spawnSync('sh', ['-c', script], { cwd, encoding: 'utf8', timeout: 20_000 });
			assert.equal(res.status, 0, res.stderr);
			const printed = res.stdout.split('\n').slice(0, -1);
			assert.equal(printed.length, samples.length);
			for (const [index, args] of samples.entries()) {
				assert.deepEqual(printed[index].split('\0').slice(0, -1), args, JSON.stringify(args));
			}
		} finally {
			rmSync(cwd, { recursive: true, force: true });
		}
	});
});

describe('scoreFromCounts and coverageFromCounts for any counts', () => {
	const counts = (r) => {
		const c = emptyCounts();
		for (const key of Object.keys(c)) c[key] = r.int(0, 12);
		return c;
	};
	const plus = (c, key) => ({ ...c, [key]: c[key] + 1 });

	it('keeps the score in [0, 100], at 100 only when every valid mutant was detected', () => {
		forEachSample({ seed: 1101 }, counts, (c) => {
			const score = scoreFromCounts(c);
			assert.ok(score >= 0 && score <= 100, String(score));
			const valid = c.killed + c.timeout + c.survived + c.noCoverage;
			assert.equal(score === 100, valid > 0 && c.survived + c.noCoverage === 0);
			assert.equal(score === 0, c.killed + c.timeout === 0);
		});
	});

	it('raises the score only for a detected mutant and lowers it only for a missed one', () => {
		forEachSample({ seed: 1202 }, counts, (c) => {
			const score = scoreFromCounts(c);
			for (const key of ['killed', 'timeout']) assert.ok(scoreFromCounts(plus(c, key)) >= score);
			for (const key of ['survived', 'noCoverage']) {
				assert.ok(scoreFromCounts(plus(c, key)) <= score);
			}
			for (const key of ['ignored', 'compileError', 'runtimeError']) {
				assert.equal(scoreFromCounts(plus(c, key)), score, key);
			}
		});
	});

	it('keeps coverage in [0, 1], and only a mutant that no test ran lowers it', () => {
		forEachSample({ seed: 1303 }, counts, (c) => {
			const coverage = coverageFromCounts(c);
			assert.ok(coverage >= 0 && coverage <= 1, String(coverage));
			assert.ok(coverageFromCounts(plus(c, 'noCoverage')) <= coverage);
			for (const key of ['killed', 'survived', 'timeout', 'runtimeError']) {
				assert.ok(coverageFromCounts(plus(c, key)) >= coverage, key);
			}
			for (const key of ['ignored', 'compileError']) {
				assert.equal(coverageFromCounts(plus(c, key)), coverage, key);
			}
		});
	});
});
