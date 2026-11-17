// Replays the recorded `sql` calls of the Postgres library node against `wfrt`
// and a real database, and compares each result with the recorded result of the
// TypeScript reference client.
//
//   node bench/pg-replay/replay.mts [--wfrt zig-out/bin/wfrt] [--port 18455] [--only <part of a case name>]
//
// The database is `PG_TEST_HOST`:`PG_TEST_PORT` (default 127.0.0.1:5544), user
// `PG_TEST_USER`, password `PG_TEST_PASSWORD`, database `PG_REPLAY_DATABASE`
// (default `wfrt_replay`; the script makes it). Each case starts from the tables of
// `POSTGRES_SETUP`, as the equivalence test does. The script changes nothing in `packages/`.
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const runtime = join(here, '../..');
const lang = join(runtime, '../packages/@n8n/workflow-lang');
const tests = join(lang, 'src/nodes/__tests__');

function flag(name: string, fallback: string): string {
	const at = process.argv.indexOf(`--${name}`);
	return at > 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1] : fallback;
}

const wfrt = flag('wfrt', join(runtime, 'zig-out/bin/wfrt'));
const port = Number(flag('port', '18455'));
const only = flag('only', '');

const { POSTGRES_CASES, POSTGRES_SETUP, POSTGRES_STATE } = await import(
	join(tests, 'postgres-cases.ts')
);
const { runTexts } = await import(join(tests, 'sql-reference.ts'));
const recordings = JSON.parse(readFileSync(join(tests, 'postgres-recordings.json'), 'utf8'));

const credential = {
	host: process.env.PG_TEST_HOST ?? '127.0.0.1',
	port: Number(process.env.PG_TEST_PORT ?? 5544),
	database: process.env.PG_REPLAY_DATABASE ?? 'wfrt_replay',
	user: process.env.PG_TEST_USER ?? 'postgres',
	password: process.env.PG_TEST_PASSWORD ?? 'cardpg',
	ssl: 'disable',
	maxConnections: 100,
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** As the equivalence test: without the place of an error in the source of the server. */
function withoutSourcePlace(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(withoutSourcePlace);
	if (!isRecord(value)) return value;
	const out: Record<string, unknown> = {};
	for (const [key, member] of Object.entries(value)) {
		const place = key === 'file' || key === 'line' || key === 'routine';
		if (!(place && typeof value.message === 'string')) out[key] = withoutSourcePlace(member);
	}
	return out;
}

/**
 * The text of a result for the comparison. The keys of a row keep their order (the
 * order of the columns); the keys of each other object are sorted, because the order
 * of `rows`, `command` and `rowCount` in an entry means nothing.
 */
function canonical(value: unknown, row = false): string {
	if (Array.isArray(value)) return `[${value.map((v) => canonical(v, row)).join(',')}]`;
	if (!isRecord(value)) return JSON.stringify(value);
	if (row) return JSON.stringify(value);
	const keys = Object.keys(value).sort();
	return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(value[k], k === 'rows')}`).join(',')}}`;
}

function markerOf(value: unknown): string | undefined {
	if (!isRecord(value) || typeof value.$error !== 'string') return undefined;
	return /\(limit: [a-z-]+\)/.exec(value.$error)?.[0] ?? 'no marker';
}

/** The credential slot of the forward workflow for a case. */
function slotOf(override: Record<string, unknown> | undefined): string {
	if (override?.port !== undefined) return 'badport';
	if (override?.password !== undefined) return 'badpass';
	return 'db';
}

await runTexts({ ...credential, database: 'postgres' }, [
	`CREATE DATABASE ${credential.database}`,
]);

const dir = mkdtempSync(join(tmpdir(), 'pg-replay-'));
execFileSync(
	'node',
	[join(lang, 'src/cli.ts'), 'compile', join(here, 'workflow.ts'), '-o', join(dir, 'out')],
	{ stdio: 'ignore' },
);
const slots: Record<string, unknown> = { db: { type: 'postgres', data: credential } };
for (const c of POSTGRES_CASES) {
	if (c.credential) slots[slotOf(c.credential)] = { type: 'postgres', data: { ...credential, ...c.credential } };
}
for (const name of ['badport', 'badpass']) slots[name] ??= slots.db;
writeFileSync(join(dir, 'creds.json'), JSON.stringify(slots));

const server = spawn(
	wfrt,
	[
		'serve',
		...['--port', String(port), '--log-dir', join(dir, 'log'), '--credentials', join(dir, 'creds.json')],
		...['--sql-timestamp-zone', 'utc', '--module', join(dir, 'out/workflow.wfm'), '--route', 'POST /replay'],
	],
	{ stdio: ['ignore', 'ignore', 'inherit'] },
);

async function post(body: unknown): Promise<unknown> {
	const response = await fetch(`http://127.0.0.1:${port}/replay`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	});
	const text = await response.text();
	try {
		return JSON.parse(text);
	} catch {
		return { $http: response.status, text };
	}
}

async function waitForServer(): Promise<void> {
	for (let i = 0; i < 100; i++) {
		try {
			await fetch(`http://127.0.0.1:${port}/`);
			return;
		} catch {
			await new Promise((resolve) => setTimeout(resolve, 50));
		}
	}
	throw new Error('wfrt did not start');
}

const counts = { cases: 0, calls: 0, equal: 0, sameMarker: 0, different: 0, stateDifferent: 0 };
const notes: string[] = [];

try {
	await waitForServer();
	for (const c of POSTGRES_CASES) {
		const recording = recordings[c.name];
		if (recording === undefined || !c.name.includes(only)) continue;
		counts.cases += 1;
		const setup: string[] = await runTexts(credential, POSTGRES_SETUP);
		const failed = setup.filter((text) => text.startsWith('error:'));
		if (failed.length > 0) throw new Error(`setup failed: ${failed.join('; ')}`);
		let caseEqual = true;
		for (const [index, call] of recording.calls.entries()) {
			counts.calls += 1;
			const got = withoutSourcePlace(await post({ slot: slotOf(c.credential), call: call.args }));
			const want = call.result;
			if (canonical(got) === canonical(want)) {
				counts.equal += 1;
			} else if (markerOf(want) !== undefined && markerOf(got) === markerOf(want)) {
				counts.sameMarker += 1;
			} else {
				counts.different += 1;
				caseEqual = false;
				notes.push(
					`DIFFERENT ${c.name} [call ${index}]\n  call:     ${JSON.stringify(call.args).slice(0, 600)}\n  recorded: ${JSON.stringify(want).slice(0, 900)}\n  wfrt:     ${JSON.stringify(got).slice(0, 900)}`,
				);
			}
		}
		// The recorded state is the one after the v1 node. With the fallback host, the
		// library node changes nothing; a call that differs explains a state that differs.
		if (recording.host === true || !caseEqual) continue;
		const state: string[] = await runTexts(credential, POSTGRES_STATE);
		if (JSON.stringify(state) !== JSON.stringify(recording.state)) {
			counts.stateDifferent += 1;
			notes.push(`STATE ${c.name}\n  recorded: ${JSON.stringify(recording.state).slice(0, 900)}\n  now:      ${JSON.stringify(state).slice(0, 900)}`);
		}
	}
} finally {
	server.kill('SIGTERM');
}

for (const note of notes) console.log(note);
console.log(JSON.stringify(counts));
process.exitCode = counts.different + counts.stateDifferent > 0 ? 1 : 0;
