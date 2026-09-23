#!/usr/bin/env node

import { globSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

import {
	aggregateInventory,
	collectTarget,
	configFromScript,
	integrationTarget,
	unitTarget,
} from './test-inventory-core.mjs';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const USAGE = `Usage: pnpm test:inventory -- [flags]

Lists the Vitest suites that unit and integration CI jobs select.
File mode lists configured test files. Dynamic mode imports modules and counts cases.
Change-scoped PR jobs may run fewer tests than the configured totals.

Flags:
  --dynamic          Import test modules and expand generated test cases
  --package <name>   Only inspect one workspace package
  --json             Print JSON instead of a table
  --concurrency <n>  Package collections to run at once (default: 4)
  --timeout <secs>   Timeout for each package (default: 60 files, 600 dynamic)
  -h, --help         Show this help
`;

const { values } = parseArgs({
	args: process.argv[2] === '--' ? process.argv.slice(3) : process.argv.slice(2),
	options: {
		concurrency: { type: 'string', default: '4' },
		dynamic: { type: 'boolean', default: false },
		help: { type: 'boolean', short: 'h', default: false },
		json: { type: 'boolean', default: false },
		package: { type: 'string' },
		timeout: { type: 'string' },
	},
	strict: true,
});

if (values.help) {
	process.stdout.write(USAGE);
	process.exit(0);
}

function positiveInteger(value, flag) {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${flag} must be positive`);
	return parsed;
}

const concurrency = positiveInteger(values.concurrency, '--concurrency');
const timeoutSeconds = positiveInteger(
	values.timeout ?? (values.dynamic ? '600' : '60'),
	'--timeout',
);

let targets = [];
for (const packageFile of globSync('packages/**/package.json', {
	cwd: REPO_ROOT,
	exclude: ['**/dist/**', '**/node_modules/**'],
})) {
	const packageDir = dirname(packageFile);
	const packageJson = JSON.parse(readFileSync(join(REPO_ROOT, packageFile), 'utf8'));
	for (const target of [unitTarget(packageJson, packageDir), integrationTarget(packageJson)]) {
		if (!target) continue;
		targets.push({
			...target,
			config: configFromScript(packageJson.scripts[target.script]),
			dir: packageDir,
			package: packageJson.name,
		});
	}
}
if (values.package) targets = targets.filter((target) => target.package === values.package);
if (!targets.length) {
	const error = 'No matching Vitest package or CI target was found';
	if (values.json) process.stdout.write(`${JSON.stringify({ schemaVersion: 1, error })}\n`);
	else process.stderr.write(`${error}\n`);
	process.exit(1);
}

const outputDir = mkdtempSync(join(tmpdir(), 'n8n-test-inventory-'));
const results = [];
let next = 0;
try {
	await Promise.all(
		Array.from({ length: Math.min(concurrency, targets.length) }, async () => {
			while (next < targets.length) {
				const index = next++;
				results[index] = await collectTarget(targets[index], index, {
					outputDir,
					dynamic: values.dynamic,
					timeoutSeconds,
					repoRoot: REPO_ROOT,
				});
			}
		}),
	);
} finally {
	rmSync(outputDir, { recursive: true, force: true });
}

const output = aggregateInventory(results, values.dynamic);
if (values.json) {
	await new Promise((resolve) =>
		process.stdout.write(`${JSON.stringify(output, null, 2)}\n`, resolve),
	);
	process.exit(results.some((result) => result.error) ? 1 : 0);
}

function table(rows, columns) {
	const widths = columns.map(({ header, value }) =>
		Math.max(header.length, ...rows.map((row) => String(value(row)).length)),
	);
	const line = (cells) =>
		cells.map((value, index) => String(value).padEnd(widths[index])).join('  ');
	return [
		line(columns.map(({ header }) => header)),
		line(widths.map((width) => '-'.repeat(width))),
		...rows.map((row) => line(columns.map(({ value }) => value(row)))),
	].join('\n');
}

process.stdout.write(`${output.note}\n\n`);
const laneColumns = [
	{ header: 'CI lane', value: (row) => row.lane },
	{ header: 'Packages', value: (row) => row.packages },
	{ header: 'Files', value: (row) => row.files },
	...(values.dynamic
		? [
				{ header: 'Expanded cases', value: (row) => row.tests },
				{ header: 'Missing counts', value: (row) => row.missingCaseCounts || '' },
			]
		: []),
	{ header: 'Errors', value: (row) => row.errors || '' },
];
process.stdout.write(`${table(output.lanes, laneColumns)}\n\n`);
const packageColumns = [
	{ header: 'Package', value: (row) => row.package },
	{ header: 'CI lane', value: (row) => row.lane },
	{ header: 'CI scope', value: (row) => row.scope },
	{ header: 'Files', value: (row) => row.files ?? '-' },
	...(values.dynamic ? [{ header: 'Expanded cases', value: (row) => row.tests ?? '-' }] : []),
];
process.stdout.write(`${table(output.packages, packageColumns)}\n`);

const errors = results.filter((result) => result.error);
if (errors.length) {
	process.stderr.write('\nCollection errors:\n');
	for (const error of errors) process.stderr.write(`- ${error.package}: ${error.error}\n`);
}
process.exitCode = errors.length ? 1 : 0;
