#!/usr/bin/env node
// Runs the anti-slop rules that existing code still breaks, and reports only
// the hits on lines that this branch adds. Old violations do not fail the check.
//
// Usage: node scripts/lint-anti-slop-new-code.mjs [base-ref]   (default: origin/master)

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 }).trim();

const root = git('rev-parse', '--show-toplevel');
process.chdir(root);

const baseRef = process.argv[2] ?? 'origin/master';
const mergeBase = git('merge-base', baseRef, 'HEAD');
const configDir = path.join(root, 'packages/@n8n/oxlint-config');

/** Map of file -> Set of added line numbers. Compares against the working tree, so uncommitted edits count. */
function addedLines() {
	const diff = git(
		'diff',
		'-U0',
		'--no-color',
		'--no-ext-diff',
		'--diff-filter=AMR',
		mergeBase,
		'--',
		'*.ts',
		'*.mts',
		'*.cts',
		'*.tsx',
		'*.js',
		'*.mjs',
		'*.vue',
	);
	const added = new Map();
	let file;
	for (const line of diff.split('\n')) {
		if (line.startsWith('+++ ')) {
			file = line === '+++ /dev/null' ? undefined : line.slice('+++ b/'.length);
			if (file) added.set(file, new Set());
			continue;
		}
		const hunk = /^@@ -\S+ \+(\d+)(?:,(\d+))? @@/.exec(line);
		if (!hunk || !file) continue;
		const start = Number(hunk[1]);
		const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
		for (let n = start; n < start + count; n++) added.get(file).add(n);
	}
	return added;
}

/** Only packages that lint with Oxlint take part. */
function isOxlintPackageFile(file) {
	if (file.endsWith('.d.ts') || /(^|\/)(dist|node_modules)\//.test(file)) return false;
	for (let dir = path.dirname(file); dir !== '.' && dir !== '/'; dir = path.dirname(dir)) {
		if (existsSync(path.join(dir, 'oxlint.config.mts'))) return true;
	}
	return false;
}

const added = addedLines();
const files = [...added.keys()].filter((f) => added.get(f).size > 0 && isOxlintPackageFile(f));
if (files.length === 0) {
	console.log('anti-slop: no changed files in Oxlint packages.');
	process.exit(0);
}

const result = spawnSync(
	path.join(configDir, 'node_modules/.bin/oxlint'),
	['-c', path.join(configDir, 'anti-slop-new-code.json'), '-f', 'json', ...files],
	{ encoding: 'utf8', maxBuffer: 1 << 28 },
);
const jsonStart = result.stdout.indexOf('{');
if (jsonStart === -1) {
	console.error(result.stdout, result.stderr);
	process.exit(2);
}
const { diagnostics } = JSON.parse(result.stdout.slice(jsonStart));

const onAddedLines = diagnostics.filter((d) => {
	const span = d.labels?.[0]?.span;
	return span && added.get(d.filename)?.has(span.line);
});

const inCi = process.env.GITHUB_ACTIONS === 'true';
for (const d of onAddedLines) {
	const { line, column } = d.labels[0].span;
	const rule = d.code.replace(/^anti-slop\((.*)\)$/, 'anti-slop/$1');
	const message = [d.message, d.help].filter(Boolean).join(' ');
	console.log(
		inCi
			? `::error file=${d.filename},line=${line},col=${column},title=${rule}::${message}`
			: `${d.filename}:${line}:${column}  ${rule}  ${message}`,
	);
}

console.log(
	`anti-slop: ${onAddedLines.length} on added lines (${diagnostics.length} in the ${files.length} changed files).`,
);
process.exit(onAddedLines.length > 0 ? 1 : 0);
