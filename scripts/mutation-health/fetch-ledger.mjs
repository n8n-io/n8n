#!/usr/bin/env node
/**
 * Fetch the live mutation-health ledger from BigQuery via the QA BigQuery
 * API webhook (the canonical read endpoint shared with QBot et al.).
 *
 * Output shape matches what pick-next.mjs expects: { ledger: [ ... ] }
 *
 * Usage:
 *   node scripts/mutation-health/fetch-ledger.mjs --package <pkg-name> [--out <path>]
 *
 * Exit codes:
 *   0 — success, payload written
 *   2 — usage error
 *   3 — fetch failed (network / non-2xx)
 */

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const QA_QUERY_URL = 'https://internal.users.n8n.cloud/webhook/qa-query';

const LEDGER_COLUMNS = [
	'source_file_path',
	'package',
	'last_score',
	'threshold_at_run',
	'last_checked_at',
	'last_checked_sha',
	'status',
	'attempts',
	'mutants_killed',
	'mutants_survived',
	'mutants_no_coverage',
	'mutants_timeout',
].join(', ');

// Strict allowlist for the package name. Defence-in-depth — workflow_dispatch
// already constrains the input, but this script is callable directly so we
// validate before interpolating into SQL. Matches pnpm-workspace conventions
// (alphanumerics, dash, underscore, optional @scope/ prefix).
const PACKAGE_NAME_RE = /^(?:@[a-zA-Z0-9][\w-]*\/)?[a-zA-Z0-9][\w-]*$/;

const args = process.argv.slice(2);
const pkgIdx = args.indexOf('--package');
const outIdx = args.indexOf('--out');
const pkg = pkgIdx >= 0 ? args[pkgIdx + 1] : null;
const out = outIdx >= 0 ? args[outIdx + 1] : null;

if (!pkg) {
	process.stderr.write('Usage: fetch-ledger.mjs --package <pkg-name> [--out <path>]\n');
	process.exit(2);
}
if (!PACKAGE_NAME_RE.test(pkg)) {
	process.stderr.write(`Invalid --package value: ${JSON.stringify(pkg)}\n`);
	process.exit(2);
}

const query =
	`SELECT ${LEDGER_COLUMNS} ` +
	`FROM \`n8n-telemetry.imported_n8n.qa_mutation_health_ledger\` ` +
	`WHERE package = "${pkg}" ` +
	`ORDER BY source_file_path`;

const res = await fetch(QA_QUERY_URL, {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ query }),
});

if (!res.ok) {
	process.stderr.write(`Live ledger fetch failed: HTTP ${res.status}\n${await res.text()}\n`);
	process.exit(3);
}

const rows = await res.json();

// Validate response shape. The qa-query webhook is shared with QBot et al.
// — if its response envelope ever changes (e.g. wraps in {data: [...]}) we
// want to fail loud rather than silently emit an empty ledger.
if (!Array.isArray(rows)) {
	process.stderr.write(
		`Unexpected qa-query response shape (expected array): ${JSON.stringify(rows).slice(0, 200)}\n`,
	);
	process.exit(3);
}
if (rows.length > 0) {
	const required = ['source_file_path', 'package', 'status'];
	const missing = required.filter((k) => !(k in rows[0]));
	if (missing.length > 0) {
		process.stderr.write(`qa-query row missing required keys: ${missing.join(', ')}\n`);
		process.exit(3);
	}
}

const payload = JSON.stringify({ ledger: rows }, null, 2);

if (out) {
	await mkdir(path.dirname(out), { recursive: true });
	await writeFile(out, payload);
	process.stderr.write(`Live ledger: ${rows.length} row(s) → ${out}\n`);
} else {
	process.stdout.write(payload);
}
