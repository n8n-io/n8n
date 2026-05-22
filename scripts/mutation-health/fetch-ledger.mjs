#!/usr/bin/env node
/**
 * Fetch the live mutation-health ledger via the dedicated read webhook.
 *
 * The webhook (n8n workflow "QA: Mutation Health Reader") owns the SQL and
 * BQ credential — this script just makes a GET. No SQL, no allowlist
 * needed client-side (server validates), no shape construction.
 *
 * Output: { ledger: [ ... ] } — the shape pick-next.mjs consumes.
 *
 * Usage:
 *   node scripts/mutation-health/fetch-ledger.mjs --package <pkg-name> [--out <path>]
 *
 * Exit codes:
 *   0 — success, payload written
 *   2 — usage error
 *   3 — fetch failed (network, non-2xx, or unexpected shape)
 */

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const READER_URL = 'https://internal.users.n8n.cloud/webhook/mutation-health-ledger';

const args = process.argv.slice(2);
const pkgIdx = args.indexOf('--package');
const outIdx = args.indexOf('--out');
const pkg = pkgIdx >= 0 ? args[pkgIdx + 1] : null;
const out = outIdx >= 0 ? args[outIdx + 1] : null;

if (!pkg) {
	process.stderr.write('Usage: fetch-ledger.mjs --package <pkg-name> [--out <path>]\n');
	process.exit(2);
}

const url = `${READER_URL}?package=${encodeURIComponent(pkg)}`;
const res = await fetch(url);

if (!res.ok) {
	process.stderr.write(`Live ledger fetch failed: HTTP ${res.status}\n${await res.text()}\n`);
	process.exit(3);
}

const payload = await res.json();

if (!payload || typeof payload !== 'object' || !Array.isArray(payload.ledger)) {
	process.stderr.write(
		`Unexpected reader response shape (expected { ledger: [...] }): ${JSON.stringify(payload).slice(0, 200)}\n`,
	);
	process.exit(3);
}

const rows = payload.ledger;
const text = JSON.stringify({ ledger: rows }, null, 2);

if (out) {
	await mkdir(path.dirname(out), { recursive: true });
	await writeFile(out, text);
	process.stderr.write(`Live ledger: ${rows.length} row(s) → ${out}\n`);
} else {
	process.stdout.write(text);
}
