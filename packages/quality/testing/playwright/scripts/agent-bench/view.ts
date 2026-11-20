/**
 * Opens the cockpit on a saved result file, after the run and its stacks are gone.
 *
 *   pnpm bench:agents:view agent-bench-results/<file>.json [--port 4791]
 *
 * The result file keeps no finish time for each turn, so the latency chart
 * spreads the turns evenly over the run. The CPU and memory charts are exact.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { Cockpit, type RunConfig, type Sample, type Scenario } from './cockpit';
import type { BenchConfig, TurnKind, TurnMix } from './config';
import { OWNER } from './n8n-client';
import type { TopologyResult } from './report';
import { AGENT_INSTRUCTIONS, AGENT_NAME, KIND_PATHS, PROMPTS, TOOLS } from './workload';

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: { port: { type: 'string', default: '4791' } },
});
const file = positionals[0];
if (!file) throw new Error('Pass a result file, for example agent-bench-results/<file>.json');

const saved = JSON.parse(readFileSync(resolve(file), 'utf8')) as {
	config: BenchConfig;
	results: TopologyResult[];
};
const { config } = saved;

function scenarios(mix: TurnMix): Scenario[] {
	const total = Object.values(mix).reduce<number>((sum, w) => sum + (w ?? 0), 0);
	return (Object.entries(mix) as Array<[TurnKind, number]>)
		.filter(([, weight]) => weight > 0)
		.map(([kind, weight]) => ({
			kind,
			share: weight / total,
			path: KIND_PATHS[kind],
			prompts: PROMPTS[kind],
		}));
}

// Samples are saved relative to the start of measuring. Put each run on its own clock.
const BASE = Date.now() - saved.results.length * 3_600_000;

const cockpit = new Cockpit({
	model: config.model,
	concurrency: config.concurrency,
	owner: OWNER,
	image: config.image ?? 'n8nio/n8n:local',
	agent: { name: AGENT_NAME, model: config.model, instructions: AGENT_INSTRUCTIONS, tools: TOOLS },
	scenarios: scenarios(config.mix),
	topologies: saved.results.map((r, i) => {
		const t0 = BASE + i * 3_600_000;
		const series = r.resources?.series ?? [];
		const processes = Object.entries(r.resources?.processes ?? {}).map(([name, p]) => ({
			name,
			role: p.role,
		}));
		const runConfig: RunConfig = {
			mains: r.stack.mains,
			workers: r.stack.workers,
			agentQueue: r.stack.agentQueue,
			...(r.stack.slotsPerWorker ? { slotsPerWorker: r.stack.slotsPerWorker } : {}),
			turns: r.turns.length,
			concurrency: r.concurrency ?? config.concurrency,
			warmup: config.warmup,
			limits: r.limits ?? {},
			env: {},
		};
		return {
			name: r.topology,
			status: 'done' as const,
			config: runConfig,
			stack: r.stack,
			planned: r.turns.length,
			concurrency: runConfig.concurrency,
			measureStartedAt: t0,
			finishedAt: t0 + r.wallMs,
			processes,
			inflight: [],
			turns: r.turns.map((turn, n) => ({
				...turn,
				finishedAt: t0 + (r.wallMs * (n + 1)) / r.turns.length,
			})),
			samples: series.map((s) => ({ ...s, t: t0 + s.t }) as unknown as Sample),
			result: { ...r, turns: undefined } as unknown as Omit<TopologyResult, 'turns'>,
		};
	}),
});
cockpit.state.finished = true;

void cockpit.listen(Number(values.port)).then((url) => {
	console.log(`[agent-bench] Cockpit for ${file}: ${url}. Press Ctrl+C to exit.`);
});
