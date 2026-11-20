/**
 * Agent benchmark. Starts one n8n stack for each topology, runs the same
 * sequence of agent turns (editor chat, Responses API and Message an Agent in
 * a workflow) against a real model, and reports latency,
 * throughput and where each turn ran. See README.md in this directory.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createN8NStack, type N8NStack } from 'n8n-containers';

import {
	Cockpit,
	startSampler,
	type InflightTurn,
	type RunConfig,
	type Sample,
	type Scenario,
} from './cockpit';
import {
	loadConfig,
	resolveTopology,
	stackConfig,
	topologyLoad,
	type BenchConfig,
	type LoadPhase,
	type Topology,
	type TurnKind,
	type TurnMix,
} from './config';
import { HttpError, N8nClient, OWNER } from './n8n-client';
import {
	renderLimitCheck,
	renderProbe,
	renderResourceTable,
	renderTable,
	summarise,
	summariseProbe,
	summariseResources,
	type ProbePoint,
	type ProbeTarget,
	type TopologyResult,
	type TurnResult,
} from './report';
import {
	AGENT_INSTRUCTIONS,
	AGENT_NAME,
	AGENT_WORKFLOW_PATH,
	FOLLOW_UPS,
	KIND_PATHS,
	PING_PATH,
	PROMPTS,
	TOOLS,
	modelProvider,
	promptFor,
	seedAgent,
	turnPlan,
} from './workload';

const TURN_TIMEOUT_MS = 300_000;

/** Stream error codes and HTTP statuses that mean "full, try later", not "broken". */
const REJECT_CODES = new Set(['main_busy', 'queue_full']);
const KINDS_WITH_TOOLS = new Set<TurnKind>(['tool', 'datatable', 'multitool', 'slowtool']);

function classifyRejection(result: TurnResult, error: unknown) {
	if (error instanceof HttpError && (error.status === 503 || error.status === 429)) {
		result.rejected = true;
		if (error.retryAfterSec) result.retryAfterSec = error.retryAfterSec;
	}
}

const log = (message: string) => process.stderr.write(`[agent-bench] ${message}\n`);

let activeStack: N8NStack | undefined;
let keepStack = false;
let cockpit: Cockpit | undefined;

async function stopActive() {
	const stack = activeStack;
	activeStack = undefined;
	if (stack && !keepStack)
		await stack.stop().catch((e: unknown) => log(`Stop failed: ${String(e)}`));
}

/** Called as a turn moves through its phases, for the cockpit. */
type TurnObserver = {
	phase: (phase: InflightTurn['phase']) => void;
	done: (result: TurnResult) => void;
};

const noObserver: TurnObserver = { phase: () => {}, done: () => {} };

/** Waits until the execution of a session ends. Resolves with nothing at the time limit. */
type SettleTurn = (
	sessionId: string,
	timeoutMs: number,
	/** How many earlier turns of the session already ended. */
	earlier?: number,
) => Promise<{ executionId: string } | undefined>;

/** Poll `agent_execution` for the turn of a session that has no live stream. */
function settleFromDb(stack: N8NStack): SettleTurn {
	const waiting = new Map<
		string,
		{ earlier: number; finish: (result: { executionId: string } | undefined) => void }
	>();
	let polling = false;
	// One query for every waiting turn, so that many turns do not load the database.
	const poll = async () => {
		if (polling) return;
		polling = true;
		while (waiting.size > 0) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			// The session IDs are UUIDs that this script made, so they are safe in the query.
			const ids = [...waiting.keys()].map((id) => `'${id}'`).join(',');
			const output = await stack.services.postgres
				.exec(
					`SELECT right("threadId", 36), count(*), max(id) FROM agent_execution WHERE right("threadId", 36) IN (${ids}) AND "stoppedAt" IS NOT NULL GROUP BY 1`,
				)
				.catch(() => '');
			for (const line of output.trim().split('\n').filter(Boolean)) {
				const [sessionId, count, executionId] = line.trim().split('\t');
				const entry = waiting.get(sessionId);
				if (entry && Number(count) > entry.earlier) entry.finish({ executionId });
			}
		}
		polling = false;
	};
	return async (sessionId, timeoutMs, earlier = 0) =>
		await new Promise((resolve) => {
			const timer = setTimeout(() => finish(undefined), Math.max(0, timeoutMs));
			const finish = (result: { executionId: string } | undefined) => {
				clearTimeout(timer);
				waiting.delete(sessionId);
				resolve(result);
			};
			waiting.set(sessionId, { earlier, finish });
			void poll();
		});
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
	process.once(signal, () => {
		log(`${signal}: tearing down`);
		keepStack = false;
		void stopActive().finally(() => process.exit(130));
	});
}

async function runTurn(
	client: N8nClient,
	projectId: string,
	agentId: string,
	kind: TurnKind,
	index: number,
	observer: TurnObserver = noObserver,
	settle?: SettleTurn,
): Promise<TurnResult> {
	if (kind === 'webhook' || kind === 'workflow') {
		return await requestTurn(client, agentId, kind, index, observer);
	}
	const messages =
		kind === 'multiturn' ? [promptFor(kind, index), ...FOLLOW_UPS] : [promptFor(kind, index)];
	return await chatTurn(client, projectId, agentId, kind, messages, observer, settle);
}

/**
 * A turn through an endpoint that does not stream: the Responses API, or a
 * production webhook of a workflow with Message an Agent. Only the total time
 * is known on the client. The server timings come from `agent_execution`.
 */
async function requestTurn(
	client: N8nClient,
	agentId: string,
	kind: 'webhook' | 'workflow',
	index: number,
	observer: TurnObserver,
): Promise<TurnResult> {
	const sent = performance.now();
	const result: TurnResult = { kind, ok: false, totalMs: 0, toolCalls: 0 };
	const message = promptFor(kind, index);
	observer.phase('request');
	try {
		if (kind === 'webhook') {
			const reply = await client.respond(agentId, message, TURN_TIMEOUT_MS);
			result.sessionId = reply.conversationId;
			if (!reply.text.trim()) result.error = 'The Responses API returned no text';
		} else {
			const sessionId = crypto.randomUUID();
			result.sessionId = sessionId;
			const reply = await client.callWebhook<{ text?: string; toolCalls?: unknown[] }>(
				AGENT_WORKFLOW_PATH,
				{ message, sessionId },
				TURN_TIMEOUT_MS,
			);
			result.toolCalls = Array.isArray(reply.toolCalls) ? reply.toolCalls.length : 0;
			if (!reply.text?.trim()) result.error = 'The workflow returned no agent text';
		}
	} catch (e) {
		result.error = e instanceof Error ? e.message : String(e);
		classifyRejection(result, e);
	}
	result.totalMs = performance.now() - sent;
	result.ok = !result.error;
	observer.done(result);
	return result;
}

async function chatTurn(
	client: N8nClient,
	projectId: string,
	agentId: string,
	kind: TurnKind,
	messages: string[],
	observer: TurnObserver,
	settle?: SettleTurn,
): Promise<TurnResult> {
	const sent = performance.now();
	const result: TurnResult = { kind, ok: false, totalMs: 0, toolCalls: 0 };
	let error: string | undefined;
	let done = false;
	const sessionId = crypto.randomUUID();
	// A multi-turn chat sends each message after the reply to the one before.
	// Times cover the whole conversation; start and first token are of the first message.
	for (const [i, message] of messages.entries()) {
		done = false;
		let queued = false;
		let executionId: string | undefined;
		try {
			await client.chat(
				projectId,
				agentId,
				message,
				sessionId,
				(event) => {
					const elapsed = performance.now() - sent;
					if (event.type === 'message-queued') {
						queued = true;
					} else if (event.type === 'execution-started') {
						executionId ??= event.executionId;
						result.executionId ??= event.executionId;
						if (result.startMs === undefined) observer.phase('running');
						result.startMs ??= elapsed;
					} else if (event.type === 'text-delta') {
						if (result.firstTokenMs === undefined) observer.phase('streaming');
						result.firstTokenMs ??= elapsed;
					} else if (event.type === 'tool-call') {
						result.toolCalls++;
					} else if (event.type === 'tool-result' && toolFailed(event.isError, event.output)) {
						error ??= `Tool ${event.toolName} failed`;
					} else if (event.type === 'error') {
						error ??= event.message;
						if (event.errorCode && REJECT_CODES.has(event.errorCode)) result.rejected = true;
					} else if (event.type === 'done') {
						done = true;
						executionId ??= event.executionId;
						result.executionId ??= event.executionId;
					}
				},
				TURN_TIMEOUT_MS,
				i === 0,
			);
		} catch (e) {
			error ??= e instanceof Error ? e.message : String(e);
			classifyRejection(result, e);
		}
		// A main with high memory accepts the message but opens no live stream. The
		// editor then loads the reply from history, so wait for the execution here.
		if (!error && !done && queued && executionId === undefined && settle) {
			result.detached = true;
			const settled = await settle(sessionId, TURN_TIMEOUT_MS - (performance.now() - sent), i);
			if (settled) {
				result.executionId ??= settled.executionId;
				done = true;
			} else error = 'Turn without a live stream did not finish in time';
		}
		if (error || !done) break;
	}
	result.totalMs = performance.now() - sent;
	// The server closes a relayed stream without `done` when it loses the worker.
	// The editor then reloads history, so the user does not see a reply.
	if (!error && !done) error = 'Stream ended without a reply';
	if (!error && !result.detached && KINDS_WITH_TOOLS.has(kind) && result.toolCalls === 0)
		error = 'The model did not call the tool';
	result.ok = !error;
	if (error) result.error = error;
	observer.done(result);
	return result;
}

/**
 * A workflow tool returns a failed sub-workflow as a normal result with
 * `status: 'error'`, not as `isError`. Count both, or a broken tool looks like a success.
 */
function toolFailed(isError: boolean | undefined, output: unknown): boolean {
	if (isError) return true;
	return (
		typeof output === 'object' &&
		output !== null &&
		'status' in output &&
		(output.status === 'error' || output.status === 'canceled')
	);
}

/** Run `plan` with at most `concurrency` turns in flight. */
async function runPlan(
	plan: TurnKind[],
	concurrency: number,
	run: (kind: TurnKind, index: number) => Promise<TurnResult>,
): Promise<TurnResult[]> {
	const results: TurnResult[] = new Array(plan.length);
	let next = 0;
	let finished = 0;
	const lane = async () => {
		while (next < plan.length) {
			const index = next++;
			results[index] = await run(plan[index], index);
			finished++;
			if (finished % 5 === 0 || finished === plan.length) log(`  ${finished}/${plan.length} turns`);
		}
	};
	await Promise.all(Array.from({ length: Math.min(concurrency, plan.length) }, lane));
	return results;
}

/**
 * Run turns by a timed load profile. Lane `i` sends turns while the current
 * phase has more than `i` turns in flight, so the load ramps up and down
 * with the phases. A lane finishes its turn when its phase ends.
 */
async function runPhases(
	mix: TurnMix,
	phases: LoadPhase[],
	run: (kind: TurnKind, index: number) => Promise<TurnResult>,
): Promise<TurnResult[]> {
	const plan = turnPlan(mix, 1000);
	const results: TurnResult[] = [];
	const started = Date.now();
	const ends = phases.reduce<number[]>(
		(acc, p) => [...acc, (acc.at(-1) ?? started) + p.seconds * 1000],
		[],
	);
	const end = ends.at(-1) ?? started;
	const target = () => {
		const now = Date.now();
		const i = ends.findIndex((e) => now < e);
		return i === -1 ? 0 : phases[i].concurrency;
	};
	let next = 0;
	let lastLog = 0;
	const lane = async (laneIndex: number) => {
		while (Date.now() < end) {
			if (laneIndex >= target()) {
				await new Promise((resolve) => setTimeout(resolve, 250));
				continue;
			}
			const index = next++;
			const result = await run(plan[index % plan.length], index);
			results.push(result);
			// Back off like a real client after a busy answer, so a rejection does not become a retry storm.
			if (result.rejected) {
				const waitMs = Math.min((result.retryAfterSec ?? 15) * 1000, Math.max(0, end - Date.now()));
				await new Promise((resolve) => setTimeout(resolve, waitMs));
			}
			if (Date.now() - lastLog > 10_000) {
				lastLog = Date.now();
				log(
					`  ${Math.round((Date.now() - started) / 1000)} s: ${results.length} turns done, ${target()} in flight`,
				);
			}
		}
	};
	const lanes = Math.max(...phases.map((p) => p.concurrency));
	await Promise.all(Array.from({ length: lanes }, async (_, i) => await lane(i)));
	return results;
}

/**
 * Call the main every `intervalMs` with each probe target, until stopped.
 * Each call has its own timer, so a slow answer does not delay the next probe.
 */
function startProbe(client: N8nClient, intervalMs: number, startedAt: number) {
	const points: ProbePoint[] = [];
	const pending = new Set<Promise<void>>();
	const targets: ProbeTarget[] = ['health', 'rest', 'webhook'];
	const timer = setInterval(() => {
		for (const target of targets) {
			const t = Date.now() - startedAt;
			const call = client.probe(target, PING_PATH, 10_000).then(({ ms, status }) => {
				points.push({ t, target, ms: Math.round(ms), status });
			});
			pending.add(call);
			void call.finally(() => pending.delete(call));
		}
	}, intervalMs);
	return async () => {
		clearInterval(timer);
		await Promise.all(pending);
		return points.sort((a, b) => a.t - b.t);
	};
}

/** Kill a worker container, like a node that dies. Returns its name. */
function killWorker(stack: N8NStack): string | undefined {
	const worker = stack.processUrls.find((p) => p.role === 'worker');
	if (!worker) return undefined;
	try {
		execFileSync('docker', ['kill', worker.name]);
		return worker.name;
	} catch (e) {
		log(`Could not kill ${worker.name}: ${String(e)}`);
		return undefined;
	}
}

/** Executions of the schedule-triggered workflow by status, from the database. */
async function scheduleOutcome(stack: N8NStack, workflowId: string) {
	const output = await stack.services.postgres
		.exec(
			`SELECT status, count(*) FROM execution_entity WHERE "workflowId" = '${workflowId.replace(/'/g, "''")}' GROUP BY status`,
		)
		.catch(() => '');
	return Object.fromEntries(
		output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const [status, count] = line.trim().split('\t');
				return [status, Number(count)];
			}),
	);
}

/** Find the execution of turns that only know their session, by the end of the thread ID. */
async function attachExecutionIds(stack: N8NStack, turns: TurnResult[]) {
	const bySession = new Map(
		turns.filter((t) => t.sessionId && !t.executionId).map((t) => [t.sessionId ?? '', t]),
	);
	if (bySession.size === 0) return;
	// The session IDs are UUIDs from this script or from n8n, so they are safe in the query.
	const ids = [...bySession.keys()]
		.filter((id) => /^[0-9a-f-]{36}$/i.test(id))
		.map((id) => `'${id}'`)
		.join(',');
	if (!ids) return;
	const output = await stack.services.postgres.exec(
		`SELECT right("threadId", 36), id FROM agent_execution WHERE right("threadId", 36) IN (${ids})`,
	);
	for (const line of output.trim().split('\n').filter(Boolean)) {
		const [sessionId, executionId] = line.trim().split('\t');
		const turn = bySession.get(sessionId);
		if (turn) turn.executionId = executionId;
	}
}

/** Join the server-side timings and owner of each turn from `agent_execution`. */
async function attachDbTimings(stack: N8NStack, client: N8nClient, turns: TurnResult[]) {
	await attachExecutionIds(stack, turns);
	const ids = turns.map((t) => t.executionId).filter((id): id is string => !!id);
	if (ids.length === 0) return;
	const processes = await client.processTypes();
	const list = ids.map((id) => `'${id.replace(/'/g, "''")}'`).join(',');
	const output = await stack.services.postgres.exec(
		`SELECT id, status, coalesce("ownerKey", ''),
			-- Webhook and workflow turns set startedAt a few ms before the row is inserted.
			coalesce(greatest(0, round(extract(epoch from ("startedAt" - "createdAt")) * 1000))::text, ''),
			coalesce(round(extract(epoch from ("stoppedAt" - "startedAt")) * 1000)::text, ''),
			coalesce("totalTokens", 0), coalesce(cost, 0)
		FROM agent_execution WHERE id IN (${list})`,
	);
	const rows = new Map(
		output
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const [id, status, ownerKey, queued, run, tokens, cost] = line.trim().split('\t');
				return [id, { status, ownerKey, queued, run, tokens, cost }] as const;
			}),
	);
	const num = (raw: string) => (raw === '' ? null : Number(raw));
	for (const turn of turns) {
		const row = turn.executionId ? rows.get(turn.executionId) : undefined;
		if (!row) continue;
		turn.db = {
			status: row.status,
			ownerKey: row.ownerKey,
			process: processes.get(row.ownerKey) ?? (row.ownerKey ? row.ownerKey : 'unknown'),
			queuedMs: num(row.queued),
			runMs: num(row.run),
			totalTokens: Number(row.tokens),
			cost: Number(row.cost),
		};
		if (turn.ok && row.status !== 'success') {
			turn.ok = false;
			turn.error = `Execution ended as ${row.status}`;
		}
	}
}

/** Links to the stack's own UIs, shown in the cockpit while the stack runs. */
function stackLinks(stack: N8NStack): Array<{ label: string; url: string }> {
	const endpoint = (name: 'victoriaMetrics' | 'victoriaLogs') => {
		const meta = stack.serviceResults[name]?.meta;
		if (typeof meta !== 'object' || meta === null || !('queryEndpoint' in meta)) return undefined;
		return typeof meta.queryEndpoint === 'string' ? meta.queryEndpoint : undefined;
	};
	const links = [{ label: 'n8n', url: stack.baseUrl }];
	const metrics = endpoint('victoriaMetrics');
	if (metrics) links.push({ label: 'VictoriaMetrics', url: `${metrics}/vmui/` });
	const logs = endpoint('victoriaLogs');
	if (logs) links.push({ label: 'VictoriaLogs', url: `${logs}/select/vmui/` });
	for (const p of stack.processUrls)
		links.push({ label: `${p.name} /metrics`, url: `${p.url}/metrics` });
	return links;
}

/**
 * Containers that the kernel killed for memory, that restarted, or that stopped.
 * A process that runs out of JS heap exits without a kernel kill. Read before teardown.
 */
function killedContainers(names: string[]): string[] {
	try {
		const output = execFileSync(
			'docker',
			[
				'inspect',
				'-f',
				'{{.Name}} {{.State.OOMKilled}} {{.RestartCount}} {{.State.Running}}',
				...names,
			],
			{ encoding: 'utf8' },
		);
		return output
			.trim()
			.split('\n')
			.map((line) => line.trim().split(' '))
			.filter(
				([, oom, restarts, running]) =>
					oom === 'true' || Number(restarts) > 0 || running === 'false',
			)
			.map(([name]) => name.replace(/^\//, ''));
	} catch {
		return [];
	}
}

const SECRET_ENV = /LICENSE|KEY|TOKEN|SECRET|PASSWORD|CERT/i;

/** The settings of one topology, as the cockpit shows them. Null when the stack config fails. */
function runConfig(topology: Topology, config: BenchConfig): RunConfig | undefined {
	try {
		const n8n = stackConfig(topology, config);
		const env = n8n.env ?? {};
		const slots = Number(env.N8N_AGENTS_WORKER_CONCURRENCY);
		return {
			mains: n8n.mains ?? 1,
			workers: n8n.workers ?? 0,
			agentQueue: env.N8N_AGENTS_QUEUE_MODE_ENABLED === 'true',
			...(slots > 0 ? { slotsPerWorker: slots } : {}),
			...topologyLoad(topology, config),
			warmup: config.warmup,
			limits: {
				...(n8n.resourceQuota ? { main: n8n.resourceQuota } : {}),
				...((n8n.workerResourceQuota ?? n8n.resourceQuota)
					? { worker: n8n.workerResourceQuota ?? n8n.resourceQuota }
					: {}),
			},
			env: Object.fromEntries(Object.entries(env).filter(([key]) => !SECRET_ENV.test(key))),
		};
	} catch {
		return undefined;
	}
}

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

async function benchTopology(topology: Topology, config: BenchConfig): Promise<TopologyResult> {
	const n8nConfig = stackConfig(topology, config);
	const live = cockpit?.topology(topology.name);
	const agentQueue = n8nConfig.env?.N8N_AGENTS_QUEUE_MODE_ENABLED === 'true';
	const slots = Number(n8nConfig.env?.N8N_AGENTS_WORKER_CONCURRENCY);
	const stackShape: TopologyResult['stack'] = {
		mains: n8nConfig.mains ?? 1,
		workers: n8nConfig.workers ?? 0,
		agentQueue,
		...(agentQueue && slots > 0 ? { slotsPerWorker: slots } : {}),
	};
	if (live) {
		live.status = 'starting';
		live.stack = stackShape;
		cockpit?.changed();
	}
	log(
		`Starting "${topology.name}": ${stackShape.mains} main(s), ${stackShape.workers} worker(s), agent queue ${stackShape.agentQueue ? 'on' : 'off'}`,
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
	const stopProbe = config.probeMs > 0 ? startProbe(client, config.probeMs, measureStartedAt) : undefined;
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
