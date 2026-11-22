import { readFileSync } from 'node:fs';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { join } from 'node:path';

import type { TurnKind } from './config';
import type { TopologyResult, TurnResult } from './report';

export type TopologyStatus = 'pending' | 'starting' | 'warmup' | 'running' | 'done' | 'failed';

export interface InflightTurn {
	id: number;
	kind: TurnKind;
	sentAt: number;
	/**
	 * waiting = sent, no execution yet. running = executing. streaming = tokens
	 * arrive. request = sent to an endpoint that does not stream, so the client
	 * cannot see the phase.
	 */
	phase: 'waiting' | 'running' | 'streaming' | 'request';
}

/** One scrape of every process. Keys of `processes` are container names. */
export interface Sample {
	t: number;
	processes: Record<
		string,
		{
			cpu: number | null;
			rssMb: number | null;
			/** Live objects on the JS heap. The gap to `rssMb` is mostly memory not yet collected. */
			heapUsedMb?: number | null;
			lagMs: number | null;
			activeTurns: number | null;
		}
	>;
	queueWaiting: number | null;
	queueActive: number | null;
	fallbacks: number | null;
	/** Checks where a main left an overdue turn to workers, by reason. */
	fallbacksHeld?: {
		progressing: number | null;
		atLimit: number | null;
		memoryHigh?: number | null;
	};
	/** Chat streams that a main did not open because its memory was high. */
	streamsSkipped?: number | null;
	timedOut: number | null;
	/** Turns the bench sent that have no execution yet, and that run. */
	clientWaiting?: number;
	clientRunning?: number;
}

/** The settings one topology runs with, for the cockpit to show. */
export interface RunConfig {
	mains: number;
	workers: number;
	webhooks?: number;
	agentQueue: boolean;
	slotsPerWorker?: number;
	turns: number;
	concurrency: number;
	warmup: number;
	/** Container limits. Memory in GB, CPU in cores. */
	limits: {
		main?: { memory?: number; cpu?: number };
		worker?: { memory?: number; cpu?: number };
	};
	/** n8n env of the stack, without secrets. */
	env: Record<string, string>;
}

export interface AgentInfo {
	name: string;
	model: string;
	instructions: string;
	tools: Array<{ name: string; steps: string[] }>;
}

export interface Scenario {
	kind: TurnKind;
	/** Share of the measured turns, 0 to 1. */
	share: number;
	path: string;
	prompts: string[];
}

export interface LiveTopology {
	name: string;
	status: TopologyStatus;
	config?: RunConfig;
	stack?: TopologyResult['stack'];
	baseUrl?: string;
	/** The benchmarked agent in the n8n UI. */
	agentUrl?: string;
	/** The stack is still up after the run, so the user can try it. */
	kept?: boolean;
	error?: string;
	planned: number;
	/** Turns in flight for this topology. */
	concurrency?: number;
	measureStartedAt?: number;
	finishedAt?: number;
	processes: Array<{ name: string; role: string }>;
	inflight: InflightTurn[];
	turns: Array<TurnResult & { finishedAt: number }>;
	samples: Sample[];
	result?: Omit<TopologyResult, 'turns'>;
}

export interface CockpitState {
	startedAt: number;
	finished: boolean;
	model: string;
	concurrency: number;
	owner: { email: string; password: string };
	image: string;
	agent: AgentInfo;
	scenarios: Scenario[];
	links: Array<{ label: string; url: string }>;
	topologies: LiveTopology[];
}

const MAX_SAMPLES = 900;
const ASSETS = ['index.html', 'cockpit.css', 'cockpit.js'] as const;
const TYPES: Record<string, string> = {
	html: 'text/html; charset=utf-8',
	css: 'text/css; charset=utf-8',
	js: 'text/javascript; charset=utf-8',
};

/**
 * A local live view of the run. It serves a static page and pushes the whole
 * state over SSE, at most twice a second. The state is small: one run has
 * a few hundred turns.
 */
export class Cockpit {
	readonly state: CockpitState;

	private server?: Server;
	private clients = new Set<ServerResponse>();
	private pending?: NodeJS.Timeout;

	constructor(init: Omit<CockpitState, 'startedAt' | 'finished' | 'links'>) {
		this.state = { ...init, startedAt: Date.now(), finished: false, links: [] };
	}

	async listen(port: number): Promise<string> {
		const dir = join(__dirname, 'cockpit');
		const assets = new Map(ASSETS.map((name) => [name, readFileSync(join(dir, name))]));
		this.server = createServer((req, res) => {
			const path = (req.url ?? '/').split('?')[0];
			if (path === '/events') {
				res.writeHead(200, {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
				});
				res.write(`data: ${JSON.stringify(this.state)}\n\n`);
				this.clients.add(res);
				req.on('close', () => this.clients.delete(res));
				return;
			}
			if (path === '/state') {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify(this.state));
				return;
			}
			const name = path === '/' ? 'index.html' : path.slice(1);
			const body = assets.get(name as (typeof ASSETS)[number]);
			if (!body) {
				res.writeHead(404).end();
				return;
			}
			res.writeHead(200, { 'Content-Type': TYPES[name.split('.').pop() ?? ''] ?? 'text/plain' });
			res.end(body);
		});
		await new Promise<void>((resolve, reject) => {
			this.server?.once('error', reject);
			this.server?.listen(port, '127.0.0.1', resolve);
		});
		const address = this.server.address();
		const actual = typeof address === 'object' && address ? address.port : port;
		return `http://localhost:${actual}`;
	}

	topology(name: string): LiveTopology {
		const found = this.state.topologies.find((t) => t.name === name);
		if (!found) throw new Error(`Cockpit has no topology "${name}"`);
		return found;
	}

	addSample(name: string, sample: Sample) {
		const topology = this.topology(name);
		const count = (phases: Array<InflightTurn['phase']>) =>
			topology.inflight.filter((turn) => phases.includes(turn.phase)).length;
		sample.clientWaiting = count(['waiting']);
		sample.clientRunning = count(['running', 'streaming']);
		const samples = topology.samples;
		samples.push(sample);
		if (samples.length > MAX_SAMPLES) samples.splice(0, samples.length - MAX_SAMPLES);
		this.changed();
	}

	/** Push the state to every open page, batched. */
	changed() {
		if (this.pending) return;
		this.pending = setTimeout(() => {
			this.pending = undefined;
			const payload = `data: ${JSON.stringify(this.state)}\n\n`;
			for (const client of this.clients) client.write(payload);
		}, 500);
	}

	async close() {
		if (this.pending) clearTimeout(this.pending);
		for (const client of this.clients) client.end();
		await new Promise<void>((resolve) =>
			this.server ? this.server.close(() => resolve()) : resolve(),
		);
	}
}

/** Read the few Prometheus series the cockpit shows. Missing series are null. */
export function parseMetrics(text: string) {
	const values = new Map<string, number>();
	for (const line of text.split('\n')) {
		if (!line || line.startsWith('#')) continue;
		const space = line.lastIndexOf(' ');
		const value = Number(line.slice(space + 1));
		if (Number.isFinite(value)) values.set(line.slice(0, space), value);
	}
	const sum = (prefix: string) => {
		let total: number | null = null;
		for (const [key, value] of values) {
			if (key === prefix || key.startsWith(`${prefix}{`)) total = (total ?? 0) + value;
		}
		return total;
	};
	// Older images report held turns as `agent_turn_fallbacks_held_total`.
	const held = (reason: string) =>
		values.get(`n8n_agent_turns_held_total{reason="${reason}"}`) ??
		values.get(`n8n_agent_turn_fallbacks_held_total{reason="${reason}"}`) ??
		null;
	const cpuUser = values.get('n8n_process_cpu_user_seconds_total');
	const cpuSystem = values.get('n8n_process_cpu_system_seconds_total');
	const rss = values.get('n8n_process_resident_memory_bytes');
	const lag = values.get('n8n_nodejs_eventloop_lag_p99_seconds');
	const heapUsed = values.get('n8n_nodejs_heap_size_used_bytes');
	return {
		cpuSeconds: cpuUser === undefined ? null : cpuUser + (cpuSystem ?? 0),
		rssMb: rss === undefined ? null : rss / 1024 / 1024,
		heapUsedMb: heapUsed === undefined ? null : heapUsed / 1024 / 1024,
		lagMs: lag === undefined ? null : lag * 1000,
		activeTurns: values.get('n8n_agent_active_turns') ?? null,
		queueWaiting: values.get('n8n_agent_turn_queue_jobs{state="waiting"}') ?? null,
		queueActive: values.get('n8n_agent_turn_queue_jobs{state="active"}') ?? null,
		fallbacks: sum('n8n_agent_turn_fallbacks_total'),
		heldProgressing: held('workers-progressing'),
		heldAtLimit: held('main-at-limit'),
		heldMemoryHigh: held('main-memory-high'),
		streamsSkipped: values.get('n8n_agent_streams_skipped_total') ?? null,
		timedOut: values.get('n8n_agent_turns_timed_out_total') ?? null,
	};
}

/**
 * Scrape every process every `intervalMs` and pass each sample on. CPU is a
 * percent of one core over the interval. Returns a stop function.
 */
export function startSampler(
	processes: Array<{ name: string; url: string }>,
	onSample: (sample: Sample) => void,
	intervalMs = 2000,
): () => void {
	const lastCpu = new Map<string, { t: number; seconds: number }>();
	let stopped = false;
	const tick = async () => {
		const t = Date.now();
		const scraped = await Promise.all(
			processes.map(async (p) => {
				try {
					const response = await fetch(`${p.url}/metrics`, { signal: AbortSignal.timeout(1500) });
					return [p.name, response.ok ? parseMetrics(await response.text()) : null] as const;
				} catch {
					return [p.name, null] as const;
				}
			}),
		);
		if (stopped) return;
		const sample: Sample = {
			t,
			processes: {},
			queueWaiting: null,
			queueActive: null,
			fallbacks: null,
			fallbacksHeld: { progressing: null, atLimit: null, memoryHigh: null },
			streamsSkipped: null,
			timedOut: null,
		};
		const max = (a: number | null, b: number | null) => (b === null ? a : Math.max(a ?? 0, b));
		const add = (a: number | null, b: number | null) => (b === null ? a : (a ?? 0) + b);
		for (const [name, m] of scraped) {
			if (!m) {
				sample.processes[name] = {
					cpu: null,
					rssMb: null,
					heapUsedMb: null,
					lagMs: null,
					activeTurns: null,
				};
				continue;
			}
			let cpu: number | null = null;
			const last = lastCpu.get(name);
			if (m.cpuSeconds !== null) {
				if (last) cpu = ((m.cpuSeconds - last.seconds) / ((t - last.t) / 1000)) * 100;
				lastCpu.set(name, { t, seconds: m.cpuSeconds });
			}
			sample.processes[name] = {
				cpu,
				rssMb: m.rssMb,
				heapUsedMb: m.heapUsedMb,
				lagMs: m.lagMs,
				activeTurns: m.activeTurns,
			};
			// Every process in agent queue mode reports the same shared queue.
			sample.queueWaiting = max(sample.queueWaiting, m.queueWaiting);
			sample.queueActive = max(sample.queueActive, m.queueActive);
			sample.fallbacks = add(sample.fallbacks, m.fallbacks);
			const held = sample.fallbacksHeld ?? { progressing: null, atLimit: null };
			sample.fallbacksHeld = {
				progressing: add(held.progressing, m.heldProgressing),
				atLimit: add(held.atLimit, m.heldAtLimit),
				memoryHigh: add(held.memoryHigh ?? null, m.heldMemoryHigh),
			};
			sample.streamsSkipped = add(sample.streamsSkipped ?? null, m.streamsSkipped);
			sample.timedOut = add(sample.timedOut, m.timedOut);
		}
		onSample(sample);
	};
	void tick();
	const timer = setInterval(() => void tick(), intervalMs);
	return () => {
		stopped = true;
		clearInterval(timer);
	};
}
