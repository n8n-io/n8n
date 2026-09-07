#!/usr/bin/env node
// Check the top-level parameter names the preference workflows emit against the names
// their node declares. Catches a silent failure: n8n accepts a misspelled parameter,
// stores it, and renders an empty field without erroring.
//
// Walks `node.parameters` one level deep. Nested shapes (`filters.conditions[]`,
// `columns.value`, `additionalFields`) and values are not checked, so a green run
// means nothing is misspelled at the top level, not that the parameters are correct.
//
// Some nodes declare parameters outside their own directory, via a spread or an
// exported constant. Those sources need listing in SOURCES or the check false-fails.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { preferenceWorkflows } from './preference-profile.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const SOURCES = {
	'n8n-nodes-base.scheduleTrigger': ['packages/nodes-base/nodes/Schedule'],
	'n8n-nodes-base.webhook': ['packages/nodes-base/nodes/Webhook'],
	'n8n-nodes-base.if': ['packages/nodes-base/nodes/If'],
	'n8n-nodes-base.set': ['packages/nodes-base/nodes/Set'],
	'n8n-nodes-base.httpRequest': ['packages/nodes-base/nodes/HttpRequest'],
	'n8n-nodes-base.slack': ['packages/nodes-base/nodes/Slack'],
	'n8n-nodes-base.linear': ['packages/nodes-base/nodes/Linear'],
	'n8n-nodes-base.gmail': ['packages/nodes-base/nodes/Google/Gmail'],
	'n8n-nodes-base.dataTable': ['packages/nodes-base/nodes/DataTable'],
	'@n8n/n8n-nodes-langchain.agent': [
		'packages/@n8n/nodes-langchain/nodes/agents/Agent',
		// `promptType` and friends are spread in from here.
		'packages/@n8n/nodes-langchain/utils/descriptions.ts',
	],
	'@n8n/n8n-nodes-langchain.lmChatOpenAi': [
		'packages/@n8n/nodes-langchain/nodes/llms/LMChatOpenAi',
	],
};

/** Every `.ts` file under `target`, which may itself be a file. */
function typeScriptFiles(target) {
	const stat = statSync(target, { throwIfNoEntry: false });
	if (!stat) throw new Error(`SOURCES points at a missing path: ${target}`);
	if (stat.isFile()) return target.endsWith('.ts') ? [target] : [];
	return readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
		const child = path.join(target, entry.name);
		if (entry.isDirectory()) return typeScriptFiles(child);
		return entry.isFile() && child.endsWith('.ts') ? [child] : [];
	});
}

// Read the files in Node rather than shelling out to grep. A missing path now throws
// instead of arriving as an empty result set, and there is no dependency on which
// grep the platform provides or on its exit codes.
function declaredNames(dirs) {
	const out = new Set();
	for (const dir of dirs) {
		for (const file of typeScriptFiles(path.join(REPO, dir))) {
			const txt = readFileSync(file, 'utf8');
			for (const m of txt.matchAll(/name: '([A-Za-z0-9_]+)'/g)) out.add(m[1]);
			for (const m of txt.matchAll(/_FIELD = '([A-Za-z0-9_]+)'/g)) out.add(m[1]);
		}
	}
	return out;
}

const cache = new Map();
const problems = [];
let checked = 0;

for (const wf of preferenceWorkflows({ customer_accounts: 'dt1', automation_runs: 'dt2' })) {
	for (const node of wf.nodes) {
		const dirs = SOURCES[node.type];
		if (!dirs) {
			problems.push(`${wf.name} / ${node.name}: node type ${node.type} is not in SOURCES`);
			continue;
		}
		if (!cache.has(node.type)) cache.set(node.type, declaredNames(dirs));
		const declared = cache.get(node.type);
		for (const key of Object.keys(node.parameters ?? {})) {
			checked++;
			if (!declared.has(key)) {
				problems.push(`${wf.name} / ${node.name} (${node.type}): parameter '${key}' not declared`);
			}
		}
	}
}

console.log(
	`Checked ${checked} parameters across ${preferenceWorkflows({ customer_accounts: 'a', automation_runs: 'b' }).length} workflows.`,
);
if (problems.length === 0) {
	console.log('All parameter names are declared by their node.');
	process.exit(0);
}
console.error(`\n${problems.length} problem(s):`);
for (const p of problems) console.error(`  - ${p}`);
process.exit(1);
