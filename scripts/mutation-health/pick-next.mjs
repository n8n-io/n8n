#!/usr/bin/env node
/**
 * Read a ledger snapshot, apply staleness rules, return the next pair to mutate.
 *
 * Priority: new → red → stale → skip green
 * Tiebreaker within priority:
 *   - new:  alphabetical by test_file_path (deterministic)
 *   - red/stale/green: oldest last_checked_at first (so we cycle)
 *
 * Staleness rules (applied in memory at pick time, not written back):
 *   - source file edited since last_checked_sha → stale
 *   - test file edited since last_checked_sha → stale
 *   - last_checked_at > MAX_AGE_WEEKS old, no edits → stale
 *
 * Input:  ledger JSON via --ledger-file <path> or STDIN.
 *         Same shape as seed-ledger.mjs / emit-payload.mjs output:
 *         { "ledger": [ { test_file_path, source_file_path, ... } ] }
 *
 * Output: single ledger row to STDOUT as JSON. Human-readable rationale on STDERR.
 *
 * Exit codes:
 *   0 — picked a row
 *   1 — nothing to do (ledger empty, or every row is green and unchanged)
 *   2 — usage / config error
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

function die(code, msg) {
	process.stderr.write(`${msg}\n`);
	process.exit(code);
}

function parseArgs(argv) {
	const out = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (!a.startsWith('--')) continue;
		const key = a.slice(2);
		const next = argv[i + 1];
		if (next === undefined || next.startsWith('--')) {
			out[key] = true;
		} else {
			out[key] = next;
			i++;
		}
	}
	return out;
}

const args = parseArgs(process.argv.slice(2));
const MAX_AGE_WEEKS = Number(args['max-age-weeks'] ?? 8);
const repoRoot = path.resolve(
	args.repo ??
		execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim(),
);

async function readStdin() {
	const chunks = [];
	for await (const chunk of process.stdin) chunks.push(chunk);
	return Buffer.concat(chunks).toString('utf8');
}

let raw;
if (args['ledger-file']) {
	const ledgerPath = path.isAbsolute(args['ledger-file'])
		? args['ledger-file']
		: path.join(process.cwd(), args['ledger-file']);
	if (!existsSync(ledgerPath)) die(2, `Ledger file not found: ${ledgerPath}`);
	raw = await readFile(ledgerPath, 'utf8');
} else {
	if (process.stdin.isTTY) {
		die(2, 'No --ledger-file <path> and STDIN is a TTY. Pipe ledger JSON in or use --ledger-file.');
	}
	raw = await readStdin();
}

const payload = JSON.parse(raw);
const ledger = payload.ledger;
if (!Array.isArray(ledger)) die(2, 'Ledger payload missing `ledger` array.');
if (ledger.length === 0) {
	process.stderr.write('Ledger empty — nothing to pick.\n');
	process.exit(1);
}

/**
 * Returns true if `git log <since>..HEAD -- <files...>` is non-empty.
 * If `since` is null/undefined or invalid, treats as "edited" only if file exists.
 */
function fileEditedSince(sinceSha, files) {
	if (!sinceSha) return false;
	try {
		const out = execFileSync(
			'git',
			['log', '--name-only', '--pretty=format:', `${sinceSha}..HEAD`, '--', ...files],
			{ cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
		);
		return out.trim().length > 0;
	} catch {
		// Bad SHA or git error — treat as "yes, stale-ish, recheck"
		return true;
	}
}

const NOW = Date.now();
const MAX_AGE_MS = MAX_AGE_WEEKS * 7 * 24 * 60 * 60 * 1000;

function computeEffectiveStatus(row) {
	if (row.status === 'new') return 'new';
	const edited = fileEditedSince(row.last_checked_sha, [row.test_file_path, row.source_file_path]);
	if (edited) return 'stale';
	if (row.last_checked_at) {
		const age = NOW - Date.parse(row.last_checked_at);
		if (age > MAX_AGE_MS) return 'stale';
	}
	return row.status; // green or red unchanged
}

const PRIORITY = { new: 0, red: 1, stale: 2, green: 3 };

const annotated = ledger.map((row) => ({ ...row, effective_status: computeEffectiveStatus(row) }));

annotated.sort((a, b) => {
	const pa = PRIORITY[a.effective_status] ?? 99;
	const pb = PRIORITY[b.effective_status] ?? 99;
	if (pa !== pb) return pa - pb;
	// tiebreak
	if (a.effective_status === 'new') {
		return a.test_file_path.localeCompare(b.test_file_path);
	}
	// oldest last_checked_at first
	const ta = a.last_checked_at ? Date.parse(a.last_checked_at) : 0;
	const tb = b.last_checked_at ? Date.parse(b.last_checked_at) : 0;
	return ta - tb;
});

const top = annotated[0];
if (top.effective_status === 'green') {
	process.stderr.write('All rows are green and unchanged — nothing to do.\n');
	process.exit(1);
}

const counts = annotated.reduce((acc, r) => {
	acc[r.effective_status] = (acc[r.effective_status] ?? 0) + 1;
	return acc;
}, {});

process.stderr.write(
	`Ledger: ${ledger.length} rows  •  ` +
		`new=${counts.new ?? 0} red=${counts.red ?? 0} stale=${counts.stale ?? 0} green=${counts.green ?? 0}\n`,
);
process.stderr.write(
	`Picked: ${top.test_file_path} → ${top.source_file_path}\n` +
		`        priority=${top.effective_status}  ` +
		`(was ${top.status}, last_checked_at=${top.last_checked_at ?? 'never'})\n`,
);

const picked = {
	test_file_path: top.test_file_path,
	source_file_path: top.source_file_path,
	package: top.package,
	prior_status: top.status,
	effective_status: top.effective_status,
};

process.stdout.write(JSON.stringify(picked) + '\n');
