#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { parseArgs, promisify } from 'node:util';

import { vitestWindow } from './vitest-phase-markers.mjs';

const exec = promisify(execFile);
const USAGE = `Usage: pnpm profile:ci-tests -- --run <GitHub Actions run ID> [flags]

Profile the Unit tests jobs of a completed CI workflow run. Requires gh auth.
All percentages use each job's elapsed time as the denominator.

Phases:
  runnerSetup   Job start through test step start (includes checkout, install, build)
  vitestSetup   Test step start through first test module start
  vitestRun     First test module start through last test module end
  teardown      Last test module end through job end (includes coverage and uploads)

Vitest setup and run require phase markers from an instrumented CI run.
Old runs show null for both and retain the unsplit test-command duration.
Cache counts include all Turbo tasks in the test step, including dependencies.

Flags:
  --run <id>               Completed GitHub Actions workflow run ID
  --repo <owner/name>       GitHub repository (default: n8n-io/n8n)
  --node-version <version>  Select a named Node-version matrix (master runs only)
  --json                    Print a single JSON document
  -h, --help                Show this help
`;

const { values } = parseArgs({
	args: process.argv[2] === '--' ? process.argv.slice(3) : process.argv.slice(2),
	options: {
		run: { type: 'string' },
		repo: { type: 'string', default: 'n8n-io/n8n' },
		'node-version': { type: 'string' },
		json: { type: 'boolean', default: false },
		help: { type: 'boolean', short: 'h', default: false },
	},
	strict: true,
});

if (values.help) {
	process.stdout.write(USAGE);
	process.exit(0);
}
if (!/^\d+$/.test(values.run ?? '')) throw new Error('--run must be a GitHub Actions run ID');
if (!/^[\w.-]+\/[\w.-]+$/.test(values.repo)) throw new Error('--repo must be owner/name');

async function ghApi(endpoint, log = false) {
	const { stdout } = await exec(
		'gh',
		['api', ...(log ? ['--allow-escape-sequences'] : []), endpoint],
		{ maxBuffer: 32 * 1024 * 1024 },
	);
	return stdout;
}

async function runJobs() {
	const jobs = [];
	for (let page = 1; ; page++) {
		const response = JSON.parse(
			await ghApi(`repos/${values.repo}/actions/runs/${values.run}/jobs?per_page=100&page=${page}`),
		);
		jobs.push(...response.jobs);
		if (response.jobs.length < 100) return jobs;
	}
}

function seconds(start, end) {
	const elapsed = (Date.parse(end) - Date.parse(start)) / 1000;
	if (!Number.isFinite(elapsed) || elapsed < 0) throw new Error('Invalid job step timestamps');
	return elapsed;
}

function phaseProfile(job) {
	const match = job.name.match(
		/^Unit tests(?: \(([^)]+)\))? \/ (Backend Unit Tests|CLI Unit Tests(?: \(\d+\/\d+\))?|Backend Integration Tests|CLI Integration Tests(?: \(\d+\/\d+\))?|Nodes Unit Tests|Frontend \(\d+\/\d+\))$/,
	);
	if (!match || (values['node-version'] && match[1] !== values['node-version'])) return null;
	if (job.conclusion !== 'success') return null;
	const test = job.steps.find((step) =>
		/^(?:Test$|Test Unit \(|Test Integration \(|Test Nodes$)/.test(step.name),
	);
	if (!test || test.conclusion !== 'success') return null;
	const totalSeconds = seconds(job.started_at, job.completed_at);
	const phases = {
		runnerSetup: seconds(job.started_at, test.started_at),
		vitestSetup: null,
		vitestRun: null,
		teardown: seconds(test.completed_at, job.completed_at),
	};
	return {
		id: job.id,
		name: job.name,
		entryPoint: match[2].replace(/ \(\d+\/\d+\)$/, ''),
		nodeVersion: match[1] ?? null,
		totalSeconds,
		phases,
		phasePercent: percent(phases, totalSeconds),
		unattributedTestCommandSeconds: seconds(test.started_at, test.completed_at),
		testStep: { startedAt: test.started_at, completedAt: test.completed_at },
		completedAt: job.completed_at,
	};
}

function percent(phases, totalSeconds) {
	return Object.fromEntries(
		Object.entries(phases).map(([name, duration]) => [
			name,
			duration === null ? null : (duration / totalSeconds) * 100,
		]),
	);
}

function testCache(log, testStep) {
	const clean = log.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '');
	const summaries = [];
	const startedAt = Date.parse(testStep.startedAt);
	const completedAt = Date.parse(testStep.completedAt);
	for (const line of clean.split(/\r?\n/)) {
		const timestamp = line.match(/^(\d{4}-\d\d-\d\dT[^Z]+Z)/)?.[1];
		if (!timestamp) continue;
		const time = Date.parse(timestamp);
		if (time < startedAt - 1000 || time > completedAt + 1000) continue;
		const cached = line.match(/Cached:\s+(\d+) cached, (\d+) total/);
		if (cached) summaries.push({ cached: Number(cached[1]), total: Number(cached[2]) });
	}
	return summaries.at(-1) ?? null;
}

function testActivity(log, cache) {
	if (cache?.total > 0 && cache.cached === cache.total) return 'fully-cached';
	const clean = log.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '');
	if (/Test Files\s+\d+ (?:passed|failed)/.test(clean)) return 'test-results-reported';
	if (/\[janitor:test-scoped\].*skipping/.test(clean)) return 'skipped';
	if (/\[janitor:test-scoped\].*(?:→ full suite|scoping to [1-9]\d* file\(s\))/.test(clean))
		return 'test-run-invoked';
	return 'unknown';
}

function addVitestPhases(job, log) {
	const window = vitestWindow(log, job.testStep.startedAt, job.testStep.completedAt);
	if (!window) return;
	const setupStart = Date.parse(job.testStep.startedAt);
	const end = Date.parse(job.completedAt);
	job.phases.vitestSetup = (window.first - setupStart) / 1000;
	job.phases.vitestRun = (window.last - window.first) / 1000;
	job.phases.teardown = (end - window.last) / 1000;
	job.phasePercent = percent(job.phases, job.totalSeconds);
	job.unattributedTestCommandSeconds = null;
	job.profiledVitestProcesses = window.processes;
}

function groupEntries(jobs) {
	const groups = new Map();
	for (const job of jobs) {
		const key = `${job.nodeVersion ?? 'workflow-default'}/${job.entryPoint}`;
		const group = groups.get(key) ?? [];
		group.push(job);
		groups.set(key, group);
	}
	return [...groups.values()]
		.map((group) => {
			const slowest = group.reduce((a, b) => (a.totalSeconds >= b.totalSeconds ? a : b));
			return {
				entryPoint: slowest.entryPoint,
				nodeVersion: slowest.nodeVersion,
				shards: group.length,
				slowestJobId: slowest.id,
				elapsedSeconds: slowest.totalSeconds,
				phases: slowest.phases,
				phasePercent: slowest.phasePercent,
				unattributedTestCommandSeconds: slowest.unattributedTestCommandSeconds,
				profiledVitestProcesses: slowest.profiledVitestProcesses ?? 0,
				cache: slowest.cache,
				activity: slowest.activity,
			};
		})
		.sort((a, b) => b.elapsedSeconds - a.elapsedSeconds);
}

function table(entries) {
	const column = (value, width) => String(value).padStart(width);
	return [
		'Node     Entry point                  Jobs  Total   Runner setup  Vitest setup  Vitest run  Teardown  Turbo cache  Activity               Unsplit test step',
		...entries.map((row) =>
			[
				(row.nodeVersion ?? 'default').padEnd(8),
				row.entryPoint.padEnd(28),
				column(row.shards, 4),
				column(`${row.elapsedSeconds}s`, 6),
				column(`${row.phasePercent.runnerSetup.toFixed(1)}%`, 13),
				column(
					row.phasePercent.vitestSetup === null
						? '—'
						: `${row.phasePercent.vitestSetup.toFixed(1)}%`,
					12,
				),
				column(
					row.phasePercent.vitestRun === null ? '—' : `${row.phasePercent.vitestRun.toFixed(1)}%`,
					10,
				),
				column(`${row.phasePercent.teardown.toFixed(1)}%`, 10),
				row.cache ? `${row.cache.cached}/${row.cache.total}` : '?',
				row.activity.padEnd(22),
				row.unattributedTestCommandSeconds === null ? '' : `${row.unattributedTestCommandSeconds}s`,
			].join(' '),
		),
	].join('\n');
}

async function main() {
	const run = JSON.parse(await ghApi(`repos/${values.repo}/actions/runs/${values.run}`));
	if (run.status !== 'completed') throw new Error('The workflow run must be complete');
	const jobs = (await runJobs()).map(phaseProfile).filter(Boolean);
	if (!jobs.length)
		throw new Error('No successful Unit tests jobs matched this run and Node version');
	for (const job of jobs) {
		try {
			const log = await ghApi(`repos/${values.repo}/actions/jobs/${job.id}/logs`, true);
			job.cache = testCache(log, job.testStep);
			job.activity = testActivity(log, job.cache);
			addVitestPhases(job, log);
		} catch {
			job.cache = null;
			job.activity = 'unknown';
		}
	}
	const output = {
		schemaVersion: 1,
		source: `https://github.com/${values.repo}/actions/runs/${values.run}`,
		run: {
			id: run.id,
			name: run.name,
			createdAt: run.created_at,
			conclusion: run.conclusion,
			headSha: run.head_sha,
			attempt: run.run_attempt,
		},
		definitions: {
			runnerSetup:
				'Job start to test command start (includes checkout, setup-nodejs, install, and Build)',
			vitestSetup: 'Test step start to first instrumented test module start',
			vitestRun:
				'First instrumented test module start to last module end (includes overlapping module setup)',
			teardown:
				'With markers: last test module end to job end (includes coverage and uploads). Without markers: test step end to job end.',
		},
		entryPoints: groupEntries(jobs),
		jobs,
	};
	if (values.json) process.stdout.write(`${JSON.stringify(output)}\n`);
	else {
		process.stdout.write(`${table(output.entryPoints)}\n`);
		process.stdout.write(
			'Percentages use the slowest shard per entry point. Old or cached jobs have an unsplit test step.\n',
		);
	}
}

main().catch((error) => {
	process.stderr.write(`ci-test-phase-profile: ${error.message}\n`);
	process.exitCode = 1;
});
