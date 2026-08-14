#!/usr/bin/env node
/**
 * Ratchet guard for `turbo boundaries` (structural checks: undeclared deps and
 * reach-in imports). The repo has a large backlog of pre-existing issues, so we
 * cannot gate on zero. Instead we fail only when the issue count grows above the
 * committed baseline — new code stays clean, the backlog burns down over time.
 *
 * Mirrors the incremental-cleanup approach already used by the Playwright
 * janitor (`.janitor-baseline.json`). Baseline is updated manually after real
 * fixes, never automatically.
 *
 * The baseline is the POST-BUILD count: CI's lint job builds dependencies before
 * this check runs, and built dist trees surface ~8 extra issues that a cold
 * checkout doesn't. Run `pnpm build` before `pnpm boundaries:baseline`, or CI
 * will read a higher count than you saw locally.
 *
 * ponytail: parses turbo's "N issues found" line — the ratchet is a single
 * number, not a per-issue snapshot, so it can't tell a fixed issue from a new
 * one at the same count. Upgrade to a fingerprinted baseline if that matters.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const write = process.argv.includes('--write');
const baselineFile = join(dirname(fileURLToPath(import.meta.url)), '..', '.boundaries-baseline.json');
const baseline = JSON.parse(readFileSync(baselineFile, 'utf8')).issues;

// turbo exits non-zero when issues exist; we read the output regardless.
const result = spawnSync('pnpm', ['turbo', 'boundaries'], { encoding: 'utf8' });
const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
const match = output.match(/(\d+) issues found/);

if (!match) {
	console.error('Could not parse `turbo boundaries` output. Raw output:\n' + output);
	process.exit(2);
}

// `@nodes-testing/*` is a tsconfig path alias into packages/core/nodes-testing
// (NodeTestHarness) — the sanctioned way to write node workflow tests, so every
// new suite would otherwise ratchet the count up. Exempt the class; turbo's
// `implicitDependencies` only covers undeclared-package issues, not path leaves.
const exempted = (output.match(/import `@nodes-testing\/[^`]+` leaves the package/g) ?? []).length;
const current = Number(match[1]) - exempted;

if (write) {
	writeFileSync(baselineFile, JSON.stringify({ issues: current }, null, 2) + '\n');
	console.log(`Wrote baseline: ${current} issues (was ${baseline}).`);
	process.exit(0);
}

console.log(
	`turbo boundaries: ${current} issues (baseline ${baseline}, ${exempted} node-test-harness imports exempted)`,
);

if (current > baseline) {
	console.error(
		`\nBoundaries regressed: ${current} issues, baseline is ${baseline}.\n` +
			'Your change added undeclared-dependency or reach-in import violations.\n' +
			'Declare the missing dependency in the package.json, or import from the package root.\n' +
			'Offending imports:\n\n' +
			output +
			'\nRe-check with `pnpm boundaries`.',
	);
	process.exit(1);
}

if (current < baseline) {
	console.log(
		`\nNice — ${baseline - current} fewer issues than baseline.\n` +
			'Run `pnpm boundaries:baseline` to lock in the win.',
	);
}

process.exit(0);
