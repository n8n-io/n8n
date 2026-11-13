// The load driver of the synthetic benchmark. It needs only Node.js, so it
// can run on a second machine. It reads the manifest and the CPU counters
// from the control API of `engine.ts`.
//
//   node drive.mjs --control http://<server>:18099 [--target <server ip>] --mode warm|mix
//     [--conc 4] [--seconds 10] [--runs 200] [--label text] --out <file>
//
// warm: each workflow alone, as `bench/warm/warm.ts` does it: a few runs to
//   warm up, then `--runs` runs or `--seconds`, with `--conc` in flight.
//   The output has the format of warm.ts (one result per copy of a
//   workflow, so the distribution follows the mix), for `bench/warm/report.mjs`.
// mix: all workflows at once, picked by their copies, with `--conc` in
//   flight, for `--seconds`. The output is one JSON line: rate, latency and
//   CPU per run.
import { appendFileSync, writeFileSync } from 'node:fs';
import { Agent, request } from 'node:http';

const arg = (name, fallback) => {
	const i = process.argv.indexOf(`--${name}`);
	return i >= 0 ? process.argv[i + 1] : fallback;
};
const CONTROL = arg('control', 'http://127.0.0.1:18099');
const MODE = arg('mode', 'warm');
const CONC = Number(arg('conc', '4'));
const SECONDS = Number(arg('seconds', '10'));
const RUNS = Number(arg('runs', '200'));
const OUT = arg('out', `synth-${MODE}.json`);
const LABEL = arg('label', '');

const getJson = async (path) => (await fetch(`${CONTROL}${path}`)).json();
const manifest = await getJson('/manifest');
const target = arg('target', new URL(CONTROL).hostname);
const agent = new Agent({ keepAlive: true, maxSockets: CONC * 2 });

let seq = 0;
function post(path, port = manifest.port) {
	const body = JSON.stringify({ ...manifest.workflows[0].sample, id: `ord-${++seq}` });
	return new Promise((resolve) => {
		const t0 = process.hrtime.bigint();
		const req = request(
			{ host: target, port, path, method: 'POST', agent, headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } },
			(res) => {
				res.resume();
				res.on('end', () => resolve({ ok: res.statusCode === 200, us: Number(process.hrtime.bigint() - t0) / 1000 }));
			},
		);
		req.on('error', () => resolve({ ok: false, us: Number(process.hrtime.bigint() - t0) / 1000 }));
		req.end(body);
	});
}

async function loop(pick, stop) {
	const lat = [];
	let failed = 0;
	const worker = async () => {
		while (!stop(lat.length + failed)) {
			const w = pick();
			const r = await post(w.path, w.port ?? manifest.port);
			if (r.ok) lat.push(r.us);
			else failed++;
		}
	};
	await Promise.all(Array.from({ length: CONC }, worker));
	return { lat, failed };
}

const pct = (xs, p) => xs[Math.min(xs.length - 1, Math.floor(p * xs.length))] ?? 0;

if (MODE === 'warm') {
	const results = [];
	for (const w of manifest.workflows) {
		await loop(() => w, (n) => n >= 10);
		const c0 = await getJson('/cpu');
		const t0 = Date.now();
		const { lat, failed } = await loop(() => w, (n) => n >= RUNS || Date.now() - t0 > SECONDS * 1000);
		const c1 = await getJson('/cpu');
		const runs = lat.length + failed;
		const r = {
			id: w.name,
			runs,
			failed,
			nodeRuns: w.nodeRuns,
			wfrtUs: ((c1.wfrt - c0.wfrt) * 1e6) / runs,
			wfrtInstructions: (c1.instructions - c0.instructions) / runs,
			hostUs: ((c1.host - c0.host) * 1e6) / runs,
			wall: (Date.now() - t0) / 1000,
		};
		console.log(`${w.name}: ${runs} runs (${failed} failed), wfrt ${r.wfrtUs.toFixed(0)} µs, host ${r.hostUs.toFixed(0)} µs`);
		for (let k = 0; k < w.copies; k++) results.push({ ...r, id: `${w.name}#${k}` });
	}
	writeFileSync(OUT, JSON.stringify({ code: manifest.code, synthetic: true, runs: RUNS, seconds: SECONDS, conc: CONC, results }, null, 1));
} else {
	const bag = manifest.workflows.flatMap((w) => Array.from({ length: w.copies }, () => w));
	let k = 0;
	// A fixed order that repeats every 100 picks, spread out by a stride.
	const pick = () => bag[(k++ * 37) % bag.length];
	await loop(pick, (n) => n >= 20 * CONC);
	const c0 = await getJson('/cpu');
	const t0 = Date.now();
	const { lat, failed } = await loop(pick, () => Date.now() - t0 > SECONDS * 1000);
	const c1 = await getJson('/cpu');
	const wall = (Date.now() - t0) / 1000;
	const runs = lat.length + failed;
	const nodeRuns = bag.reduce((a, w) => a + w.nodeRuns, 0) / bag.length;
	lat.sort((a, b) => a - b);
	const row = {
		label: LABEL,
		shards: manifest.shards,
		workers: manifest.workers,
		code: manifest.code,
		conc: CONC,
		seconds: wall,
		runs,
		failed,
		rate: runs / wall,
		nodeRunsPerRun: nodeRuns,
		p50ms: pct(lat, 0.5) / 1000,
		p90ms: pct(lat, 0.9) / 1000,
		p99ms: pct(lat, 0.99) / 1000,
		wfrtUsPerRun: ((c1.wfrt - c0.wfrt) * 1e6) / runs,
		hostUsPerRun: ((c1.host - c0.host) * 1e6) / runs,
		wfrtCores: (c1.wfrt - c0.wfrt) / wall,
		hostCores: (c1.host - c0.host) / wall,
		stubCores: (c1.upstream - c0.upstream) / wall,
		wfrtInstructionsPerRun: (c1.instructions - c0.instructions) / runs,
		wfrtCyclesPerRun: (c1.cycles - c0.cycles) / runs,
	};
	console.log(JSON.stringify(row));
	appendFileSync(OUT, `${JSON.stringify(row)}\n`);
}
agent.destroy();
