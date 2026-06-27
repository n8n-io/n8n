#!/usr/bin/env node
// n8n-deploy.mjs — zero-dependency deploy script for CI (GitHub Actions).
//
// Packs an exploded n8n package tree and pushes it to a remote n8n instance's
// public API. Mirrors `@n8n/cli deploy` but needs NO n8n build artifact: it uses
// only Node >= 18 globals (fetch / FormData / Blob) and the system `tar`.
//
// Paste this file into your production-workflows repo (e.g. scripts/n8n-deploy.mjs)
// and call it from a GitHub Action. The target instance must have
// N8N_PUBLIC_API_PACKAGES_ENABLED=true.
//
// Usage:
//   node n8n-deploy.mjs [dir] --instance <url> --pr <n> [--dry-run] [options]
//
// Env fallbacks: N8N_URL (for --instance/--url), N8N_API_KEY (for --api-key).
// Exit codes:    0 = ok · 1 = blocked / error · 2 = missing config / auth.

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const EXIT_OK = 0;
const EXIT_ERROR = 1;
const EXIT_CONFIG = 2;

// The exploded package layout. We pack ONLY these (manifest first) so repo files
// like README / scripts / .github never end up in the package sent to the instance.
const PACKAGE_ENTRIES = ['workflows', 'credentials', 'folders', 'projects'];
const BOOLEAN_FLAGS = new Set(['dry-run']);

function parseArgs(argv) {
	const flags = {};
	const positionals = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (!arg.startsWith('--')) {
			positionals.push(arg);
			continue;
		}
		const eq = arg.indexOf('=');
		if (eq !== -1) {
			flags[arg.slice(2, eq)] = arg.slice(eq + 1);
			continue;
		}
		const key = arg.slice(2);
		if (BOOLEAN_FLAGS.has(key)) {
			flags[key] = true;
			continue;
		}
		const next = argv[i + 1];
		if (next === undefined || next.startsWith('--')) {
			flags[key] = true;
		} else {
			flags[key] = next;
			i++;
		}
	}
	return { flags, positionals };
}

function die(message, code) {
	console.error(message);
	process.exit(code);
}

function setGithubOutput(key, value) {
	const file = process.env.GITHUB_OUTPUT;
	if (file) fs.appendFileSync(file, `${key}=${value}\n`);
}

function formatIssue(issue) {
	if (!issue || typeof issue !== 'object') return JSON.stringify(issue);
	if (issue.type === 'credential-unresolved') {
		const used = Array.isArray(issue.usedByWorkflows) ? issue.usedByWorkflows.join(', ') : '';
		const type = issue.expectedType ? ` (${issue.expectedType})` : '';
		return `credential ${issue.sourceId}${type} unresolved [${issue.kind}], used by ${used}`;
	}
	if (typeof issue.type === 'string' && issue.type.startsWith('workflow-')) {
		return `${issue.type}: ${issue.name ?? issue.sourceWorkflowId ?? ''}`;
	}
	return JSON.stringify(issue);
}

// Pack the exploded tree into a gzip tar, manifest.json FIRST (the server reader
// requires the first file entry to be manifest.json). `tar` preserves the order
// of the files listed on the command line.
function packTree(dir) {
	if (!fs.existsSync(dir)) die(`Directory not found: ${dir}`, EXIT_CONFIG);
	if (!fs.existsSync(path.join(dir, 'manifest.json'))) {
		die(`No manifest.json at the root of "${dir}" — expected an exploded n8n package tree.`, EXIT_CONFIG);
	}
	const present = PACKAGE_ENTRIES.filter((entry) => fs.existsSync(path.join(dir, entry)));
	const tmp = path.join(os.tmpdir(), `n8n-deploy-${process.pid}-${Date.now()}.n8np`);
	try {
		execFileSync('tar', ['-czf', tmp, '-C', dir, 'manifest.json', ...present]);
	} catch (error) {
		die(`Failed to pack ${dir}: ${error?.message ?? error}`, EXIT_ERROR);
	}
	const buffer = fs.readFileSync(tmp);
	fs.rmSync(tmp, { force: true });
	return buffer;
}

async function postPackage(url, apiKey, buffer, fields) {
	const form = new FormData();
	form.append('package', new Blob([new Uint8Array(buffer)]), 'package.n8np');
	for (const [key, value] of Object.entries(fields)) {
		if (typeof value === 'string' && value !== '') form.append(key, value);
	}

	let res;
	try {
		res = await fetch(url, { method: 'POST', headers: { 'X-N8N-API-KEY': apiKey }, body: form });
	} catch (error) {
		die(`Could not connect to ${url}: ${error?.message ?? error}`, EXIT_ERROR);
	}

	const text = await res.text();
	let body;
	try {
		body = text ? JSON.parse(text) : {};
	} catch {
		body = { message: text };
	}

	if (!res.ok) {
		const issues = Array.isArray(body?.issues) ? body.issues : [];
		if (issues.length) {
			console.error(['Blocking issues:', ...issues.map((i) => `  - ${formatIssue(i)}`)].join('\n'));
		}
		die(`Error: ${body?.message ?? `Request failed (${res.status})`} (${res.status})`,
			res.status === 401 ? EXIT_CONFIG : EXIT_ERROR);
	}
	return body;
}

// ── main ─────────────────────────────────────────────────────────────────────
const { flags, positionals } = parseArgs(process.argv.slice(2));
const dir = positionals[0] ?? '.';
const base = (flags.instance ?? flags.url ?? process.env.N8N_URL ?? '').replace(/\/+$/, '');
const apiKey = flags['api-key'] ?? process.env.N8N_API_KEY ?? '';
const pr = flags.pr;
const dryRun = flags['dry-run'] === true || flags['dry-run'] === 'true';

if (!base) die('Missing --instance/--url (or N8N_URL).', EXIT_CONFIG);
if (!apiKey) die('Missing --api-key (or N8N_API_KEY).', EXIT_CONFIG);
if (!pr) die('Missing --pr <number>.', EXIT_CONFIG);

const apiBase = base.endsWith('/api/v1') ? base : `${base}/api/v1`;
const fields = {
	projectId: flags.project,
	folderId: flags.folder,
	workflowConflictPolicy: flags['conflict-policy'] ?? 'new-version',
	workflowIdPolicy: flags['workflow-id-policy'] ?? 'source',
	credentialMatchingMode: flags['credential-matching-mode'],
	credentialMissingMode: flags['credential-missing-mode'] ?? 'must-preexist',
};

const buffer = packTree(dir);

if (dryRun) {
	const result = await postPackage(
		`${apiBase}/n8n-packages/validate?pr=${encodeURIComponent(pr)}`,
		apiKey,
		buffer,
		fields,
	);
	const issues = Array.isArray(result.issues) ? result.issues : [];
	if (issues.length === 0) {
		console.log('Validation passed: the package can be safely imported.');
		process.exit(EXIT_OK);
	}
	console.log(['Validation found blocking issues:', ...issues.map((i) => `  - ${formatIssue(i)}`)].join('\n'));
	if (result.bindingUrl) {
		console.log(`\nResolve the required bindings on the target instance, then re-run this job:\n  ${result.bindingUrl}`);
		setGithubOutput('binding_url', result.bindingUrl);
	}
	process.exit(EXIT_ERROR);
}

// Apply: import + publish. `?pr` merges any bind-existing resolutions recorded on prd.
// The server re-gates and returns 409/422 on any blocking issue.
const result = await postPackage(
	`${apiBase}/n8n-packages/import?pr=${encodeURIComponent(pr)}`,
	apiKey,
	buffer,
	{ ...fields, workflowPublishingPolicy: 'publish-all' },
);
console.log(`Deployed PR ${pr}: ${(result.workflows ?? []).length} workflow(s) imported.`);
process.exit(EXIT_OK);
