#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
const n8nBin = resolve(rootDir, 'packages/cli/bin/n8n');

const args = parseArgs(process.argv.slice(2));
const inputPath = resolve(rootDir, args.input);
const source = JSON.parse(readFileSync(inputPath, 'utf8'));
const workflows = Array.isArray(source) ? source : source.workflows;

if (!Array.isArray(workflows)) {
	throw new Error(`Expected an array or { workflows: [] } in ${inputPath}`);
}

const credentials = collectCredentials(workflows);
const importWorkflows = workflows.map(toImportableWorkflow);
const workingDir = mkdtempSync(resolve(tmpdir(), 'n8n-workflow-insights-seed-'));

try {
	const credentialsPath = resolve(workingDir, 'credentials.json');
	const workflowsPath = resolve(workingDir, 'workflows.json');
	writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
	writeFileSync(workflowsPath, JSON.stringify(importWorkflows, null, 2));

	console.log(
		`Prepared ${credentials.length} dummy credentials and ${importWorkflows.length} workflows`,
	);

	if (args.dryRun) {
		console.log(`Dry run output: ${workingDir}`);
		process.exit(0);
	}

	runImport('credentials', credentialsPath, args.projectId);
	if (!args.credentialsOnly) {
		runImport('workflow', workflowsPath, args.projectId);
	}
} finally {
	if (!args.dryRun) rmSync(workingDir, { recursive: true, force: true });
}

function parseArgs(argv) {
	const values = new Map();
	for (const argument of argv) {
		const [key, ...valueParts] = argument.split('=');
		values.set(key, valueParts.join('='));
	}

	const input = values.get('--input');
	const projectId = values.get('--project-id');
	if (!input || !projectId) {
		throw new Error(
			'Usage: seed-workflow-insights.mjs --input=<export.json> --project-id=<id> [--credentials-only] [--dry-run]',
		);
	}

	return {
		input,
		projectId,
		credentialsOnly: values.has('--credentials-only'),
		dryRun: values.has('--dry-run'),
	};
}

function collectCredentials(workflowList) {
	const byId = new Map();

	for (const workflow of workflowList) {
		for (const node of workflow.nodes ?? []) {
			for (const [type, reference] of Object.entries(node.credentials ?? {})) {
				if (!reference?.id || byId.has(reference.id)) continue;
				byId.set(reference.id, {
					id: reference.id,
					name: reference.name ?? `Dummy ${type}`,
					type,
					data: dummyDataFor(type),
				});
			}
		}
	}

	return [...byId.values()];
}

function dummyDataFor(type) {
	switch (type) {
		case 'httpHeaderAuth':
			return {
				name: 'X-Dummy-Api-Key',
				value: 'dummy-not-a-real-secret',
			};
		case 'slackApi':
			return {
				accessToken: 'xoxb-dummy-not-a-real-token',
			};
		case 'postgres':
			return {
				host: 'localhost',
				database: 'dummy',
				user: 'dummy',
				password: 'dummy-not-a-real-secret',
				port: 5432,
				ssl: 'disable',
			};
		case 'customerIoApi':
			return {
				trackingSiteId: 'dummy-site-id',
				apiKey: 'dummy-not-a-real-secret',
				region: 'us',
			};
		case 'gmailOAuth2':
		case 'googleSheetsOAuth2Api':
			return {
				clientId: 'dummy-client-id.apps.googleusercontent.com',
				clientSecret: 'dummy-not-a-real-secret',
				oauthTokenData: JSON.stringify({
					access_token: 'dummy-not-a-real-token',
					token_type: 'Bearer',
				}),
			};
		default:
			return {
				dummy: 'dummy-not-a-real-secret',
			};
	}
}

function toImportableWorkflow(workflow) {
	const allowedFields = [
		'id',
		'name',
		'nodes',
		'connections',
		'settings',
		'staticData',
		'meta',
		'nodeGroups',
	];
	const result = Object.fromEntries(
		allowedFields
			.filter((field) => workflow[field] !== undefined)
			.map((field) => [field, workflow[field]]),
	);

	// Never register triggers or webhooks from a seeded workflow.
	result.active = false;
	return result;
}

function runImport(resource, path, projectId) {
	console.log(`Importing ${resource} data into project ${projectId}...`);
	execFileSync(
		process.execPath,
		[n8nBin, `import:${resource}`, `--input=${path}`, `--projectId=${projectId}`],
		{
			cwd: resolve(rootDir, 'packages/cli'),
			env: process.env,
			stdio: 'inherit',
		},
	);
}
