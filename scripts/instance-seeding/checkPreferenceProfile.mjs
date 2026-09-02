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

import { execSync } from 'node:child_process';
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

function declaredNames(dirs) {
	const out = new Set();
	for (const dir of dirs) {
		let txt = '';
		try {
			txt = execSync(
				`grep -rhoE "(name: |_FIELD = )'[A-Za-z0-9_]+'" "${path.join(REPO, dir)}" --include='*.ts'`,
				{
					encoding: 'utf8',
				},
			);
		} catch {
			// grep exits non-zero when nothing matches; an empty set is the right answer.
		}
		for (const m of txt.matchAll(/name: '([A-Za-z0-9_]+)'/g)) out.add(m[1]);
		for (const m of txt.matchAll(/_FIELD = '([A-Za-z0-9_]+)'/g)) out.add(m[1]);
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
