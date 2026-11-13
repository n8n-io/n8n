// Prints aggregate facts about a bundle set: trigger types and modes, pinned
// item counts, and node types that matter for a webhook stand-in.
//   node survey.mjs <bundles-root>...
import fs from 'node:fs';
import path from 'node:path';

const dirs = [];
for (const root of process.argv.slice(2)) {
	const walk = (d) => {
		if (fs.existsSync(path.join(d, 'expected.json'))) return dirs.push(d);
		for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory()) walk(path.join(d, e.name));
	};
	walk(root);
}
const count = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
const trig = new Map(), mode = new Map(), pinN = new Map(), special = new Map(), svc = new Map();
for (const d of dirs) {
	const b = JSON.parse(fs.readFileSync(path.join(d, 'bundle.json'), 'utf8'));
	const run = JSON.parse(fs.readFileSync(path.join(d, 'run.json'), 'utf8'));
	const wf = JSON.parse(fs.readFileSync(path.join(d, 'workflow.json'), 'utf8'));
	const exp = JSON.parse(fs.readFileSync(path.join(d, 'expected.json'), 'utf8'));
	count(trig, b.trigger_type);
	count(mode, b.trigger_mode);
	const pin = run.pinData?.[run.trigger];
	const trigOut = exp.nodes?.[run.trigger]?.outputs?.[0];
	count(pinN, pin ? `pinned:${pin.length}` : `live:${trigOut ?? 'none'}`);
	for (const n of wf.nodes) {
		const t = n.type.split('.').pop();
		if (/respondToWebhook|wait|form$|chat$|executeWorkflow$|dataTable/.test(t) && !n.disabled) count(special, t);
	}
	for (const s of b.gym_services ?? []) count(svc, s);
}
const top = (m, n = 25) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n);
console.log(JSON.stringify({ bundles: dirs.length, triggers: top(trig), modes: top(mode), triggerItems: top(pinN), special: top(special), services: top(svc, 40) }, null, 1));
