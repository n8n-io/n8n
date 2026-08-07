#!/usr/bin/env node
/**
 * Verify a threads JSON against LangSmith by re-fetching LLM spans per thread
 * and recomputing metrics. Read-only: never modifies the input file.
 */

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Client } = require('langsmith');

const TENANT = '27a59feb-374e-458b-be53-df2f86940838';
const TRACE_PROJECT = 'instance-ai-evals';

const args = process.argv.slice(2);
function arg(name) {
	const i = args.indexOf(name);
	return i >= 0 ? args[i + 1] : undefined;
}

const INPUT_FILE = arg('--input');
const DELAY_MS = Number(arg('--delay-ms') ?? '3000');
const CHECKPOINT = arg('--checkpoint');

if (!INPUT_FILE) {
	console.error('Usage: --input <threads.json> [--checkpoint <file.json>] [--delay-ms <ms>]');
	process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function num(v) {
	return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function extractCache(run) {
	const usage = run.outputs?.usage || run.outputs?.token_usage || run.extra?.metadata?.usage || {};
	const inputDetails =
		run.prompt_token_details ||
		run.prompt_tokens_details ||
		run.input_token_details ||
		usage.input_token_details ||
		usage.prompt_tokens_details ||
		{};
	const meta = run.extra?.metadata || {};
	const cacheRead =
		num(inputDetails.cache_read) ||
		num(inputDetails.cached_read) ||
		num(inputDetails.cache_read_input_tokens) ||
		num(meta.cache_read_input_tokens) ||
		num(meta.anthropic_cache_read_input_tokens) ||
		num(usage.cache_read_input_tokens);
	const cacheWrite =
		num(inputDetails.cache_creation) ||
		num(inputDetails.cache_creation_input_tokens) ||
		num(meta.cache_creation_input_tokens) ||
		num(meta.anthropic_cache_creation_input_tokens) ||
		num(usage.cache_creation_input_tokens);
	return { cacheRead, cacheWrite };
}

function aggregateLlmRuns(llmRuns) {
	let cost = 0;
	let prompt = 0;
	let completion = 0;
	let total = 0;
	let cacheRead = 0;
	let cacheWrite = 0;
	for (const run of llmRuns) {
		const c = extractCache(run);
		cacheRead += c.cacheRead;
		cacheWrite += c.cacheWrite;
		cost += num(run.total_cost);
		prompt += num(run.prompt_tokens);
		completion += num(run.completion_tokens);
		total += num(run.total_tokens);
	}
	return {
		llmSpans: llmRuns.length,
		inputTokens: prompt,
		outputTokens: completion,
		totalTokens: total,
		cacheReadTokens: cacheRead,
		cacheWriteTokens: cacheWrite,
		uncachedInputTokens: Math.max(0, prompt - cacheRead - cacheWrite),
		cacheHitRate: prompt > 0 ? +(cacheRead / prompt).toFixed(4) : 0,
		costUsd: +cost.toFixed(4),
	};
}

async function listThreadLlmRuns(client, projectId, threadId) {
	for (let attempt = 0; attempt < 12; attempt++) {
		try {
			const runs = [];
			for await (const run of client.listRuns({
				projectId,
				filter: `and(eq(thread_id, "${threadId}"), eq(run_type, "llm"))`,
			})) {
				runs.push(run);
			}
			return runs;
		} catch (e) {
			if (e.status === 429 || String(e.message).includes('429')) {
				const wait = 5000 * (attempt + 1);
				console.error(`429 listRuns ${threadId}, wait ${wait}ms`);
				await sleep(wait);
				continue;
			}
			throw e;
		}
	}
	throw new Error(`rate limited listing ${threadId}`);
}

const KEYS = [
	'llmSpans',
	'inputTokens',
	'outputTokens',
	'totalTokens',
	'cacheReadTokens',
	'cacheWriteTokens',
	'uncachedInputTokens',
	'cacheHitRate',
	'costUsd',
];

function loadCheckpoint() {
	if (!CHECKPOINT || !fs.existsSync(CHECKPOINT)) return { verified: {} };
	return JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8'));
}

function saveCheckpoint(state) {
	if (CHECKPOINT) fs.writeFileSync(CHECKPOINT, JSON.stringify(state, null, 2));
}

async function main() {
	const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
	const checkpoint = loadCheckpoint();

	const client = new Client({
		apiKey: process.env.LANGSMITH_API_KEY,
		apiUrl: process.env.LANGSMITH_ENDPOINT,
		workspaceId: TENANT,
	});
	const project = await client.readProject({ projectName: TRACE_PROJECT });

	const entries = [];
	for (const ev of data.evals ?? []) {
		for (const t of ev.threads ?? []) {
			entries.push({ testCase: ev.testCase, thread: t });
		}
	}

	console.log(`Verifying ${entries.length} threads from ${INPUT_FILE}, delay ${DELAY_MS}ms`);

	let ok = 0;
	const mismatches = [];

	for (const { testCase, thread } of entries) {
		const { threadId } = thread;
		let fresh = checkpoint.verified[threadId];
		if (!fresh) {
			await sleep(DELAY_MS);
			const llmRuns = await listThreadLlmRuns(client, project.id, threadId);
			fresh = aggregateLlmRuns(llmRuns);
			checkpoint.verified[threadId] = fresh;
			saveCheckpoint(checkpoint);
		}

		const diffs = KEYS.filter((k) => thread[k] !== fresh[k]).map(
			(k) => `${k}: file=${thread[k]} langsmith=${fresh[k]}`,
		);
		if (diffs.length === 0) {
			ok++;
			console.log(`OK   ${testCase} iter ${thread.iteration} ${threadId}`);
		} else {
			mismatches.push({ testCase, iteration: thread.iteration, threadId, diffs });
			console.log(`DIFF ${testCase} iter ${thread.iteration} ${threadId}`);
			for (const dline of diffs) console.log(`     ${dline}`);
		}
	}

	console.log(`\nResult: ${ok}/${entries.length} threads match LangSmith exactly`);
	if (mismatches.length > 0) {
		console.log(`${mismatches.length} mismatched threads:`);
		console.log(JSON.stringify(mismatches, null, 2));
		process.exitCode = 2;
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
