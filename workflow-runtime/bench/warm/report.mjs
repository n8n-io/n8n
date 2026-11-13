// Summarises warm.ts results: CPU per run and per node run, split into wfrt
// and host, as a distribution across workflows, and the mix-weighted mean.
//   node bench/warm/report.mjs <warm-host.json> [<warm-native.json>]
import { readFileSync } from 'node:fs';

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
const f = (x) => (x >= 100 ? x.toFixed(0) : x.toFixed(1));

function summary(file) {
	const doc = JSON.parse(readFileSync(file, 'utf8'));
	const ok = doc.results.filter((r) => typeof r.runs === 'number' && r.runs > 0 && r.failed === 0);
	const skipped = doc.results.length - ok.length;
	const dist = (pick) => {
		const xs = ok.map(pick).sort((a, b) => a - b);
		return { p50: pct(xs, 50), p90: pct(xs, 90), p99: pct(xs, 99), mean: xs.reduce((a, b) => a + b, 0) / xs.length };
	};
	const nodeRuns = ok.reduce((a, r) => a + r.nodeRuns, 0);
	// Each workflow once, as in the production mix: the mean over workflows.
	const perRun = { wfrt: dist((r) => r.wfrtUs), host: dist((r) => r.hostUs), total: dist((r) => r.wfrtUs + r.hostUs) };
	const perNode = {
		wfrt: dist((r) => r.wfrtUs / Math.max(1, r.nodeRuns)),
		host: dist((r) => r.hostUs / Math.max(1, r.nodeRuns)),
		total: dist((r) => (r.wfrtUs + r.hostUs) / Math.max(1, r.nodeRuns)),
	};
	const weightedNode = {
		wfrt: ok.reduce((a, r) => a + r.wfrtUs, 0) / nodeRuns,
		host: ok.reduce((a, r) => a + r.hostUs, 0) / nodeRuns,
	};
	const runs = ok.reduce((a, r) => a + r.runs, 0);
	return { code: doc.code, workflows: ok.length, skipped, runs, nodesPerRun: nodeRuns / ok.length, perRun, perNode, weightedNode };
}

for (const file of process.argv.slice(2)) {
	const s = summary(file);
	console.log(`\nCode steps: ${s.code}. ${s.workflows} workflows (${s.skipped} skipped), ${s.runs} runs, ${s.nodesPerRun.toFixed(2)} node runs per run`);
	console.log('CPU µs per run       p50 / p90 / p99 / mean');
	for (const k of ['wfrt', 'host', 'total']) {
		const d = s.perRun[k];
		console.log(`  ${k.padEnd(6)} ${f(d.p50)} / ${f(d.p90)} / ${f(d.p99)} / ${f(d.mean)}`);
	}
	console.log('CPU µs per node run  p50 / p90 / p99, mix-weighted');
	for (const k of ['wfrt', 'host', 'total']) {
		const d = s.perNode[k];
		const w = k === 'total' ? s.weightedNode.wfrt + s.weightedNode.host : s.weightedNode[k];
		console.log(`  ${k.padEnd(6)} ${f(d.p50)} / ${f(d.p90)} / ${f(d.p99)}, ${f(w)}`);
	}
	const mean = s.perRun.total.mean;
	console.log(`Per core at the mean: ${Math.round(1e6 / mean)} workflows/s, ${Math.round((1e6 / mean) * s.nodesPerRun)} node runs/s; wfrt alone ${Math.round(1e6 / s.perRun.wfrt.mean)} workflows/s`);
}
