// Step 3 of the CPU estimate: run the compiled engine on certified bundles
// through the engine test bed and sum the CPU time of `wfrt` and the
// fallback host. The compile time (in the replay process itself) and the gym
// do not count.
//
//   node bench/mix/replay-cpu.mjs <set-dir> <out-dir> [concurrency]
//
// Needs the engine test bed and a running gym (see
// packages/@n8n/workflow-lang/scripts/gym/engine-test.ts).
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [set, out, conc = '1'] = process.argv.slice(2);
const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const bed = process.env.ENGINE_TEST_DIR ?? join(process.env.HOME ?? '', 'work/verifier/data/workflows/gym/engine-test');
mkdirSync(out, { recursive: true });
const log = openSync(join(out, 'replay.log'), 'w');
const child = spawn(
	'node',
	[join(bed, 'harness', 'replay.mjs'), set, '--concurrency', conc, '--out', join(out, 'replay.jsonl'),
		'--engine', join(repo, 'packages/@n8n/workflow-lang/scripts/gym/engine-test-adapter.mjs')],
	{ stdio: ['ignore', log, log] },
);
let running = true;
child.on('exit', () => (running = false));

const seconds = (t) => {
	const [hms, frac = '0'] = t.split('.');
	return hms.split(':').reduce((a, x) => a * 60 + Number(x), 0) + Number(`0.${frac}`);
};
// The adapter stops wfrt and the host when the runs end, so sample their CPU
// time while they run and keep the last value of each process.
const last = new Map();
function sample() {
	let table;
	try {
		table = execFileSync('ps', ['-axo', 'pid=,ppid=,cputime=,command='], { encoding: 'utf8' });
	} catch {
		return;
	}
	const rows = table.trim().split('\n').map((l) => {
		const m = l.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/);
		return m ? { pid: +m[1], ppid: +m[2], cpu: seconds(m[3]), cmd: m[4] } : null;
	}).filter(Boolean);
	const mine = new Set([child.pid]);
	for (let grew = true; grew; ) {
		grew = false;
		for (const r of rows) if (mine.has(r.ppid) && !mine.has(r.pid)) { mine.add(r.pid); grew = true; }
	}
	for (const r of rows) {
		if (r.pid === child.pid || !mine.has(r.pid)) continue;
		const kind = /wfrt\S* serve/.test(r.cmd) ? 'wfrt' : /fallback-host/.test(r.cmd) ? 'host' : 'other';
		last.set(r.pid, { kind, cpu: r.cpu, cmd: r.cmd.slice(0, 80) });
	}
}
while (running) {
	sample();
	await new Promise((r) => setTimeout(r, 1000));
}
const runs = readFileSync(join(out, 'replay.jsonl'), 'utf8').trim().split('\n').filter(Boolean).length;
const sums = {};
for (const { kind, cpu } of last.values()) sums[kind] = (sums[kind] ?? 0) + cpu;
writeFileSync(join(out, 'cpu.json'), JSON.stringify({ runs, sums, processes: [...last] }, null, 1));
for (const [k, v] of Object.entries(sums)) console.log(`${k}: ${v.toFixed(2)} s, ${((v * 1e6) / runs).toFixed(0)} µs per run`);
console.log(`${runs} runs`);
console.log(readFileSync(join(out, 'replay.log'), 'utf8').trim().split('\n').pop());
