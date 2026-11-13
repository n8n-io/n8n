// Splits V8 CPU profiles (.cpuprofile, from profile/cpuprof.cjs) of the
// fallback host by where the time goes. Each sample counts once, for the
// first category that matches a frame of its stack, from the leaf up
// (so "node's own code" wins over the context code that called it), and
// once in the self-time table of its leaf function.
//
//   node cpuprof-summary.mjs <dir> [--top 30]
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const TOP = Number(process.argv[process.argv.indexOf('--top') + 1] || 30);

// Categories, first match wins for a frame; frames are tried leaf first.
// "node internals" and "other JS" count only when no frame of the stack has
// a more specific category.
const CATS = [
	['idle', (f) => f.functionName === '(idle)'],
	['gc', (f) => f.functionName === '(garbage collector)'],
	['program (V8/native, no JS frame)', (f) => f.functionName === '(program)'],
	['Code node: user code and its sandbox', (f) => /^Code in |^Function|evalClosureSync|runInContext|compileFunction|isolated-vm|js-task-runner|code-sandbox/.test(f.url + ' ' + f.functionName) || /^Code in /.test(f.url)],
	['TLS, DNS and sockets (native)', (f) => f.url === '' && /^(init|start|getPeerCertificate|setCiphers|destroySSL|connect|queryA|queryAaaa|getaddrinfo|shutdown|writeBuffer|writev|writeUtf8String|setSession|loadSession|onhandshakedone|close)$/.test(f.functionName)],
	['expression resolution (n8n-workflow expressions)', (f) => /n8n-workflow\/dist\/.*(expression|Expression|extensions|tmpl|riot|esprima|ast|evaluat)/.test(f.url) || /@n8n\/tournament|tmpl|esprima-next|jssha|recast/.test(f.url)],
	['getNodeParameter / parameter resolution', (f) => /getNodeParameter|resolveParameter|getParameterValue|NodeHelpers|node-parameters/.test(f.functionName + f.url)],
	['LangChain stack', (f) => /@langchain|langchain|nodes-langchain|zod|openai\/|@anthropic-ai/.test(f.url)],
	['node code (n8n-nodes-base)', (f) => /n8n-nodes-base\/dist\/nodes/.test(f.url)],
	['HTTP client (axios, undici, http, tls)', (f) => /axios|undici|node:_http|node:https|node:http|node:_tls|node:tls|node:net|follow-redirects|form-data/.test(f.url)],
	['execution context building (n8n-core)', (f) => /n8n-core\/dist\/execution-engine/.test(f.url)],
	['n8n-core other', (f) => /n8n-core\//.test(f.url)],
	['n8n-workflow other', (f) => /n8n-workflow\//.test(f.url)],
	['host: serialization and IPC (protocol, framing, JSON)', (f) => /workflow-fallback-host\/dist\/(protocol|framing|ipc|socket|server|wire|codec|frame)/.test(f.url) || /^(parse|stringify)$/.test(f.functionName) && f.url === ''],
	['host: other', (f) => /workflow-fallback-host\//.test(f.url)],
	['node internals (streams, events, timers)', (f) => /^node:/.test(f.url)],
	['other JS', () => true],
];

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.cpuprofile'));
const report = [];
for (const file of files) {
	const p = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
	const byId = new Map(p.nodes.map((n) => [n.id, n]));
	const parent = new Map();
	for (const n of p.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
	const dt = new Map();
	p.samples.forEach((id, i) => dt.set(id, (dt.get(id) ?? 0) + (p.timeDeltas[i] ?? 0)));
	const cat = new Map();
	const self = new Map();
	let total = 0;
	let idle = 0;
	const catOf = new Map();
	const catFor = (id) => {
		if (catOf.has(id)) return catOf.get(id);
		let c = 'other JS';
		const generic = new Set(['other JS', 'node internals (streams, events, timers)']);
		let fallback;
		for (let x = id; x !== undefined; x = parent.get(x)) {
			const f = byId.get(x).callFrame;
			const hit = CATS.find(([name, test]) => !generic.has(name) && test(f));
			if (hit) {
				c = hit[0];
				break;
			}
			if (!fallback && /^node:/.test(f.url)) fallback = 'node internals (streams, events, timers)';
		}
		if (c === 'other JS' && fallback) c = fallback;
		catOf.set(id, c);
		return c;
	};
	for (const [id, us] of dt) {
		const f = byId.get(id).callFrame;
		const c = catFor(id);
		if (c === 'idle') {
			idle += us;
			continue;
		}
		total += us;
		cat.set(c, (cat.get(c) ?? 0) + us);
		const k = `${f.functionName || '(anonymous)'} ${f.url.replace(/^.*node_modules\//, '').replace(/^file:\/\/.*\/packages\//, '')}:${f.lineNumber + 1}`;
		self.set(k, (self.get(k) ?? 0) + us);
	}
	report.push({ file, busyMs: total / 1000, idleMs: idle / 1000, cat, self, total });
}
for (const r of report) {
	console.log(`\n### ${r.file}: busy ${r.busyMs.toFixed(0)} ms, idle ${r.idleMs.toFixed(0)} ms`);
	console.log('\n| Where | Share of busy time |\n|---|---|');
	for (const [c, us] of [...r.cat].sort((a, b) => b[1] - a[1])) console.log(`| ${c} | ${((100 * us) / r.total).toFixed(1)}% |`);
	console.log(`\n| Top self functions | Share |\n|---|---|`);
	for (const [k, us] of [...r.self].sort((a, b) => b[1] - a[1]).slice(0, TOP)) console.log(`| \`${k}\` | ${((100 * us) / r.total).toFixed(1)}% |`);
}
