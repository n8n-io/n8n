#!/usr/bin/env node
/**
 * Generates the spike workload workflows (SPIKE-SPEC-opus.md, section 11) as
 * JSON files in ../workloads. The files are committed; rerun this script after
 * a change.
 *
 *   node spike/code-sandbox/scripts/generate-workloads.mjs
 *
 * Environment:
 *   ECHO_URL   echo server base URL (default http://127.0.0.1:5680)
 *   FILES_DIR  folder with the W5 files (default /tmp/n8n-spike)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'workloads');
const ECHO_URL = process.env.ECHO_URL ?? 'http://127.0.0.1:5680';
const FILES_DIR = process.env.FILES_DIR ?? '/tmp/n8n-spike';

let nodeCounter = 0;
const uuid = (prefix) =>
	`${prefix.padEnd(8, '0').slice(0, 8)}-0000-4000-8000-${String(++nodeCounter).padStart(12, '0')}`;

function webhook(path) {
	return {
		id: uuid('a1'),
		name: 'Webhook',
		type: 'n8n-nodes-base.webhook',
		typeVersion: 2,
		position: [0, 0],
		webhookId: uuid('b1'),
		parameters: {
			httpMethod: 'POST',
			path,
			responseMode: 'lastNode',
			responseData: 'allEntries',
			options: {},
		},
	};
}

function code(name, jsCode, x = 200, mode = 'runOnceForAllItems') {
	return {
		id: uuid('c0'),
		name,
		type: 'n8n-nodes-base.code',
		typeVersion: 2,
		position: [x, 0],
		parameters: { mode, jsCode },
	};
}

function chain(...names) {
	const connections = {};
	for (let i = 0; i < names.length - 1; i++) {
		connections[names[i]] = { main: [[{ node: names[i + 1], type: 'main', index: 0 }]] };
	}
	return connections;
}

function workflow(id, name, nodes, connections) {
	return {
		id,
		name,
		active: false,
		nodes,
		connections,
		settings: { executionOrder: 'v1', saveDataSuccessExecution: 'none', saveManualExecutions: false },
		pinData: {},
		meta: { spike: 'code-sandbox-opus' },
	};
}

const workloads = {};

// W1: one Code node that returns its input.
workloads.w1 = workflow(
	'spikeW1000000001',
	'W1 one Code node',
	[webhook('spike-w1'), code('Code', 'return $input.all();')],
	chain('Webhook', 'Code'),
);

// W2: five Code nodes in a row.
const w2Nodes = [webhook('spike-w2')];
const w2Names = ['Webhook'];
for (let i = 1; i <= 5; i++) {
	w2Nodes.push(code(`Code ${i}`, `return $input.all().map(i => ({ json: { ...i.json, step${i}: true } }));`, 200 * i));
	w2Names.push(`Code ${i}`);
}
workloads.w2 = workflow('spikeW2000000001', 'W2 five Code nodes', w2Nodes, chain(...w2Names));

// W3: Loop Over Items, batch size 1, 100 items, one Code node in the loop.
workloads.w3 = workflow(
	'spikeW3000000001',
	'W3 loop with a Code node',
	[
		webhook('spike-w3'),
		{
			id: uuid('d0'),
			name: 'Generate',
			type: 'n8n-nodes-base.debugHelper',
			typeVersion: 1,
			position: [200, 0],
			parameters: { category: 'randomData', randomDataType: 'uuid', randomDataCount: 100 },
		},
		{
			id: uuid('e0'),
			name: 'Loop',
			type: 'n8n-nodes-base.splitInBatches',
			typeVersion: 3,
			position: [400, 0],
			parameters: { batchSize: 1, options: {} },
		},
		code('Code', 'return $input.all().map(i => ({ json: { ...i.json, seen: true } }));', 600),
	],
	{
		Webhook: { main: [[{ node: 'Generate', type: 'main', index: 0 }]] },
		Generate: { main: [[{ node: 'Loop', type: 'main', index: 0 }]] },
		Loop: { main: [[], [{ node: 'Code', type: 'main', index: 0 }]] },
		Code: { main: [[{ node: 'Loop', type: 'main', index: 0 }]] },
	},
);

// W4: ten Set nodes with 1,000 items, then a Code node that reads all of them.
const w4Nodes = [
	webhook('spike-w4'),
	{
		id: uuid('d0'),
		name: 'Generate',
		type: 'n8n-nodes-base.debugHelper',
		typeVersion: 1,
		position: [200, 0],
		parameters: { category: 'randomData', randomDataType: 'user', randomDataCount: 1000 },
	},
];
const w4Names = ['Webhook', 'Generate'];
for (let i = 1; i <= 10; i++) {
	w4Nodes.push({
		id: uuid('f0'),
		name: `Set ${i}`,
		type: 'n8n-nodes-base.set',
		typeVersion: 3.4,
		position: [200 + 200 * i, 0],
		parameters: {
			mode: 'manual',
			assignments: {
				assignments: [{ id: uuid('aa'), name: `field${i}`, value: `value-${i}-{{ $json.uid ?? $itemIndex }}`, type: 'string' }],
			},
			includeOtherFields: true,
			options: {},
		},
	});
	w4Names.push(`Set ${i}`);
}
const w4Refs = Array.from({ length: 10 }, (_, i) => `$('Set ${i + 1}').all().length`).join(' + ');
w4Nodes.push(code('Code', `const total = ${w4Refs};\nreturn [{ json: { total } }];`, 2400));
w4Names.push('Code');
workloads.w4 = workflow('spikeW4000000001', 'W4 staged data of ten nodes', w4Nodes, chain(...w4Names));

// W5: read a file, then a Code node that reads the bytes and writes a new binary.
// The size comes from the query: ?size=1mb|100mb|1gb. Streams, so 1 GiB fits in memory.
workloads.w5 = workflow(
	'spikeW5000000001',
	'W5 binary transfer',
	[
		webhook('spike-w5'),
		{
			id: uuid('d0'),
			name: 'Read File',
			type: 'n8n-nodes-base.readWriteFile',
			typeVersion: 1,
			position: [200, 0],
			parameters: {
				operation: 'read',
				fileSelector: `={{ '${FILES_DIR}/w5-' + ($json.query.size || '1mb') + '.bin' }}`,
				options: {},
			},
		},
		code(
			'Code',
			[
				'const meta = helpers.assertBinaryData(0, "data");',
				'const stream = await helpers.getBinaryStream(meta.id);',
				'let bytes = 0;',
				'const { PassThrough } = require("stream");',
				'const counter = new PassThrough();',
				'counter.on("data", (c) => { bytes += c.length; });',
				'stream.pipe(counter);',
				'const out = await helpers.prepareBinaryData(counter, "copy.bin", "application/octet-stream");',
				'return [{ json: { bytes }, binary: { data: out } }];',
			].join('\n'),
			400,
		),
		code('Report', 'return $input.all().map(i => ({ json: { bytes: i.json.bytes, size: i.binary?.data?.fileSize, id: i.binary?.data?.id } }));', 600),
	],
	chain('Webhook', 'Read File', 'Code', 'Report'),
);

// W5b: the same with Buffers, for the task runner baseline (getBinaryStream
// throws on task runners today).
workloads.w5b = workflow(
	'spikeW5000000002',
	'W5b binary transfer with Buffers',
	[
		webhook('spike-w5b'),
		{
			id: uuid('d0'),
			name: 'Read File',
			type: 'n8n-nodes-base.readWriteFile',
			typeVersion: 1,
			position: [200, 0],
			parameters: {
				operation: 'read',
				fileSelector: `={{ '${FILES_DIR}/w5-' + ($json.query.size || '1mb') + '.bin' }}`,
				options: {},
			},
		},
		code(
			'Code',
			[
				'const buf = await helpers.getBinaryDataBuffer(0, "data");',
				'const out = await helpers.prepareBinaryData(Buffer.from(buf), "copy.bin", "application/octet-stream");',
				'return [{ json: { bytes: buf.length }, binary: { data: out } }];',
			].join('\n'),
			400,
		),
	],
	chain('Webhook', 'Read File', 'Code'),
);

// W6: ten httpRequest calls, plus SSRF and proxy cases (the query selects the case).
workloads.w6 = workflow(
	'spikeW6000000001',
	'W6 httpRequest RPC',
	[
		webhook('spike-w6'),
		code(
			'Code',
			[
				'const mode = $json.query?.mode ?? "ten";',
				'const out = {};',
				'if (mode === "ten") {',
				'  const t0 = Date.now();',
				'  for (let i = 0; i < 10; i++) {',
				`    await helpers.httpRequest({ url: '${ECHO_URL}/echo?i=' + i, json: true });`,
				'  }',
				'  out.ms = Date.now() - t0;',
				'} else if (mode === "ssrf") {',
				'  try { await helpers.httpRequest({ url: "http://169.254.169.254/latest/meta-data/" }); out.blocked = false; }',
				'  catch (e) { out.blocked = true; out.message = e.message; }',
				'} else if (mode === "proxy") {',
				`  const r = await helpers.httpRequest({ url: '${ECHO_URL}/echo?via=proxy', json: true });`,
				'  out.viaProxy = r.viaProxy === true;',
				'}',
				'return [{ json: out }];',
			].join('\n'),
		),
	],
	chain('Webhook', 'Code'),
);

// W9: Execute Workflow once for each item, 20 items. The sub-workflow has one Code node.
workloads['w9-sub'] = workflow(
	'spikeW9000000002',
	'W9 sub-workflow',
	[
		{
			id: uuid('a2'),
			name: 'Start',
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			typeVersion: 1.1,
			position: [0, 0],
			parameters: { inputSource: 'passthrough' },
		},
		code('Code', 'return $input.all().map(i => ({ json: { ...i.json, sub: true } }));'),
	],
	chain('Start', 'Code'),
);
workloads.w9 = workflow(
	'spikeW9000000001',
	'W9 sub-workflows',
	[
		webhook('spike-w9'),
		{
			id: uuid('d0'),
			name: 'Generate',
			type: 'n8n-nodes-base.debugHelper',
			typeVersion: 1,
			position: [200, 0],
			parameters: { category: 'randomData', randomDataType: 'uuid', randomDataCount: 20 },
		},
		{
			id: uuid('e1'),
			name: 'Execute Workflow',
			type: 'n8n-nodes-base.executeWorkflow',
			typeVersion: 1.2,
			position: [400, 0],
			parameters: {
				source: 'database',
				workflowId: { __rl: true, value: 'spikeW9000000002', mode: 'id' },
				mode: 'each',
				options: { waitForSubWorkflow: true },
			},
		},
	],
	chain('Webhook', 'Generate', 'Execute Workflow'),
);

// W10: manual run of a Code node that logs a line every 200 ms for 3 s.
workloads.w10 = workflow(
	'spikeW1000000010',
	'W10 live console output (run manually in the editor)',
	[
		{
			id: uuid('a3'),
			name: 'Manual',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		code(
			'Code',
			[
				'for (let i = 0; i < 15; i++) {',
				'  console.log(`line ${i} at ${new Date().toISOString()}`);',
				'  await new Promise((r) => setTimeout(r, 200));',
				'}',
				'console.warn("a warning");',
				'return [{ json: { done: true } }];',
			].join('\n'),
		),
	],
	chain('Manual', 'Code'),
);

mkdirSync(outDir, { recursive: true });
for (const [name, wf] of Object.entries(workloads)) {
	writeFileSync(join(outDir, `${name}.json`), JSON.stringify(wf, null, '\t') + '\n');
}

// W14: 100 copies of W2 with their own ids and webhook paths.
const w14Dir = join(outDir, 'w14');
mkdirSync(w14Dir, { recursive: true });
for (let n = 0; n < 100; n++) {
	const copy = structuredClone(workloads.w2);
	copy.id = `spikeW14${String(n).padStart(8, '0')}`;
	copy.name = `W14 copy ${n}`;
	copy.nodes[0].parameters.path = `spike-w14-${n}`;
	copy.nodes[0].webhookId = uuid('b2');
	for (const node of copy.nodes) node.id = uuid('c1');
	writeFileSync(join(w14Dir, `w14-${n}.json`), JSON.stringify(copy, null, '\t') + '\n');
}

console.log(`Wrote ${Object.keys(workloads).length} workloads and 100 W14 copies to ${outDir}`);
