#!/usr/bin/env node
/**
 * Read a ledger snapshot, return the next pair to mutate.
 *
 * Stored statuses: new | red | green
 * Effective statuses (computed at pick time): new | red | stale | green
 *
 * Picker priority: new → red → stale → skip green
 * Tiebreaks within each bucket:
 *   - new:    alphabetical by source_file_path (deterministic; rows exit
 *             as they're scored)
 *   - red:    lowest score first (focus on weakest tests)
 *   - stale:  oldest last_checked_at first (natural cycling)
 *
 * "Stale" is an in-memory promotion of green rows older than
 * STALE_AFTER_WEEKS (default 4). It is not stored — the ledger keeps three
 * statuses and the picker derives stale from age alone. No git involvement.
 *
 * Input:  ledger JSON via --ledger-file <path> or STDIN.
 *         { "ledger": [ { source_file_path, package, ... } ] }
 *
 * Output (stdout): { picked: { source_file_path, package, prior_status, effective_status } }
 *                  OR { picked: null, reason: "all-green" } if nothing actionable.
 *
 * Exit codes:
 *   0 — picked a row OR all-green (with picked: null sentinel)
 *   2 — usage / config error
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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
const STALE_AFTER_WEEKS = Number(args['stale-after-weeks'] ?? 4);

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
	process.stdout.write(JSON.stringify({ picked: null, reason: 'empty-ledger' }) + '\n');
	process.exit(0);
}

const NOW = Date.now();
const STALE_AFTER_MS = STALE_AFTER_WEEKS * 7 * 24 * 60 * 60 * 1000;

function computeEffectiveStatus(row) {
	if (row.status === 'new') return 'new';
	if (row.status === 'red') return 'red';
	// status === 'green' — promote to 'stale' if old enough
	if (row.last_checked_at) {
		const age = NOW - Date.parse(row.last_checked_at);
		if (age > STALE_AFTER_MS) return 'stale';
	}
	return 'green';
}

const PRIORITY = { new: 0, red: 1, stale: 2, green: 3 };

const annotated = ledger.map((row) => ({ ...row, effective_status: computeEffectiveStatus(row) }));

annotated.sort((a, b) => {
	const pa = PRIORITY[a.effective_status] ?? 99;
	const pb = PRIORITY[b.effective_status] ?? 99;
	if (pa !== pb) return pa - pb;

	if (a.effective_status === 'new') {
		return a.source_file_path.localeCompare(b.source_file_path);
	}

	if (a.effective_status === 'red') {
		const sa = a.last_score == null ? Infinity : Number(a.last_score);
		const sb = b.last_score == null ? Infinity : Number(b.last_score);
		if (sa !== sb) return sa - sb;
		return a.source_file_path.localeCompare(b.source_file_path);
	}

	// stale: oldest last_checked_at first
	const ta = a.last_checked_at ? Date.parse(a.last_checked_at) : 0;
	const tb = b.last_checked_at ? Date.parse(b.last_checked_at) : 0;
	if (ta !== tb) return ta - tb;
	return a.source_file_path.localeCompare(b.source_file_path);
});

const counts = annotated.reduce((acc, r) => {
	acc[r.effective_status] = (acc[r.effective_status] ?? 0) + 1;
	return acc;
}, {});

process.stderr.write(
	`Ledger: ${ledger.length} rows  •  ` +
		`new=${counts.new ?? 0} red=${counts.red ?? 0} stale=${counts.stale ?? 0} green=${counts.green ?? 0}\n`,
);

const top = annotated[0];

if (top.effective_status === 'green') {
	process.stderr.write(`All actionable rows green (stale threshold ${STALE_AFTER_WEEKS} weeks) — nothing to do.\n`);
	process.stdout.write(JSON.stringify({ picked: null, reason: 'all-green' }) + '\n');
	process.exit(0);
}

process.stderr.write(
	`Picked: ${top.source_file_path}\n` +
		`        priority=${top.effective_status}  ` +
		`(was ${top.status}, last_checked_at=${top.last_checked_at ?? 'never'})\n`,
);

process.stdout.write(
	JSON.stringify({
		picked: {
			source_file_path: top.source_file_path,
			package: top.package,
			prior_status: top.status,
			effective_status: top.effective_status,
		},
	}) + '\n',
);
