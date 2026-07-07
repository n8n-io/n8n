#!/usr/bin/env node
/**
 * Enrich an existing threads JSON with LangSmith cost/cache metrics, one thread at a time.
 * Uses LangSmith SDK (EU workspace) for LLM spans in instance-ai-evals.
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
const CHECKPOINT = arg('--checkpoint');
const DELAY_MS = Number(arg('--delay-ms') ?? '3000');
const ONLY_THREAD = arg('--thread');

if (!INPUT_FILE) {
	console.error('Usage: --input <threads.json> [--checkpoint <file.json>] [--delay-ms <ms>] [--thread <uuid>]');
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

function loadCheckpoint() {
	if (!CHECKPOINT || !fs.existsSync(CHECKPOINT)) return { analyzedThreads: {} };
	return JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8'));
}

function saveCheckpoint(state) {
	if (CHECKPOINT) fs.writeFileSync(CHECKPOINT, JSON.stringify(state, null, 2));
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

function mergeMetrics(target, metrics) {
	for (const [key, value] of Object.entries(metrics)) {
		if (value !== null && value !== undefined) target[key] = value;
	}
}

function collectThreads(data) {
	const entries = [];
	for (const ev of data.evals ?? []) {
		for (const t of ev.threads ?? []) {
			entries.push({
				threadId: t.threadId,
				testCase: ev.testCase,
				iteration: t.iteration,
				scenarios: t.scenarios,
				ref: t,
			});
		}
	}
	return entries;
}

function applyToRows(data, byThreadId) {
	for (const row of data.rows ?? []) {
		const m = byThreadId.get(row.threadId);
		if (m) mergeMetrics(row, m);
	}
}

function seedCheckpointFromJson(data, checkpoint) {
	for (const ev of data.evals ?? []) {
		for (const t of ev.threads ?? []) {
			if (t.costUsd == null) continue;
			checkpoint.analyzedThreads[t.threadId] = {
				testCase: ev.testCase,
				iteration: t.iteration,
				threadId: t.threadId,
				scenarios: t.scenarios,
				llmSpans: t.llmSpans,
				inputTokens: t.inputTokens,
				outputTokens: t.outputTokens,
				totalTokens: t.totalTokens,
				cacheReadTokens: t.cacheReadTokens,
				cacheWriteTokens: t.cacheWriteTokens,
				uncachedInputTokens: t.uncachedInputTokens,
				cacheHitRate: t.cacheHitRate,
				costUsd: t.costUsd,
			};
		}
	}
}

async function main() {
	const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
	const checkpoint = loadCheckpoint();
	seedCheckpointFromJson(data, checkpoint);

	const client = new Client({
		apiKey: process.env.LANGSMITH_API_KEY,
		apiUrl: process.env.LANGSMITH_ENDPOINT,
		workspaceId: TENANT,
	});
	const project = await client.readProject({ projectName: TRACE_PROJECT });

	let entries = collectThreads(data);
	if (ONLY_THREAD) entries = entries.filter((e) => e.threadId === ONLY_THREAD);

	console.log(`Input: ${INPUT_FILE}, threads: ${entries.length}, delay: ${DELAY_MS}ms`);

	const byThreadId = new Map();
	let analyzed = 0;
	let skipped = 0;

	for (const entry of entries) {
		const { threadId } = entry;
		let metrics = checkpoint.analyzedThreads[threadId];
		if (metrics) {
			skipped++;
		} else {
			console.log(`  analyzing ${threadId} (${entry.testCase} iter ${entry.iteration})...`);
			await sleep(DELAY_MS);
			const llmRuns = await listThreadLlmRuns(client, project.id, threadId);
			if (llmRuns.length === 0) {
				console.warn(`  no LLM spans for ${threadId}`);
				continue;
			}
			metrics = aggregateLlmRuns(llmRuns);
			checkpoint.analyzedThreads[threadId] = {
				testCase: entry.testCase,
				iteration: entry.iteration,
				threadId,
				scenarios: entry.scenarios,
				...metrics,
			};
			saveCheckpoint(checkpoint);
			analyzed++;
			console.log(`    costUsd=${metrics.costUsd} input=${metrics.inputTokens} cacheRead=${metrics.cacheReadTokens}`);
		}

		mergeMetrics(entry.ref, metrics);
		byThreadId.set(threadId, metrics);
	}

	applyToRows(data, byThreadId);
	fs.writeFileSync(INPUT_FILE, JSON.stringify(data, null, 2) + '\n');
	console.log(`Done: ${skipped} cached, ${analyzed} newly analyzed, wrote ${INPUT_FILE}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
