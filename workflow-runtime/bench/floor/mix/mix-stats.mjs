// Aggregates for the CPU cost model. Reads counts and sizes only.
//
//   node mix-stats.mjs            -> writes mix-sizes.json next to this file
//
// Part A: node runs, items and node types from the 1000-v3 bundles'
// expected.json, and host steps from the census (results.jsonl). The trigger
// class of a census row comes from the workflow in prepare/input (a subset).
// Part B: payload bytes from sizes-part*.jsonl (written by sizes-replay.mjs).
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME;
const SET = path.join(HOME, 'work/verifier/data/workflows/gym/engine-test/sets/1000-v3/bundles');
const CENSUS = path.join(HOME, 'work/engine-test-full/coverage/results.jsonl');
const INPUT = path.join(HOME, 'work/engine-test-full/prepare/input');

// ---------- helpers
const q = (xs, p) => {
	if (!xs.length) return null;
	const s = [...xs].sort((a, b) => a - b);
	return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};
const mean = (xs) => (xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : null);
const dist = (xs) => ({ n: xs.length, mean: mean(xs), p50: q(xs, 0.5), p90: q(xs, 0.9), p99: q(xs, 0.99), max: q(xs, 1) });
const hist = (xs, top = 5) => {
	const h = {};
	for (const x of xs) { const k = x >= top ? `${top}+` : String(x); h[k] = (h[k] ?? 0) + 1; }
	return Object.fromEntries(Object.entries(h).map(([k, v]) => [k, { n: v, share: +(v / xs.length).toFixed(4) }]));
};
const short = (t) => t.replace('n8n-nodes-base.', '').replace('@n8n/n8n-nodes-langchain.', 'lc.');

// Node types that do not call a network API on a run. Event-based app
// triggers do not call either; polling triggers do (listed in POLLING).
const LOCAL = new Set(['code', 'if', 'set', 'splitInBatches', 'merge', 'filter', 'noOp', 'switch', 'splitOut', 'wait',
	'executeWorkflow', 'executeWorkflowTrigger', 'respondToWebhook', 'dataTable', 'extractFromFile', 'aggregate', 'dateTime',
	'convertToFile', 'executionData', 'limit', 'html', 'crypto', 'removeDuplicates', 'sort', 'summarize', 'itemLists',
	'markdown', 'xml', 'compareDatasets', 'renameKeys', 'stopAndError', 'function', 'functionItem', 'moveBinaryData',
	'readWriteFile', 'spreadsheetFile', 'stickyNote', 'debugHelper', 'editImage', 'compression', 'n8n',
	'lc.agent', 'lc.chainLlm', 'lc.outputParserStructured', 'lc.memoryBufferWindow', 'lc.toolWorkflow', 'lc.toolCode',
	'lc.chainSummarization', 'lc.textClassifier', 'lc.informationExtractor', 'lc.sentimentAnalysis', 'lc.outputParserAutofixing',
	'lc.textSplitterRecursiveCharacterTextSplitter', 'lc.documentDefaultDataLoader', 'lc.toolThink', 'lc.chainRetrievalQa']);
const POLLING = new Set(['gmailTrigger', 'googleSheetsTrigger', 'microsoftOutlookTrigger', 'googleBusinessProfileTrigger',
	'googleDriveTrigger', 'googleCalendarTrigger', 'rssFeedReadTrigger', 'emailReadImap']);
const DB = new Set(['postgres', 'mySql', 'microsoftSql', 'postgresTool', 'mongoDb', 'redis', 'lc.memoryRedisChat',
	'lc.memoryPostgresChat', 'snowflake']);
const kindOf = (type) => {
	const t = short(type);
	if (POLLING.has(t)) return 'vendor';
	if (DB.has(t)) return 'db';
	if (LOCAL.has(t) || /trigger$/i.test(t) || t === 'cron' || t === 'interval') return 'local';
	return 'vendor';
};
const triggerClass = (type) => {
	// webhook: HTTP in; schedule: timers and polling triggers; app-event: vendor pushes; other: manual, sub-workflow, error.
	const t = short(type ?? '');
	if (/^(webhook|formTrigger|lc\.chatTrigger)$/.test(t)) return 'webhook';
	if (/^(scheduleTrigger|cron|interval)$/.test(t) || POLLING.has(t)) return 'schedule';
	if (/Trigger$/.test(t) && !/^(manualTrigger|executeWorkflowTrigger|errorTrigger)$/.test(t)) return 'app-event';
	return 'other';
};

// ---------- Part A: bundles
const bundles = fs.readdirSync(SET).filter((d) => fs.existsSync(path.join(SET, d, 'expected.json')));
const perWf = [];
const byType = {};
let runsTotal = 0, itemsTotal = 0;
for (const d of bundles) {
	const e = JSON.parse(fs.readFileSync(path.join(SET, d, 'expected.json'), 'utf8'));
	const meta = JSON.parse(fs.readFileSync(path.join(SET, d, 'bundle.json'), 'utf8'));
	let runs = 0, vendorRuns = 0, dbRuns = 0, httpRuns = 0;
	for (const n of Object.values(e.nodes)) {
		const r = n.runs ?? 0;
		runs += r;
		itemsTotal += (n.outputs ?? []).reduce((a, b) => a + (b ?? 0), 0);
		byType[n.type] = (byType[n.type] ?? 0) + r;
		const k = kindOf(n.type);
		if (k === 'vendor') vendorRuns += r;
		if (k === 'db') dbRuns += r;
		if (short(n.type) === 'httpRequest') httpRuns += r;
	}
	runsTotal += runs;
	perWf.push({ runs, vendorRuns, dbRuns, httpRuns, cls: triggerClass(meta.trigger_type) });
}
const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 20)
	.map(([t, n]) => ({ type: short(t), runs: n, share: +(n / runsTotal).toFixed(4) }));
const clsSplit = (rows, f) => Object.fromEntries(['webhook', 'schedule', 'app-event', 'other']
	.map((c) => [c, rows.filter((r) => r.cls === c)]).filter(([, r]) => r.length).map(([c, r]) => [c, f(r)]));

// ---------- Part A: census host steps, with trigger class from prepare/input
async function lines(file, fn) {
	const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
	for await (const l of rl) if (l) fn(l);
}
const trig = new Map();
for (const f of fs.readdirSync(INPUT).filter((f) => f.endsWith('.jsonl'))) {
	await lines(path.join(INPUT, f), (l) => {
		const r = JSON.parse(l);
		const types = (r.workflow?.nodes ?? []).map((n) => n.type).filter((t) => /trigger|webhook|cron|interval|emailReadImap/i.test(t) && !/respondToWebhook/.test(t));
		const cls = types.map(triggerClass);
		trig.set(r.workflow_id, cls.includes('webhook') ? 'webhook' : cls.includes('schedule') ? 'schedule' : cls.includes('app-event') ? 'app-event' : 'other');
	});
}
const census = [];
await lines(CENSUS, (l) => {
	const r = JSON.parse(l);
	if (!/^ok_/.test(r.result ?? '')) return;
	const fb = r.fallback ?? [];
	census.push({ host: fb.length, hostTypes: new Set(fb).size, nodes: r.nodes, cls: trig.get(r.workflow_id) ?? null });
});
const hostSummary = (rows) => ({
	workflows: rows.length,
	hostNodesHist: hist(rows.map((r) => r.host)),
	zeroHostShare: +(rows.filter((r) => r.host === 0).length / rows.length).toFixed(4),
	hostNodes: dist(rows.map((r) => r.host)),
	hostTypes: dist(rows.map((r) => r.hostTypes)),
	nodes: dist(rows.map((r) => r.nodes)),
});
const joined = census.filter((r) => r.cls);

// ---------- Part B: replay sizes
const rows = fs.readdirSync(HERE).filter((f) => /^sizes-part\d+\.jsonl$/.test(f))
	.flatMap((f) => fs.readFileSync(path.join(HERE, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)));
const ran = rows.filter((r) => r.runs.length > 0);
const calls = ran.flatMap((r) => r.calls.filter((c) => !c.token && c.status > 0));
const tokenCalls = ran.flatMap((r) => r.calls.filter((c) => c.token)).length;
// trace 'all' also emits empty traces for steps that did not run, so keep runs with items.
const real = (r) => r.runs.filter((x) => x.type !== '?' && x.items > 0);
const nodeRuns = ran.flatMap(real);
const nonTrig = nodeRuns.filter((x) => !x.trigger);
const trigRuns = ran.map((r) => r.runs.find((x) => x.trigger)).filter(Boolean);
const perRun = ran.map((r) => {
	const cs = r.calls.filter((c) => !c.token && c.status > 0);
	return {
		calls: cs.length,
		bodyIn: cs.reduce((a, c) => a + c.respBody, 0), bodyOut: cs.reduce((a, c) => a + c.reqBody, 0),
		wireAll: cs.reduce((a, c) => a + c.reqHead + c.reqBody + c.respHead + c.respBody, 0),
		items: real(r).reduce((a, x) => a + x.bytes, 0), nodeRuns: real(r).length,
		cls: triggerClass(r.triggerType), mode: r.triggerMode,
	};
});
const tally = {};
for (const r of rows) tally[r.match] = (tally[r.match] ?? 0) + 1;
const byHost = {};
for (const c of calls) byHost[c.host] = (byHost[c.host] ?? 0) + 1;
const httpSteps = ran.flatMap((r) => r.httpSteps);

const result = {
	generated: new Date().toISOString(),
	notes: [
		'Sizes only; no payload content was stored.',
		'Part A bundles: 1000-v3 expected.json (reference n8n run in the gym). Pinned nodes count as runs.',
		'Vendor node = any node type not in the local list of mix-stats.mjs; polling triggers count as vendor; DB nodes apart.',
		'Census: rows with result ok_*; fallback[] has one entry per host node. Trigger class from prepare/input join (subset); priority webhook > schedule (incl. polling) > app-event > other.',
		'Part B: replay of every 3rd bundle on wfrt + fallback host through a byte-counting HTTPS proxy in front of the gym. Vendor responses are gym-simulated, not real vendor responses. Postgres/MySQL traffic not counted. OAuth token refreshes by the adapter excluded.',
		'Node-run item stats cover runs with at least one item (the trace also emits empty traces for steps that did not run); in expected.json about 14% of real node runs give 0 items.',
		'Bytes: body = HTTP body bytes on the wire (gym does not compress unless content-encoding says so); head = request/status line + headers. Item bytes = UTF-8 length of JSON.stringify(item json), binary apart.',
	],
	A: {
		bundles: {
			workflows: perWf.length,
			nodeRunsPerWorkflow: dist(perWf.map((w) => w.runs)),
			itemsPerNodeRunMean: +(itemsTotal / runsTotal).toFixed(2),
			topNodeTypesByRuns: topTypes,
			vendorNodeRunsPerWorkflow: { ...dist(perWf.map((w) => w.vendorRuns)), hist: hist(perWf.map((w) => w.vendorRuns)) },
			httpRequestRunsPerWorkflow: dist(perWf.map((w) => w.httpRuns)),
			dbNodeRunsPerWorkflow: dist(perWf.map((w) => w.dbRuns)),
			byTriggerClass: clsSplit(perWf, (r) => ({ workflows: r.length, nodeRuns: dist(r.map((w) => w.runs)), vendorRuns: dist(r.map((w) => w.vendorRuns)) })),
		},
		census: {
			all: hostSummary(census),
			joinedWithTrigger: joined.length,
			byTriggerClass: clsSplit(joined, hostSummary),
		},
	},
	B: {
		sample: { replayed: rows.length, withTrace: ran.length, match: tally },
		vendorCalls: {
			n: calls.length, tokenRefreshCallsExcluded: tokenCalls,
			responseBodyBytes: dist(calls.map((c) => c.respBody)),
			requestBodyBytes: dist(calls.map((c) => c.reqBody)),
			requestHeadBytes: dist(calls.map((c) => c.reqHead)),
			responseHeadBytes: dist(calls.map((c) => c.respHead)),
			compressedResponses: calls.filter((c) => c.enc).length,
			topHosts: Object.entries(byHost).sort((a, b) => b[1] - a[1]).slice(0, 15),
		},
		wfrtHttpSteps: { n: httpSteps.length, responseBodyBytes: dist(httpSteps.map((h) => h.respBody)), requestBodyBytes: dist(httpSteps.map((h) => h.reqBody)) },
		nodeRunItems: {
			all: { bytes: dist(nodeRuns.map((x) => x.bytes)), items: dist(nodeRuns.map((x) => x.items)) },
			nonTrigger: { bytes: dist(nonTrig.map((x) => x.bytes)), items: dist(nonTrig.map((x) => x.items)) },
			bytesPerItem: dist(nodeRuns.filter((x) => x.items).map((x) => Math.round(x.bytes / x.items))),
			binaryRuns: nodeRuns.filter((x) => x.bin > 0).length,
			binaryBytes: dist(nodeRuns.filter((x) => x.bin > 0).map((x) => x.bin)),
		},
		triggerPayloadBytes: {
			all: dist(trigRuns.map((x) => x.bytes)),
			byTriggerClass: clsSplit(ran.map((r) => ({ cls: triggerClass(r.triggerType), b: r.runs.find((x) => x.trigger)?.bytes })).filter((x) => x.b != null), (r) => dist(r.map((x) => x.b))),
		},
		perWorkflow: {
			vendorCalls: { ...dist(perRun.map((r) => r.calls)), hist: hist(perRun.map((r) => r.calls)) },
			vendorBodyBytesInPlusOut: dist(perRun.map((r) => r.bodyIn + r.bodyOut)),
			vendorBodyBytesIn: dist(perRun.map((r) => r.bodyIn)),
			vendorBodyBytesOut: dist(perRun.map((r) => r.bodyOut)),
			vendorWireBytesWithHeaders: dist(perRun.map((r) => r.wireAll)),
			itemJsonBytes: dist(perRun.map((r) => r.items)),
			nodeRunsWithItems: dist(perRun.map((r) => r.nodeRuns)),
			byTriggerClass: clsSplit(perRun, (r) => ({ workflows: r.length, calls: dist(r.map((x) => x.calls)), vendorBytes: dist(r.map((x) => x.bodyIn + x.bodyOut)), itemBytes: dist(r.map((x) => x.items)) })),
		},
	},
};
fs.writeFileSync(path.join(HERE, 'mix-sizes.json'), JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
