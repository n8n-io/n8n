// The marginal CPU of a host step: hand-written workflows with 0, 1 and 5
// No Op steps forced into the fallback host (`host: 'fallback'`), and one
// with a trivial Code step, each run alone many times on the compiled
// engine that compiled.mjs started. CPU comes from the cgroups.
//
//   node26 stepcost.mjs --manifest <compiled manifest> [--runs 3000] --out stepcost.json
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
	const i = argv.indexOf(`--${name}`);
	return i >= 0 ? argv[i + 1] : dflt;
};
const LT = process.env.LT || path.join(process.env.HOME, 'wfrt-loadtest');
const { compile } = await import(pathToFileURL(path.join(LT, 'src/packages/@n8n/workflow-lang/src/compiler/index.ts')).href);
const { convertWorkflow } = await import(pathToFileURL(path.join(LT, 'src/packages/@n8n/workflow-lang/src/convert/index.ts')).href);
// A Code step in the host, as the converter writes it (codeNodes: 'host').
const codeHost = convertWorkflow(
	{
		nodes: [
			{ name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: 'lt-code1', parameters: { httpMethod: 'POST', path: 'lt-code1', responseMode: 'lastNode', options: {} } },
			{ name: 'Code', type: 'n8n-nodes-base.code', typeVersion: 2, position: [200, 0], parameters: { jsCode: 'return $input.all();' } },
		],
		connections: { Webhook: { main: [[{ node: 'Code', type: 'main', index: 0 }]] } },
	},
	{ trigger: 'Webhook', trace: 'none', codeNodes: 'host' },
).source;
const m = JSON.parse(fs.readFileSync(arg('manifest'), 'utf8'));
const RUNS = Number(arg('runs', '3000'));
const auth = { authorization: `Bearer ${m.adminSecret}`, 'content-type': 'application/json' };
const port = Object.values(m.entries).find((e) => e.owner === 0)?.port ?? 18080;

const noop = (name, from) => `const ${name}: Json[] = await ctx.node({ name: '${name}', type: 'n8n-nodes-base.noOp', typeVersion: 1, parameters: {}, host: 'fallback', items: ${from} });`;
const source = (pathName, body, ret) => `import { webhook, workflow } from '@n8n/workflow-lang';
type Json = any;
export default workflow({
	triggers: [webhook<Json>({ path: '${pathName}', method: 'POST', respond: 'lastNode' })],
	async run(ctx, trigger) {
		const start: Json[] = [{ body: trigger.body }];
		${body}
		return { out: ${ret} };
	},
});`;
const chain = (n) => Array.from({ length: n }, (_, i) => noop(`h${i}`, i === 0 ? 'start' : `h${i - 1}`)).join('\n\t\t');
const cases = {
	'steps-0': source('lt-step0', '', 'start'),
	'noop-host-1': source('lt-step1', chain(1), 'h0'),
	'noop-host-5': source('lt-step5', chain(5), 'h4'),
	'code-host-1': codeHost,
};
const cpu = (unit) => Number(/^usage_usec (\d+)/m.exec(fs.readFileSync(`/sys/fs/cgroup/lt.slice/lt-${unit}.service/cpu.stat`, 'utf8'))[1]);
const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
const post = (p) =>
	new Promise((resolve) => {
		const body = '{"a":1}';
		const req = http.request({ host: '127.0.0.1', port, path: `/webhook/${p}`, method: 'POST', agent, headers: { 'content-type': 'application/json', 'content-length': 7 } }, (res) => {
			res.resume();
			res.on('end', () => resolve(res.statusCode));
		});
		req.on('error', () => resolve(0));
		req.end(body);
	});
const results = {};
for (const [name, src] of Object.entries(cases)) {
	const c = compile(src, { fileName: '/workflow.ts' });
	if (!c.ok) {
		results[name] = { error: JSON.stringify(c.diagnostics).slice(0, 300) };
		continue;
	}
	const id = `stepcost-${name}`;
	const r = await fetch(`${m.admin[0]}/_admin/workflows/${id}`, { method: 'PUT', headers: auth, body: JSON.stringify({ versionId: 'v1', module: Buffer.from(c.module).toString('base64'), active: true, webhookPrefix: '/webhook', credentials: {} }) });
	if (!r.ok) {
		results[name] = { error: `load ${r.status} ${await r.text()}` };
		continue;
	}
	const p = /path: '([^']+)'/.exec(src)[1];
	if ((await post(p)) !== 200) console.log(name, 'first run failed');
	for (let i = 0; i < 200; i++) await post(p);
	const w0 = cpu('wfrt-0'), h0 = cpu('host'), t0 = performance.now();
	let ok = 0;
	for (let i = 0; i < RUNS; i++) if ((await post(p)) === 200) ok++;
	const wall = performance.now() - t0;
	results[name] = { runs: RUNS, ok, wfrtUs: (cpu('wfrt-0') - w0) / RUNS, hostUs: (cpu('host') - h0) / RUNS, wallUs: (wall * 1000) / RUNS };
	console.log(name, JSON.stringify(results[name]));
}
fs.writeFileSync(arg('out', 'stepcost.json'), JSON.stringify(results, null, 1));
agent.destroy();
