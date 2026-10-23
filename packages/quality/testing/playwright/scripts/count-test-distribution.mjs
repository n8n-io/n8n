#!/usr/bin/env node
// @ts-check

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseDistributionMatrix, summarizeDistribution } from './distribution-counter.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PLAYWRIGHT_DIR = resolve(SCRIPT_DIR, '..');
const DISTRIBUTOR = resolve(SCRIPT_DIR, 'distribute-tests.mjs');
const REPORTER = resolve(SCRIPT_DIR, 'distribution-counter-reporter.ts');
const PLAYWRIGHT_CLI = createRequire(import.meta.url).resolve('@playwright/test/cli');

function option(name, fallback) {
	const prefix = `--${name}=`;
	return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function changedFiles(value) {
	return value
		.split(/[\n,]/)
		.map((file) => file.trim())
		.filter(Boolean);
}

function run(command, args, env = process.env) {
	const result = spawnSync(command, args, {
		cwd: PLAYWRIGHT_DIR,
		env,
		encoding: 'utf8',
		maxBuffer: 20 * 1024 * 1024,
	});
	if (result.status !== 0) {
		throw new Error(
			[
				`Command failed with status ${String(result.status)} and signal ${String(result.signal)}`,
				result.error?.stack,
				result.stdout,
				result.stderr,
			]
				.filter(Boolean)
				.join('\n'),
		);
	}
	return result.stdout;
}

function resolvePullRequest(pr, repo) {
	const value = JSON.parse(
		run('gh', [
			'pr',
			'view',
			pr,
			'--repo',
			repo,
			'--json',
			'number,url,baseRefOid,headRefOid,files',
		]),
	);
	if (
		typeof value !== 'object' ||
		value === null ||
		typeof value.number !== 'number' ||
		typeof value.url !== 'string' ||
		typeof value.baseRefOid !== 'string' ||
		typeof value.headRefOid !== 'string' ||
		!Array.isArray(value.files)
	) {
		throw new Error('GitHub returned invalid pull request metadata');
	}
	const files = value.files.flatMap((file) =>
		typeof file === 'object' && file !== null && typeof file.path === 'string' ? [file.path] : [],
	);
	return {
		mode: 'pull-request',
		pr: value.number,
		url: value.url,
		repo,
		base: value.baseRefOid,
		head: value.headRefOid,
		files,
	};
}

const shards = Number.parseInt(option('shards', '20'), 10);
const project = option('project', 'multi-main:e2e');
const grepInvert = option('grep-invert', '');
const pr = option('pr', '');
const repo = option('repo', 'n8n-io/n8n');
const files = changedFiles(option('files', ''));
const base = option('base', '');
if (!Number.isInteger(shards) || shards < 1) throw new Error('--shards must be a positive integer');
if (pr && files.length > 0) throw new Error('Use either --pr or --files, not both');

const selection = pr
	? resolvePullRequest(pr, repo)
	: files.length > 0
		? { mode: 'files', base: base || null, files }
		: { mode: 'full', base: null, files: [] };

const distributorArgs = [
	DISTRIBUTOR,
	'--matrix',
	String(shards),
	'--orchestrate',
	'--include-metadata',
	`--project=${project}`,
];
if (grepInvert) distributorArgs.push(`--grep-invert=${grepInvert}`);
if (selection.files.length > 0) {
	distributorArgs.push('--impact', `--files=${selection.files.join(',')}`);
	if (selection.base) distributorArgs.push(`--base=${selection.base}`);
}

const matrix = parseDistributionMatrix(run(process.execPath, distributorArgs));
const tempDir = mkdtempSync(join(tmpdir(), 'distribution-counter-'));

try {
	const byShard = [];
	for (const entry of matrix) {
		if (entry.specs.length === 0) continue;
		const output = join(tempDir, `shard-${entry.shard}.json`);
		run(
			process.execPath,
			[
				PLAYWRIGHT_CLI,
				'test',
				'--list',
				`--project=${project}`,
				'--workers=1',
				`--reporter=${REPORTER}`,
				...(grepInvert ? [`--grep-invert=${grepInvert}`] : []),
				...entry.specs,
			],
			{ ...process.env, DISTRIBUTION_COUNTER_OUTPUT: output },
		);
		const listed = JSON.parse(readFileSync(output, 'utf8'));
		byShard.push({
			shard: entry.shard,
			selectedSpecs: entry.specs.length,
			runnableSpecs: listed.runnableSpecs,
			runnableTests: listed.runnableTests,
			modeledStackStarts: entry.fixtureCount,
			modeledProfiles: entry.fixturePools,
			stackStarts: listed.profiles.length,
			extraStackStarts: listed.profiles.length - entry.fixtureCount,
			testTime: entry.testTime,
			capabilities: entry.capabilities,
			services: entry.services,
			images: entry.images,
			profiles: listed.profiles,
		});
	}

	console.log(JSON.stringify(summarizeDistribution(project, selection, matrix, byShard), null, 2));
} finally {
	rmSync(tempDir, { recursive: true, force: true });
}
