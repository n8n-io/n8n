/**
 * Scoring, the gate and the summary that mutate.mjs writes. Pure: no I/O and
 * no process state, so the unit tests can drive every rule directly.
 */

// Stryker's mutant statuses and the count each one goes to.
const STATUS_COUNT = {
	Killed: 'killed',
	Survived: 'survived',
	NoCoverage: 'noCoverage',
	Timeout: 'timeout',
	CompileError: 'compileError',
	RuntimeError: 'runtimeError',
	Ignored: 'ignored',
};

export function emptyCounts() {
	return {
		killed: 0,
		survived: 0,
		noCoverage: 0,
		timeout: 0,
		compileError: 0,
		runtimeError: 0,
		ignored: 0,
	};
}

export function sliceFromLocation(source, loc) {
	const lines = source.split('\n');
	const { start, end } = loc;
	if (start.line === end.line) {
		return lines[start.line - 1].slice(start.column, end.column);
	}
	return [
		lines[start.line - 1].slice(start.column),
		...lines.slice(start.line, end.line - 1),
		lines[end.line - 1].slice(0, end.column),
	].join('\n');
}

export function scoreFromCounts(c) {
	const detected = c.killed + c.timeout;
	const valid = c.killed + c.timeout + c.survived + c.noCoverage;
	return valid === 0 ? 0 : +((detected / valid) * 100).toFixed(2);
}

/**
 * Per-file line-coverage proxy distilled from the mutant census: the fraction
 * of mutants a test actually exercised (anything that ran) over those that
 * could be covered (ran + no-coverage). Ignored and compile-error mutants
 * never ran for reasons unrelated to coverage, so they sit outside the ratio.
 *
 * Returns a fraction in [0,1]. The result is clamped.
 */
export function coverageFromCounts(c) {
	const covered = (c.killed ?? 0) + (c.survived ?? 0) + (c.timeout ?? 0) + (c.runtimeError ?? 0);
	const total = covered + (c.noCoverage ?? 0);
	if (total === 0) return 0;
	return +Math.min(1, Math.max(0, covered / total)).toFixed(4);
}

// Stryker says this when the vitest runner finds no test. Vitest itself says
// the second one when a test command matches no test file.
const NO_TESTS_OUTPUT = /no tests were executed|no test files found/i;

/**
 * What a finished Stryker run produced. `hasReport` must describe THIS run:
 * the caller deletes the previous reports first, because a file left by an
 * earlier run makes a crashed run look complete and report the earlier target.
 *
 *   complete  — the run finished and wrote a report.
 *   partial   — the run wrote a report, then exited non-zero. Untested mutants
 *               can still be survivors, so this never passes the gate.
 *   no-tests  — no test covers the target. A result, not an error: the score is
 *               zero and every mutant has no coverage. See DEVP-414.
 *   failed    — no report. The caller reports a toolchain failure.
 */
export function classifyRun({ exitCode, output, hasReport }) {
	if (!hasReport) {
		return NO_TESTS_OUTPUT.test(output) ? 'no-tests' : 'failed';
	}
	return exitCode === 0 ? 'complete' : 'partial';
}

// A run is only "passing" when the score meets the floor AND every unkilled
// mutant has been explicitly justified (Ignored via a Stryker disable
// comment). Any Survived/NoCoverage mutant is unjustified by definition.
export function gatePassed(score, counts, threshold) {
	return score >= threshold && counts.survived === 0 && counts.noCoverage === 0;
}

// Test id to test name, so a survivor can name the tests that ran the mutated
// line without killing the mutant.
function testNamesById(raw) {
	const names = {};
	for (const info of Object.values(raw.testFiles ?? {})) {
		for (const t of info.tests ?? []) names[t.id] = t.name;
	}
	return names;
}

function mutantLocation(file, m) {
	return `${file}:${m.location.start.line}:${m.location.start.column}`;
}

function survivorRow(file, source, m, testNames) {
	return {
		id: m.id,
		mutator: m.mutatorName,
		status: m.status,
		location: mutantLocation(file, m),
		line: m.location.start.line,
		original: sliceFromLocation(source, m.location),
		replacement: m.replacement,
		// The command runner reports no per-test coverage, so this can be empty.
		coveringTests: (m.coveredBy ?? []).map((id) => testNames[id] ?? id),
	};
}

function ignoredRow(file, m) {
	return {
		id: m.id,
		mutator: m.mutatorName,
		location: mutantLocation(file, m),
		line: m.location.start.line,
		reason: m.statusReason ?? '',
	};
}

function summariseFile(file, info, { threshold, testNames }) {
	const counts = emptyCounts();
	const survivors = [];
	const ignored = [];
	for (const m of info.mutants) {
		const key = STATUS_COUNT[m.status];
		if (key) counts[key]++;
		if (m.status === 'Survived' || m.status === 'NoCoverage') {
			survivors.push(survivorRow(file, info.source, m, testNames));
		}
		if (m.status === 'Ignored') ignored.push(ignoredRow(file, m));
	}
	survivors.sort((a, b) => a.line - b.line);
	ignored.sort((a, b) => a.line - b.line);
	const score = scoreFromCounts(counts);
	return {
		file,
		score,
		coverage: coverageFromCounts(counts),
		thresholdMet: gatePassed(score, counts, threshold),
		counts,
		survivors,
		ignored,
	};
}

function sumCounts(rows) {
	return rows.reduce((acc, row) => {
		for (const k of Object.keys(acc)) acc[k] += row.counts[k];
		return acc;
	}, emptyCounts());
}

/**
 * Build the compact summary from a raw Stryker Mutation Testing Elements
 * report. Pure: takes the parsed report plus run metadata, returns the summary
 * object written to summary.json. `testRunner` records which Stryker runner
 * scored the run, because the command runner measures no coverage.
 */
export function buildSummary(raw, { threshold, target, generatedAt, testRunner }) {
	const testNames = testNamesById(raw);
	const files = Object.entries(raw.files).map(([file, info]) =>
		summariseFile(file, info, { threshold, testNames }),
	);
	const counts = sumCounts(files);
	const score = scoreFromCounts(counts);
	return {
		generatedAt,
		threshold,
		target,
		...(testRunner ? { testRunner } : {}),
		overall: {
			score,
			coverage: coverageFromCounts(counts),
			counts,
			thresholdMet: gatePassed(score, counts, threshold),
		},
		files,
	};
}

/**
 * Synthesise a score-0 red summary for the "No tests were executed" case —
 * every mutant is no-coverage, so coverage is 0 too. See DEVP-414.
 */
export function buildNoTestsSummary({ threshold, target, noCoverage, generatedAt }) {
	const counts = { ...emptyCounts(), noCoverage };
	const coverage = coverageFromCounts(counts);
	return {
		generatedAt,
		threshold,
		target,
		overall: { score: 0, coverage, counts, thresholdMet: false },
		files: [
			{
				file: target,
				score: 0,
				coverage,
				thresholdMet: false,
				counts,
				survivors: [],
				ignored: [],
			},
		],
	};
}

// Stryker prints the mutant count before it runs a test. A no-tests run has no
// report, so this line is the only count there is.
export function mutantCountFromOutput(output) {
	const match = /Instrumented\s+\d+\s+source file\(s\)\s+with\s+(\d+)\s+mutant/i.exec(output);
	return match ? Number(match[1]) : 0;
}

/**
 * The gate over every package run. A partial run never passes: the mutants it
 * did not test can be survivors.
 */
export function overallGate(summaries) {
	return summaries.reduce(
		(acc, summary) => {
			const c = summary.overall.counts;
			acc.survived += c.survived + c.noCoverage;
			acc.ignored += c.ignored;
			acc.passed &&= summary.overall.thresholdMet && !summary.partial;
			acc.partial ||= Boolean(summary.partial);
			return acc;
		},
		{ survived: 0, ignored: 0, passed: true, partial: false },
	);
}

function fileLine(f, testRunner) {
	const mark = f.thresholdMet ? '✓' : '✗';
	// The command runner runs every test for every mutant, so it measures no coverage.
	const coverage = testRunner === 'command' ? 'n/a' : `${(f.coverage * 100).toFixed(0)}%`;
	const c = f.counts;
	return (
		`${mark} ${f.file}  ${f.score.toFixed(2)}%  cov ${coverage}  ` +
		`(killed ${c.killed} / survived ${c.survived} / no-cov ${c.noCoverage} / timeout ${c.timeout} / ignored ${c.ignored})`
	);
}

function fileDetailLines(f, testRunner) {
	const survivors = f.survivors.map(
		(s) => `   - ${s.status.toLowerCase().padEnd(10)} ${s.mutator.padEnd(22)} ${s.location}`,
	);
	const ignored = f.ignored.map(
		(ig) =>
			`   · ${'ignored'.padEnd(10)} ${ig.mutator.padEnd(22)} ${ig.location}` +
			`${ig.reason ? ` — ${ig.reason}` : ' — (no reason given)'}`,
	);
	return [fileLine(f, testRunner), ...survivors, ...ignored];
}

/**
 * The lines the summary prints for one package run. `summaryPath` is the
 * repo-relative path of its summary.json.
 */
export function reportLines({ packageDir, summaryPath, summary, noTests, failed }) {
	if (failed) return [];
	if (noTests) {
		return [
			`✗ ${packageDir} ${summary.target}  0.00%  (no covering tests — recorded as score-0 red)`,
			`  summary: ${summaryPath}`,
		];
	}
	const partial = summary.partial
		? [
				`⚠ ${packageDir}: Stryker exited non-zero; summary built from a partial raw.json — ` +
					'results may be incomplete.',
			]
		: [];
	const files = summary.files.flatMap((f) => fileDetailLines(f, summary.testRunner));
	return [...partial, ...files, `  summary: ${summaryPath}`];
}
