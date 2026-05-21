#!/usr/bin/env node
/**
 * Run Stryker on a single source file and emit an actionable summary.
 *
 * Usage:  pnpm --filter=n8n-workflow mutate <relative-path-under-src>
 * Example: pnpm --filter=n8n-workflow mutate src/cron.ts
 *
 * Outputs (under packages/workflow/reports/mutation/):
 *   raw.json      — full Stryker Mutation Testing Elements report
 *   raw.html      — Stryker's HTML report (browse for human review)
 *   summary.json  — compact actionable summary (this script)
 *
 * Exit codes:
 *   0  — mutation score ≥ threshold
 *   1  — score < threshold (AI loop should iterate)
 *   2  — usage / config error
 *   3  — Stryker run failed
 */

import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');

const THRESHOLD = Number(process.env.STRYKER_THRESHOLD ?? 80);

function die(code, msg) {
	process.stderr.write(`${msg}\n`);
	process.exit(code);
}

const targetArg = process.argv[2];
if (!targetArg) {
	die(
		2,
		'Usage: pnpm --filter=n8n-workflow mutate <relative-path-under-src>\n' +
			'Example: pnpm --filter=n8n-workflow mutate src/cron.ts',
	);
}

const target = path.isAbsolute(targetArg) ? path.relative(pkgRoot, targetArg) : targetArg;
if (!target.startsWith('src/') || target.includes('..')) {
	die(2, `Target must be under src/ within this package. Got: ${target}`);
}
if (!existsSync(path.join(pkgRoot, target))) {
	die(2, `Target not found: ${path.join(pkgRoot, target)}`);
}

const reportDir = path.join(pkgRoot, 'reports/mutation');
const rawJsonPath = path.join(reportDir, 'raw.json');
const summaryJsonPath = path.join(reportDir, 'summary.json');

process.stderr.write(`Running Stryker on ${target} (threshold: ${THRESHOLD}%)\n`);

await new Promise((resolve) => {
	const child = spawn('node_modules/.bin/stryker', ['run', '--mutate', target], {
		cwd: pkgRoot,
		stdio: 'inherit',
	});
	child.on('exit', (code) => {
		if (code !== 0) die(3, `Stryker exited with code ${code}`);
		resolve();
	});
	child.on('error', (err) => die(3, `Stryker failed to start: ${err.message}`));
});

if (!existsSync(rawJsonPath)) {
	die(3, `Stryker did not produce ${rawJsonPath}`);
}

const raw = JSON.parse(await readFile(rawJsonPath, 'utf8'));

// Build a test-id → test-name lookup so survivors can name the tests that
// covered the mutated line without killing the mutant.
const testIdToName = {};
for (const info of Object.values(raw.testFiles ?? {})) {
	for (const t of info.tests ?? []) {
		testIdToName[t.id] = t.name;
	}
}

function sliceFromLocation(source, loc) {
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

function scoreFromCounts(c) {
	const detected = c.killed + c.timeout;
	const valid = c.killed + c.timeout + c.survived + c.noCoverage;
	return valid === 0 ? 0 : +((detected / valid) * 100).toFixed(2);
}

const filesSummary = [];
for (const [file, info] of Object.entries(raw.files)) {
	const counts = {
		killed: 0,
		survived: 0,
		noCoverage: 0,
		timeout: 0,
		compileError: 0,
		runtimeError: 0,
		ignored: 0,
	};
	const survivors = [];
	for (const m of info.mutants) {
		switch (m.status) {
			case 'Killed':
				counts.killed++;
				break;
			case 'Survived':
				counts.survived++;
				break;
			case 'NoCoverage':
				counts.noCoverage++;
				break;
			case 'Timeout':
				counts.timeout++;
				break;
			case 'CompileError':
				counts.compileError++;
				break;
			case 'RuntimeError':
				counts.runtimeError++;
				break;
			case 'Ignored':
				counts.ignored++;
				break;
		}
		if (m.status === 'Survived' || m.status === 'NoCoverage') {
			survivors.push({
				id: m.id,
				mutator: m.mutatorName,
				status: m.status,
				location: `${file}:${m.location.start.line}:${m.location.start.column}`,
				line: m.location.start.line,
				original: sliceFromLocation(info.source, m.location),
				replacement: m.replacement,
				coveringTests: (m.coveredBy ?? []).map((id) => testIdToName[id] ?? id),
			});
		}
	}
	survivors.sort((a, b) => a.line - b.line);
	const score = scoreFromCounts(counts);
	filesSummary.push({
		file,
		score,
		thresholdMet: score >= THRESHOLD,
		counts,
		survivors,
	});
}

const overallCounts = filesSummary.reduce(
	(acc, f) => {
		for (const k of Object.keys(acc)) acc[k] += f.counts[k];
		return acc;
	},
	{ killed: 0, survived: 0, noCoverage: 0, timeout: 0, compileError: 0, runtimeError: 0, ignored: 0 },
);

const summary = {
	generatedAt: new Date().toISOString(),
	threshold: THRESHOLD,
	target,
	overall: {
		score: scoreFromCounts(overallCounts),
		counts: overallCounts,
		thresholdMet: scoreFromCounts(overallCounts) >= THRESHOLD,
	},
	files: filesSummary,
};

await writeFile(summaryJsonPath, JSON.stringify(summary, null, 2));

process.stderr.write('\n=== Mutation summary ===\n');
for (const f of filesSummary) {
	const mark = f.thresholdMet ? '✓' : '✗';
	process.stderr.write(
		`${mark} ${f.file}  ${f.score.toFixed(2)}%  ` +
			`(killed ${f.counts.killed} / survived ${f.counts.survived} / no-cov ${f.counts.noCoverage} / timeout ${f.counts.timeout})\n`,
	);
	for (const s of f.survivors) {
		process.stderr.write(`   - ${s.status.toLowerCase().padEnd(10)} ${s.mutator.padEnd(22)} ${s.location}\n`);
	}
}
process.stderr.write(`\nThreshold: ${THRESHOLD}%  •  overall: ${summary.overall.score.toFixed(2)}%\n`);
process.stderr.write(`Summary written: ${summaryJsonPath}\n`);

process.exit(summary.overall.thresholdMet ? 0 : 1);
