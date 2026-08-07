#!/usr/bin/env node
/**
 * Build a per-thread skeleton JSON for a LangSmith instance-ai eval experiment.
 * Groups the experiment's root runs by test case + iteration. Enrich the output
 * with scripts/enrich-thread-cost-json.mjs, then verify with
 * scripts/verify-thread-cost-json.mjs.
 */

import fs from 'node:fs';
import { createRequire } from 'node:module';

const TENANT = '27a59feb-374e-458b-be53-df2f86940838';
const TRACE_PROJECT = 'instance-ai-evals';

// langsmith isn't hoisted to the repo root; fall back to resolving through
// @n8n/instance-ai, which depends on it.
function requireLangsmith() {
	const bases = [
		import.meta.url,
		new URL('../packages/@n8n/instance-ai/node_modules/_resolve.js', import.meta.url),
	];
	for (const base of bases) {
		try {
			return createRequire(base)('langsmith');
		} catch {}
	}
	throw new Error('Cannot resolve the langsmith SDK. Run pnpm install first.');
}

const { Client } = requireLangsmith();

const args = process.argv.slice(2);
function arg(name) {
	const i = args.indexOf(name);
	return i >= 0 ? args[i + 1] : undefined;
}

const SESSION = arg('--session');
const OUT = arg('--out');

if (!SESSION) {
	console.error('Usage: --session <session-uuid-or-experiment-name> [--out <file.json>]');
	process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(SESSION);

async function listRootRuns(client, sessionId) {
	for (let attempt = 0; attempt < 12; attempt++) {
		try {
			const runs = [];
			for await (const run of client.listRuns({
				projectId: sessionId,
				isRoot: true,
				select: ['id', 'inputs', 'outputs'],
			})) {
				runs.push(run);
			}
			return runs;
		} catch (e) {
			if (e.status === 429 || String(e.message).includes('429')) {
				const wait = 5000 * (attempt + 1);
				console.error(`429 listing root runs, wait ${wait}ms`);
				await sleep(wait);
				continue;
			}
			throw e;
		}
	}
	throw new Error('rate limited listing root runs');
}

async function main() {
	const client = new Client({
		apiKey: process.env.LANGSMITH_API_KEY,
		apiUrl: process.env.LANGSMITH_ENDPOINT,
		workspaceId: TENANT,
	});

	const project = await client.readProject(
		isUuid ? { projectId: SESSION } : { projectName: SESSION },
	);
	const meta = project.extra?.metadata ?? {};
	const roots = await listRootRuns(client, project.id);

	// Root runs are one per scenario; scenarios of the same test case + iteration
	// share a single build thread.
	const byThread = new Map();
	for (const run of roots) {
		const testCase = run.inputs?.testCaseFile;
		const iteration = run.inputs?._iteration;
		const scenario = run.inputs?.scenarioName;
		const threadId = run.outputs?.threadId;
		if (!testCase || threadId == null) {
			console.warn(`skipping root run ${run.id}: missing testCaseFile or outputs.threadId`);
			continue;
		}
		const key = `${testCase}|${iteration}`;
		if (!byThread.has(key)) {
			byThread.set(key, { testCase, iteration, threadId, scenarios: new Set() });
		}
		const entry = byThread.get(key);
		if (entry.threadId !== threadId) {
			console.warn(`thread mismatch for ${key}: ${entry.threadId} vs ${threadId}`);
		}
		entry.scenarios.add(scenario);
	}

	const entries = [...byThread.values()].sort(
		(a, b) => a.testCase.localeCompare(b.testCase) || a.iteration - b.iteration,
	);

	const evalsMap = new Map();
	for (const e of entries) {
		if (!evalsMap.has(e.testCase)) evalsMap.set(e.testCase, []);
		evalsMap.get(e.testCase).push({
			iteration: e.iteration,
			threadId: e.threadId,
			scenarios: [...e.scenarios].sort(),
		});
	}

	const data = {
		experiment: project.name,
		sessionId: project.id,
		datasetId: project.reference_dataset_id ?? null,
		traceProject: TRACE_PROJECT,
		githubRunId: meta.runId ?? null,
		branch: meta.branch ?? meta.git?.branch ?? null,
		iterations: meta.iterations ?? null,
		targetRuns: roots.length,
		uniqueThreads: entries.length,
		evals: [...evalsMap.entries()].map(([testCase, threads]) => ({ testCase, threads })),
		rows: entries.map((e) => ({
			testCase: e.testCase,
			iteration: e.iteration,
			threadId: e.threadId,
			scenarios: [...e.scenarios].sort().map((s) => `${e.testCase}/${s}`),
		})),
	};

	const outFile = OUT ?? `${project.name}-threads.json`;
	fs.writeFileSync(outFile, JSON.stringify(data, null, 2) + '\n');
	console.log(
		`Wrote ${outFile}: ${entries.length} threads across ${evalsMap.size} evals (${roots.length} root runs)`,
	);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
