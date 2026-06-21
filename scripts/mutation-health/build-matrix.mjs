#!/usr/bin/env node
/**
 * Build the nightly mutation-health (package × pass) matrix from one global
 * picker invocation, instead of redeclaring the package list in the workflow.
 *
 * ELIGIBLE_PACKAGES is sourced from `pick-next.mjs` (the picker's single
 * source of truth — DEVP-497), so the nightly setup job never drifts from
 * what the picker walks.
 *
 * Inputs (env):
 *   LEDGER_FILE        Required (unless SOURCE_FILE is set). Read-all live ledger JSON.
 *   REQUESTED_MODE     Optional. 'both' | 'baseline' | 'coverage'. Default 'both'.
 *   TOP_N              Optional. Positive integer. Default 6.
 *   SOURCE_FILE        Optional. Skip picker, emit a single matrix entry for a
 *                      repo-relative file (used by the on-demand re-score path).
 *   SIGNALS_FILE       Optional. Passed to picker as --signals-file.
 *   COVERAGE_FILE      Optional. Passed to picker as --coverage-file.
 *   BOOTSTRAP_PACKAGES Optional. Comma-separated ELIGIBLE_PACKAGES.name list to
 *                      exempt from the divergence guard (use after onboarding
 *                      a new package — its ledger rows don't exist yet). Use
 *                      '*' to acknowledge a genuine cold-start (also allows an
 *                      empty ledger). Empty (default) = strict mode: empty
 *                      ledger AND any per-package divergence both throw.
 *
 * Output (stdout): exactly one line, `matrix=<json>`, suitable for appending
 * to $GITHUB_OUTPUT. `<json>` matches GHA matrix shape: { include: [...] }.
 * The picker's global mode returns an array; this script branches on that
 * shape so a future per-package fallback in the picker stays compatible.
 *
 * Each matrix row exposes:
 *   name         workspace package name      (e.g. n8n-workflow)
 *   dir          repo-relative package dir   (e.g. packages/workflow)
 *   slug         short package slug          (e.g. workflow)
 *   mode         baseline | coverage | file  (preserves the original
 *                                              concurrency-group key shape)
 *   source_file  repo-relative .ts to mutate
 *   file_slug    artefact-safe slug derived from `source_file` — keeps the
 *                upload-artifact name unique when multiple top-N picks share
 *                the same (mode, slug) pair
 *
 * Exit codes:
 *   0 — wrote a matrix line (include[] may be empty when picker has no work)
 *   2 — usage / config error, ledger divergence, or picker spawn failure
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseLedgerBody } from './ledger.mjs';
import { ELIGIBLE_PACKAGES } from './pick-next.mjs';

function die(code, msg) {
	process.stderr.write(`${msg}\n`);
	process.exit(code);
}

export function slugForPackage(pkg) {
	return pkg.dir.split('/').pop();
}

export function fileSlug(repoRelPath) {
	return repoRelPath
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function modeForEffectiveStatus(effectiveStatus) {
	if (effectiveStatus === 'new') return 'baseline';
	if (effectiveStatus === 'red' || effectiveStatus === 'stale') return 'coverage';
	throw new Error(`Cannot map effective_status="${effectiveStatus}" to a matrix mode`);
}

export function findPackageForSourceFile(sourceFile, eligible = ELIGIBLE_PACKAGES) {
	return eligible.find((p) => sourceFile.startsWith(`${p.dir}/`));
}

/**
 * Die-loud guard against `ELIGIBLE_PACKAGES.name` ↔ ledger `.package`
 * divergence and against silently re-baselining the whole tree on a
 * transient/degraded read.
 *
 * Strict mode (`allowEmptyLedger: false`, empty `skipPackages`):
 *   - Empty ledger throws — a `200` from the reader with `[]` (BQ hiccup,
 *     degraded fetch) would otherwise look identical to "every file is new"
 *     and re-baseline the whole eligible tree in one night.
 *   - For each eligible package, fewer than one non-`new` row throws — the
 *     stored ledger only ever holds `red`/`green` rows (`new` is synthesised
 *     by the picker at pick time and never written), so "zero prior-status
 *     rows for an eligible package in a non-empty ledger" is the signature
 *     of an ELIGIBLE_PACKAGES.name ↔ ledger.package mismatch.
 *
 * Escape hatch (operator-driven via the workflow_dispatch
 * `bootstrap_packages` input):
 *   - `allowEmptyLedger: true` is the genuine cold-start acknowledgement.
 *   - Packages in `skipPackages` are exempt from the divergence check —
 *     used after onboarding a new entry to ELIGIBLE_PACKAGES (its rows
 *     don't exist yet) so the first nightly can populate them. Subsequent
 *     scheduled nightlies revert to strict mode.
 */
export function assertNoLedgerDivergence(
	ledgerRows,
	eligible = ELIGIBLE_PACKAGES,
	{ allowEmptyLedger = false, skipPackages = [] } = {},
) {
	if (!Array.isArray(ledgerRows) || ledgerRows.length === 0) {
		if (allowEmptyLedger) return;
		throw new Error(
			'Ledger divergence: read-all ledger is empty. Either the reader webhook ' +
				'returned [] for an unexpected reason (BQ hiccup / degraded fetch) and the ' +
				'whole eligible tree would be silently re-baselined, or this is a genuine ' +
				"cold start. Re-run with workflow_dispatch input `bootstrap_packages: '*'` " +
				'to acknowledge the cold start; otherwise investigate the reader webhook.',
		);
	}
	const skip = new Set(skipPackages);
	for (const pkg of eligible) {
		if (skip.has(pkg.name)) continue;
		const priorHits = ledgerRows.filter(
			(r) => r && r.package === pkg.name && r.status && r.status !== 'new',
		);
		if (priorHits.length === 0) {
			throw new Error(
				`Ledger divergence: read-all ledger has ${ledgerRows.length} row(s) but zero ` +
					`prior-status (non-"new") rows for eligible package "${pkg.name}". ` +
					'If this is a newly-onboarded package, re-run with workflow_dispatch input ' +
					`\`bootstrap_packages: "${pkg.name}"\` to skip the guard once. Otherwise, ` +
					'suspected ELIGIBLE_PACKAGES.name ↔ ledger.package mismatch — refusing to ' +
					'silently re-baseline the package. Verify the package name and ledger contents.',
			);
		}
	}
}

export function buildMatrixRowForFile(sourceFile, eligible = ELIGIBLE_PACKAGES) {
	const pkg = findPackageForSourceFile(sourceFile, eligible);
	if (!pkg) throw new Error(`No mutation-tracked package owns ${sourceFile}`);
	return {
		name: pkg.name,
		dir: pkg.dir,
		slug: slugForPackage(pkg),
		mode: 'file',
		source_file: sourceFile,
		file_slug: fileSlug(sourceFile),
	};
}

export function buildMatrixFromPicked(pickedRows, eligible = ELIGIBLE_PACKAGES) {
	if (!Array.isArray(pickedRows)) {
		throw new Error('Picker output is not an array — expected global-mode shape `{ picked: [...] }`');
	}
	return {
		include: pickedRows.map((row) => {
			const pkg = eligible.find((p) => p.name === row.package);
			if (!pkg) {
				throw new Error(
					`Picker returned package "${row.package}" which is not in ELIGIBLE_PACKAGES — refusing to schedule a mutate job for an unknown package`,
				);
			}
			return {
				name: pkg.name,
				dir: pkg.dir,
				slug: slugForPackage(pkg),
				mode: modeForEffectiveStatus(row.effective_status),
				source_file: row.source_file_path,
				file_slug: fileSlug(row.source_file_path),
			};
		}),
	};
}

function readLedgerRows(ledgerFile) {
	if (!ledgerFile) die(2, 'Missing required LEDGER_FILE env var');
	if (!existsSync(ledgerFile)) die(2, `Ledger file not found: ${ledgerFile}`);
	try {
		return parseLedgerBody(readFileSync(ledgerFile, 'utf8')).rows;
	} catch (err) {
		die(2, `Failed to read ledger at ${ledgerFile}: ${err.message}`);
		return [];
	}
}

function runPicker({ ledgerFile, requestedMode, topN, signalsFile, coverageFile }) {
	const here = path.dirname(fileURLToPath(import.meta.url));
	const pickerPath = path.join(here, 'pick-next.mjs');
	const args = [pickerPath, '--global', '--top-n', String(topN), '--ledger-file', ledgerFile];
	if (requestedMode === 'baseline' || requestedMode === 'coverage') {
		args.push('--mode', requestedMode);
	}
	if (signalsFile) args.push('--signals-file', signalsFile);
	if (coverageFile) args.push('--coverage-file', coverageFile);

	const res = spawnSync(process.execPath, args, { encoding: 'utf8' });
	if (res.error) die(2, `Failed to spawn picker: ${res.error.message}`);
	if (res.stderr) process.stderr.write(res.stderr);
	if (res.status !== 0) die(res.status ?? 2, `Picker exited with status ${res.status}`);
	try {
		return JSON.parse(res.stdout);
	} catch (err) {
		die(2, `Failed to parse picker output as JSON: ${err.message}\nstdout: ${res.stdout}`);
		return null;
	}
}

const isCli = import.meta.url === `file://${process.argv[1]}`;
if (isCli) {
	const sourceFile = (process.env.SOURCE_FILE ?? '').trim();
	const requestedMode = (process.env.REQUESTED_MODE ?? 'both').trim() || 'both';
	const topNRaw = (process.env.TOP_N ?? '6').trim() || '6';
	const ledgerFile = (process.env.LEDGER_FILE ?? '').trim();
	const signalsFile = (process.env.SIGNALS_FILE ?? '').trim();
	const coverageFile = (process.env.COVERAGE_FILE ?? '').trim();

	if (sourceFile) {
		try {
			const row = buildMatrixRowForFile(sourceFile);
			process.stdout.write(`matrix=${JSON.stringify({ include: [row] })}\n`);
			process.exit(0);
		} catch (err) {
			die(2, err.message);
		}
	}

	if (!['both', 'baseline', 'coverage'].includes(requestedMode)) {
		die(2, `Invalid REQUESTED_MODE="${requestedMode}". Use 'both', 'baseline', or 'coverage'.`);
	}

	const topN = Number(topNRaw);
	if (!Number.isInteger(topN) || topN <= 0) {
		die(2, `Invalid TOP_N="${topNRaw}" (expected positive integer).`);
	}

	const bootstrapRaw = (process.env.BOOTSTRAP_PACKAGES ?? '').trim();
	const bootstrapWildcard = bootstrapRaw === '*';
	const skipPackages = bootstrapWildcard
		? ELIGIBLE_PACKAGES.map((p) => p.name)
		: bootstrapRaw
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
	const allowEmptyLedger = bootstrapWildcard;

	const ledgerRows = readLedgerRows(ledgerFile);
	try {
		assertNoLedgerDivergence(ledgerRows, ELIGIBLE_PACKAGES, {
			allowEmptyLedger,
			skipPackages,
		});
	} catch (err) {
		die(2, err.message);
	}

	const pickerOutput = runPicker({
		ledgerFile,
		requestedMode,
		topN,
		signalsFile,
		coverageFile,
	});

	const pickedRows = Array.isArray(pickerOutput?.picked) ? pickerOutput.picked : [];
	try {
		const matrix = buildMatrixFromPicked(pickedRows);
		process.stdout.write(`matrix=${JSON.stringify(matrix)}\n`);
	} catch (err) {
		die(2, err.message);
	}
}
