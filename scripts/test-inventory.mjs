#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, globSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const USAGE = `Usage: pnpm test:inventory -- [flags]

Lists the Vitest suites that the unit and integration CI jobs select.
The default mode lists test files without importing test modules. Use dynamic
mode when you need expanded test-case counts.

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
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`${flag} must be a positive integer`);
	}
	return parsed;
}

const concurrency = positiveInteger(values.concurrency, '--concurrency');
const timeoutSeconds = positiveInteger(
	values.timeout ?? (values.dynamic ? '600' : '60'),
	'--timeout',
);

function hasVitestScript(packageJson, name) {
	return packageJson.scripts?.[name]?.includes('vitest') ?? false;
}

function configFromScript(script) {
	return script.match(/--config(?:=|\s+)([^\s]+)/)?.[1];
}

function filePath(file, target) {
	const path = file.replace(/^\[[^\]]+\]\s+/, '');
	return relative(REPO_ROOT, isAbsolute(path) ? path : join(REPO_ROOT, target.dir, path));
}

function listedFiles(output, target) {
	return [
		...new Set(
			output
				.split(/\r?\n/)
				.map((line) => line.trim())
				.filter((line) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(line))
				.map((line) => filePath(line, target)),
		),
	]
		.sort()
		.map((path) => ({ path, tests: null }));
}

function unitTarget(packageJson, packageDir) {
	const isFrontend =
		packageDir.startsWith('packages/frontend/') ||
		/^packages\/modules\/[^/]+\/frontend$/.test(packageDir);

	if (isFrontend && hasVitestScript(packageJson, 'test')) {
		return {
			lane: 'frontend-unit',
			scope: packageJson.scripts?.['test:changed'] ? 'changed' : 'nightly only',
			script: 'test',
		};
	}
	if (packageJson.name === 'n8n' && hasVitestScript(packageJson, 'test:unit')) {
		return { lane: 'cli-unit', scope: 'changed', script: 'test:unit' };
	}
	if (packageJson.name === 'n8n-nodes-base' && hasVitestScript(packageJson, 'test')) {
		return { lane: 'nodes-unit', scope: 'changed', script: 'test' };
	}
	if (hasVitestScript(packageJson, 'test:unit')) {
		return { lane: 'backend-unit', scope: 'full', script: 'test:unit' };
	}
	if (hasVitestScript(packageJson, 'test')) {
		return { lane: 'not-in-unit-ci', scope: 'not run', script: 'test' };
	}
	return undefined;
}

function integrationTarget(packageJson) {
	if (!hasVitestScript(packageJson, 'test:integration')) return undefined;
	return {
		lane: packageJson.name === 'n8n' ? 'cli-integration' : 'backend-integration',
		scope: packageJson.name === 'n8n' ? 'changed' : 'full',
		script: 'test:integration',
	};
}

let targets = [];
for (const packageFile of globSync('packages/**/package.json', {
	cwd: REPO_ROOT,
	exclude: ['**/dist/**', '**/node_modules/**'],
})) {
	const packageDir = dirname(packageFile);
	const packageJson = JSON.parse(readFileSync(join(REPO_ROOT, packageFile), 'utf8'));
	for (const target of [unitTarget(packageJson, packageDir), integrationTarget(packageJson)]) {
		if (!target) continue;
		const script = packageJson.scripts[target.script];
		targets.push({
			...target,
			config: configFromScript(script),
			dir: packageDir,
			package: packageJson.name,
		});
	}
}
if (values.package) targets = targets.filter((target) => target.package === values.package);
if (!targets.length) {
	const error = 'No matching Vitest package or CI target was found';
	if (values.json) {
		process.stdout.write(`${JSON.stringify({ schemaVersion: 1, error })}\n`);
	} else {
		process.stderr.write(`${error}\n`);
	}
	process.exit(1);
}
const outputDir = mkdtempSync(join(tmpdir(), 'n8n-test-inventory-'));

function collect(target, index) {
	return new Promise((resolve) => {
		const outputFile = join(outputDir, `${index}.json`);
		const args = [
			'exec',
			'vitest',
			'list',
			...(values.dynamic ? [`--json=${outputFile}`] : ['--filesOnly']),
			'--passWithNoTests',
			'--no-color',
			...(target.config ? ['--config', target.config] : []),
		];
		const child = spawn('pnpm', args, {
			cwd: join(REPO_ROOT, target.dir),
			detached: true,
			env: {
				...process.env,
				CI: 'false',
				COVERAGE_ENABLED: 'false',
				DB_SQLITE_POOL_SIZE: '4',
				DB_TYPE: 'sqlite',
				N8N_LOG_LEVEL: 'silent',
				TZ: 'UTC',
			},
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let stderr = '';
		let stdout = '';
		let settled = false;
		let activePid = child.pid;

		const finish = (result) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve({ ...target, ...result });
		};
		const timer = setTimeout(() => {
			try {
				process.kill(-activePid, 'SIGKILL');
			} catch {}
			finish({ error: `timed out after ${timeoutSeconds}s` });
		}, timeoutSeconds * 1000);
		const collectFiles = () => {
			const fallback = spawn(
				'pnpm',
				[
					'exec',
					'vitest',
					'list',
					'--filesOnly',
					'--passWithNoTests',
					'--no-color',
					...(target.config ? ['--config', target.config] : []),
				],
				{
					cwd: join(REPO_ROOT, target.dir),
					detached: true,
					env: {
						...process.env,
						CI: 'false',
						COVERAGE_ENABLED: 'false',
						DB_SQLITE_POOL_SIZE: '4',
						DB_TYPE: 'sqlite',
						N8N_LOG_LEVEL: 'silent',
						TZ: 'UTC',
					},
					stdio: ['ignore', 'pipe', 'pipe'],
				},
			);
			activePid = fallback.pid;
			let fileOutput = '';
			let fallbackError = '';
			fallback.stdout.on('data', (data) => (fileOutput += data));
			fallback.stderr.on('data', (data) => (fallbackError += data));
			fallback.on('error', (error) => finish({ error: error.message }));
			fallback.on('close', (code) => {
				if (code !== 0) {
					finish({
						error: `file listing exited with ${code}: ${fallbackError.trim().slice(-500)}`,
					});
					return;
				}
				const fileCounts = listedFiles(fileOutput, target);
				finish({
					files: fileCounts.length,
					fileCounts,
					tests: null,
					warning: 'Vitest static parsing could not count this package. File count is available.',
				});
			});
		};

		child.stdout.on('data', (data) => (stdout += data));
		child.stderr.on('data', (data) => (stderr += data));
		child.on('error', (error) => finish({ error: error.message }));
		child.on('close', (code) => {
			if (code !== 0) {
				finish({ error: `exited with ${code}: ${stderr.trim().slice(-500)}` });
				return;
			}
			if (!values.dynamic) {
				const fileCounts = listedFiles(stdout, target);
				finish({ files: fileCounts.length, fileCounts, tests: null });
				return;
			}
			try {
				const serialized = existsSync(outputFile) ? readFileSync(outputFile, 'utf8') : stdout;
				let tests;
				try {
					tests = JSON.parse(serialized);
				} catch {
					const start = serialized.lastIndexOf('\n[');
					const end = serialized.lastIndexOf(']');
					if (start === -1 || end === -1) throw new Error('Vitest did not produce JSON');
					tests = JSON.parse(serialized.slice(start + 1, end + 1));
				}
				const counts = new Map();
				for (const test of tests) {
					const path = filePath(test.file, target);
					counts.set(path, (counts.get(path) ?? 0) + 1);
				}
				const fileCounts = [...counts]
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([path, count]) => ({ path, tests: count }));
				finish({ files: fileCounts.length, fileCounts, tests: tests.length });
			} catch {
				collectFiles();
			}
		});
	});
}

const results = [];
let next = 0;
await Promise.all(
	Array.from({ length: concurrency }, async () => {
		while (next < targets.length) {
			const index = next++;
			results[index] = await collect(targets[index], index);
		}
	}),
);
rmSync(outputDir, { recursive: true, force: true });

results.sort(
	(a, b) =>
		a.lane.localeCompare(b.lane) ||
		(b.tests ?? -1) - (a.tests ?? -1) ||
		a.package.localeCompare(b.package),
);

const laneMap = new Map();
for (const result of results) {
	const lane = laneMap.get(result.lane) ?? {
		lane: result.lane,
		packages: 0,
		files: 0,
		tests: 0,
		errors: 0,
		missingCaseCounts: 0,
	};
	lane.packages++;
	lane.files += result.files ?? 0;
	lane.tests += result.tests ?? 0;
	lane.errors += result.error ? 1 : 0;
	lane.missingCaseCounts += values.dynamic && result.tests == null ? 1 : 0;
	laneMap.set(result.lane, lane);
}

const lanes = [...laneMap.values()].sort((a, b) => a.lane.localeCompare(b.lane));
if (!values.dynamic) {
	for (const lane of lanes) {
		lane.tests = null;
		lane.missingCaseCounts = 0;
	}
}
const ciLanes = lanes.filter(({ lane }) => lane !== 'not-in-unit-ci');
const ciResults = results.filter(({ lane }) => lane !== 'not-in-unit-ci');
const output = {
	schemaVersion: 1,
	mode: values.dynamic ? 'dynamic' : 'files',
	note: values.dynamic
		? 'Dynamic mode counts configured test cases. Change-scoped CI jobs may run fewer tests.'
		: 'File mode counts configured test files. Change-scoped CI jobs may run fewer files. Use --dynamic for case counts.',
	ci: {
		packages: new Set(ciResults.map((result) => result.package)).size,
		targets: ciResults.length,
		files: ciLanes.reduce((total, lane) => total + lane.files, 0),
		tests: values.dynamic ? ciLanes.reduce((total, lane) => total + lane.tests, 0) : null,
		missingCaseCounts: values.dynamic
			? ciLanes.reduce((total, lane) => total + lane.missingCaseCounts, 0)
			: 0,
		errors: ciLanes.reduce((total, lane) => total + lane.errors, 0),
	},
	lanes,
	packages: results,
};

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
	const line = (values) =>
		values.map((value, index) => String(value).padEnd(widths[index])).join('  ');
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
process.stdout.write(`${table(lanes, laneColumns)}\n\n`);
const packageColumns = [
	{ header: 'Package', value: (row) => row.package },
	{ header: 'CI lane', value: (row) => row.lane },
	{ header: 'CI scope', value: (row) => row.scope },
	{ header: 'Files', value: (row) => row.files ?? '-' },
	...(values.dynamic ? [{ header: 'Expanded cases', value: (row) => row.tests ?? '-' }] : []),
];
process.stdout.write(`${table(results, packageColumns)}\n`);

const errors = results.filter((result) => result.error);
if (errors.length) {
	process.stderr.write('\nCollection errors:\n');
	for (const error of errors) process.stderr.write(`- ${error.package}: ${error.error}\n`);
}
process.exit(errors.length ? 1 : 0);
