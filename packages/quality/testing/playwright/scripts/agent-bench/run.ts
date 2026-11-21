/**
 * Agent benchmark. Starts one n8n stack for each topology, runs the same
 * sequence of agent turns (editor chat, Responses API and Message an Agent in
 * a workflow) against a real model, and reports latency,
 * throughput and where each turn ran. See README.md in this directory.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createN8NStack, type N8NStack } from 'n8n-containers';

import { Cockpit, startSampler, type InflightTurn, type Sample } from './cockpit';
import { runConfig, scenarios } from './cockpit-config';
import {
	loadConfig,
	resolveTopology,
	stackConfig,
	topologyLoad,
	type BenchConfig,
	type Topology,
	type TurnKind,
	type TurnMix,
} from './config';
import { runPhases, runPlan, startProbe } from './load';
import { log } from './log';
import { N8nClient, OWNER } from './n8n-client';
import {
	renderLimitCheck,
	renderProbe,
	renderResourceTable,
	renderTable,
	summarise,
	summariseProbe,
	summariseResources,
	type TopologyResult,
	type TurnResult,
} from './report';
import {
	attachDbTimings,
	killedContainers,
	killWorker,
	scheduleOutcome,
	settleFromDb,
	stackLinks,
} from './stack';
import { noObserver, runTurn, type TurnObserver } from './turns';
import {
	AGENT_INSTRUCTIONS,
	AGENT_NAME,
	TOOLS,
	modelProvider,
	seedAgent,
	turnPlan,
} from './workload';

let activeStack: N8NStack | undefined;
let keepStack = false;
let cockpit: Cockpit | undefined;

async function stopActive() {
	const stack = activeStack;
	activeStack = undefined;
	if (stack && !keepStack)
		await stack.stop().catch((e: unknown) => log(`Stop failed: ${String(e)}`));
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
	process.once(signal, () => {
		log(`${signal}: tearing down`);
		keepStack = false;
		void stopActive().finally(() => process.exit(130));
	});
}

async function benchTopology(topology: Topology, config: BenchConfig): Promise<TopologyResult> {
	const n8nConfig = stackConfig(topology, config);
	const live = cockpit?.topology(topology.name);
	const agentQueue = n8nConfig.env?.N8N_AGENTS_QUEUE_MODE_ENABLED === 'true';
	const slots = Number(n8nConfig.env?.N8N_AGENTS_WORKER_CONCURRENCY);
	const stackShape: TopologyResult['stack'] = {
		mains: n8nConfig.mains ?? 1,
		workers: n8nConfig.workers ?? 0,
		...(n8nConfig.webhooks ? { webhooks: n8nConfig.webhooks } : {}),
		agentQueue,
		...(agentQueue && slots > 0 ? { slotsPerWorker: slots } : {}),
	};
	if (live) {
		live.status = 'starting';
		live.stack = stackShape;
		cockpit?.changed();
	}
	log(
		`Starting "${topology.name}": ${stackShape.mains} main(s), ${stackShape.webhooks ?? 0} webhook(s), ${stackShape.workers} worker(s), agent queue ${stackShape.agentQueue ? 'on' : 'off'}`,
	);
	const stack = await createN8NStack(n8nConfig);
	activeStack = stack;
	const client = new N8nClient(stack.baseUrl);
	await client.setupOwner();
	const { projectId, agentId, startSchedule } = await seedAgent(
		client,
		config.model,
		usesIntegrations(config.mix),
		{ scheduleEverySec: config.scheduleEverySec },
	);
	log(`Ready at ${stack.baseUrl}`);

	if (cockpit && live) {
		live.baseUrl = stack.baseUrl;
		live.agentUrl = `${stack.baseUrl}/projects/${projectId}/agents/${agentId}`;
		live.processes = stack.processUrls.map((p) => ({ name: p.name, role: p.role }));
		cockpit.state.links = stackLinks(stack);
	}
	// Sample also without the cockpit, so the JSON result has CPU and memory.
	const samples: Sample[] = [];
	const stopSampler = startSampler(stack.processUrls, (sample) => {
		if (cockpit && live) cockpit.addSample(topology.name, sample);
		samples.push({ ...sample, processes: { ...sample.processes } });
	});

	try {
		const { result, measureStartedAt } = await measure(
			topology,
			config,
			stack,
			client,
			projectId,
			agentId,
			stackShape,
			startSchedule,
		);
		const roles = Object.fromEntries(stack.processUrls.map((p) => [p.name, p.role]));
		const measured = samples.filter(
			(s) => s.t >= measureStartedAt && s.t <= measureStartedAt + result.wallMs,
		);
		const resources = summariseResources(measured, roles, measureStartedAt);
		const limits = {
			...(n8nConfig.resourceQuota ? { main: n8nConfig.resourceQuota } : {}),
			...((n8nConfig.workerResourceQuota ?? n8nConfig.resourceQuota)
				? { worker: n8nConfig.workerResourceQuota ?? n8nConfig.resourceQuota }
				: {}),
		};
		return {
			...result,
			...(resources ? { resources } : {}),
			...(limits.main || limits.worker
				? { limits, killed: killedContainers(stack.processUrls.map((p) => p.name)) }
				: {}),
		};
	} finally {
		stopSampler();
	}
}

async function measure(
	topology: Topology,
	config: BenchConfig,
	stack: N8NStack,
	client: N8nClient,
	projectId: string,
	agentId: string,
	stackShape: TopologyResult['stack'],
	startSchedule: () => Promise<string | undefined>,
): Promise<{ result: TopologyResult; measureStartedAt: number }> {
	const live = cockpit?.topology(topology.name);
	const load = topologyLoad(topology, config);
	let measuring = false;
	let nextId = 0;
	// Keyed by the result object: webhook and workflow turns have no execution ID until `attachDbTimings`.
	const finishedAt = new Map<TurnResult, number>();

	// Warmup turns show as in flight, but only measured turns go to the history.
	const observe = (kind: TurnKind): TurnObserver => {
		if (!cockpit || !live) return noObserver;
		const turn: InflightTurn = { id: nextId++, kind, sentAt: Date.now(), phase: 'waiting' };
		const counted = measuring;
		live.inflight.push(turn);
		cockpit.changed();
		return {
			phase: (phase) => {
				turn.phase = phase;
				cockpit?.changed();
			},
			done: (result) => {
				live.inflight = live.inflight.filter((t) => t !== turn);
				if (counted) {
					const at = Date.now();
					finishedAt.set(result, at);
					live.turns.push({ ...result, finishedAt: at });
				}
				cockpit?.changed();
			},
		};
	};

	const settle = settleFromDb(stack);
	let measureStartedAt = Date.now();
	const run = async (kind: TurnKind, index: number) => {
		const sentAtMs = measuring ? Date.now() - measureStartedAt : undefined;
		const result = await runTurn(client, projectId, agentId, kind, index, observe(kind), settle);
		if (sentAtMs !== undefined) result.sentAtMs = sentAtMs;
		return result;
	};
	if (config.warmup > 0) {
		if (live) live.status = 'warmup';
		log(`Warmup: ${config.warmup} turn(s)`);
		await runPlan(turnPlan(warmupMix(config.mix), config.warmup), load.concurrency, run);
	}

	const plan = turnPlan(config.mix, load.turns);
	const phases = load.phases;
	log(
		phases
			? `Measuring by phases: ${phases.map((p) => `${p.concurrency} for ${p.seconds} s`).join(', ')}`
			: `Measuring ${plan.length} turns, ${load.concurrency} at a time`,
	);
	const scheduleId = await startSchedule();
	measuring = true;
	measureStartedAt = Date.now();
	if (live) {
		live.status = 'running';
		live.planned = plan.length;
		live.concurrency = load.concurrency;
		live.measureStartedAt = measureStartedAt;
		cockpit?.changed();
	}
	const stopProbe =
		config.probeMs > 0 ? startProbe(client, config.probeMs, measureStartedAt) : undefined;
	let chaos: TopologyResult['chaos'];
	const killAt = topology.killWorkerAtSec;
	const chaosTimer =
		killAt === undefined
			? undefined
			: setTimeout(() => {
					const killed = killWorker(stack);
					if (killed) {
						chaos = { killed, atMs: Date.now() - measureStartedAt };
						log(`Killed ${killed}`);
					}
				}, killAt * 1000);
	const started = performance.now();
	const turns = phases
		? await runPhases(config.mix, phases, run)
		: await runPlan(plan, load.concurrency, run);
	const wallMs = performance.now() - started;
	clearTimeout(chaosTimer);
	const probePoints = stopProbe ? await stopProbe() : undefined;
	await attachDbTimings(stack, client, turns);
	const schedule = scheduleId ? await scheduleOutcome(stack, scheduleId) : undefined;
	if (live) {
		// Swap in the copies with server timings.
		live.turns = turns.map((t) => ({ ...t, finishedAt: finishedAt.get(t) ?? Date.now() }));
	}

	const detached = turns.filter((t) => t.detached).length;
	if (detached > 0) {
		log(`  ${detached} turn(s) ran without a live stream, because the memory of a main was high`);
	}
	for (const failed of turns.filter((t) => !t.ok && !t.rejected).slice(0, 5)) {
		log(`  ${failed.kind} failed: ${failed.error}`);
	}

	const rejected = turns.filter((t) => t.rejected).length;
	if (rejected > 0) log(`  ${rejected} turn(s) were rejected because the stack was full`);
	const byKind: Record<string, ReturnType<typeof summarise>> = {};
	for (const kind of new Set(turns.map((t) => t.kind)))
		byKind[kind] = summarise(turns.filter((t) => t.kind === kind));
	return {
		measureStartedAt,
		result: {
			topology: topology.name,
			stack: stackShape,
			concurrency: load.concurrency,
			wallMs,
			turnsPerMinute: (turns.filter((t) => t.ok).length / wallMs) * 60_000,
			byKind,
			all: summarise(turns),
			...(probePoints ? { probe: summariseProbe(probePoints) } : {}),
			...(schedule ? { schedule } : {}),
			...(chaos ? { chaos } : {}),
			turns,
		},
	};
}

function usesIntegrations(mix: TurnMix) {
	return (mix.webhook ?? 0) > 0 || (mix.workflow ?? 0) > 0;
}

/** Short turns of every path the run uses, so each one is warm before measuring. */
function warmupMix(mix: TurnMix): TurnMix {
	return {
		plain: 1,
		tool: 1,
		...((mix.datatable ?? 0) > 0 ? { datatable: 1 } : {}),
		...((mix.webhook ?? 0) > 0 ? { webhook: 1 } : {}),
		...((mix.workflow ?? 0) > 0 ? { workflow: 1 } : {}),
		...((mix.slowtool ?? 0) > 0 ? { slowtool: 1 } : {}),
	};
}

async function main() {
	const config = loadConfig(process.argv.slice(2).filter((arg) => arg !== '--'));
	modelProvider(config.model); // Fail before starting containers when the key is missing.
	const topologies = config.topologies.map((entry) => resolveTopology(entry, config));
	const results: TopologyResult[] = [];

	if (config.cockpit !== 'off') {
		cockpit = new Cockpit({
			model: config.model,
			concurrency: config.concurrency,
			owner: OWNER,
			image: config.image ?? process.env.TEST_IMAGE_N8N ?? 'n8nio/n8n:local',
			agent: {
				name: AGENT_NAME,
				model: config.model,
				instructions: AGENT_INSTRUCTIONS,
				tools: TOOLS,
			},
			scenarios: scenarios(config.mix),
			topologies: topologies.map((t) => ({
				name: t.name,
				status: 'pending',
				config: runConfig(t, config),
				planned: topologyLoad(t, config).turns,
				concurrency: topologyLoad(t, config).concurrency,
				processes: [],
				inflight: [],
				turns: [],
				samples: [],
			})),
		});
		const url = await cockpit.listen(config.cockpit);
		log(`Cockpit: ${url}`);
	}

	for (const [i, topology] of topologies.entries()) {
		// With the cockpit open, keep the last stack up so the user can try it.
		// Ctrl+C tears it down.
		keepStack = (config.keep || cockpit !== undefined) && i === topologies.length - 1;
		const live = cockpit?.topology(topology.name);
		try {
			const result = await benchTopology(topology, config);
			results.push(result);
			if (live) {
				// The live samples already hold the series.
				const { turns: _turns, resources, ...summary } = result;
				live.result = resources ? { ...summary, resources: { ...resources, series: [] } } : summary;
				live.status = 'done';
			}
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			log(`Topology "${topology.name}" failed: ${message}`);
			if (live) {
				live.status = 'failed';
				live.error = message;
			}
		} finally {
			if (live) {
				live.finishedAt = Date.now();
				live.inflight = [];
				live.kept = keepStack && activeStack !== undefined;
				cockpit?.changed();
			}
			if (keepStack && activeStack) log(`Kept the stack at ${activeStack.baseUrl}`);
			await stopActive();
		}
	}

	if (cockpit) {
		// Stack links die with the stacks; keep the n8n link only when kept.
		cockpit.state.links = keepStack ? cockpit.state.links : [];
		cockpit.state.finished = true;
		cockpit.changed();
	}
	if (results.length === 0) throw new Error('No topology finished');
	process.stdout.write(`\n${renderTable(results)}\n\n${renderResourceTable(results)}\n\n`);
	const limitCheck = renderLimitCheck(results);
	if (limitCheck) process.stdout.write(`${limitCheck}\n\n`);
	const probe = renderProbe(results);
	if (probe) process.stdout.write(`${probe}\n\n`);

	const outDir = resolve(config.out);
	mkdirSync(outDir, { recursive: true });
	const file = join(outDir, `agent-bench-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
	const { env: _env, ...publicConfig } = config; // Env can hold license keys.
	writeFileSync(file, JSON.stringify({ config: publicConfig, results }, null, 2));
	log(`Wrote ${file}`);

	if (cockpit) {
		log(
			keepStack
				? `The cockpit and the last stack stay up. Log in to n8n as ${OWNER.email} / ${OWNER.password}. Press Ctrl+C to tear down.`
				: 'The cockpit stays open with the final results. Press Ctrl+C to exit.',
		);
		await new Promise(() => {});
	}
}

main().catch((e: unknown) => {
	log(e instanceof Error ? e.message : String(e));
	void stopActive().finally(() => process.exit(1));
});
