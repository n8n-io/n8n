import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import type { N8NConfig } from 'n8n-containers';

/**
 * `plain`, `tool` and `long` are editor chat turns. `webhook` calls the
 * Responses API of the agent's webhook integration. `workflow` calls a
 * production webhook of a workflow that runs the agent with Message an Agent.
 */
export const TURN_KINDS = ['plain', 'tool', 'datatable', 'long', 'webhook', 'workflow'] as const;
export type TurnKind = (typeof TURN_KINDS)[number];
export type TurnMix = Partial<Record<TurnKind, number>>;

/** A named stack shape. `env` merges over the shared agent env. */
export interface Topology {
	name: string;
	mains?: number;
	workers?: number;
	/** Run agent turns on workers. False keeps them on the mains, also with workers. */
	agentQueue?: boolean;
	/** Agent slots on each worker. Default: `workerConcurrency` of the config. */
	workerConcurrency?: number;
	/** Turns in flight for this topology. Default: `concurrency` of the config. */
	concurrency?: number;
	/** Measured turns for this topology. Default: `turns` of the config. */
	turns?: number;
	/** Limits of each main container. Memory in GB, CPU in cores. Default: the config. */
	resourceQuota?: N8NConfig['resourceQuota'];
	/** Limits of each worker container. Set it with `resourceQuota`, or the workers get that one. */
	workerResourceQuota?: N8NConfig['workerResourceQuota'];
	env?: Record<string, string>;
}

export interface BenchConfig {
	topologies: Array<string | Topology>;
	/** Turns to measure for each topology, warmup excluded. */
	turns: number;
	/** Turns in flight at the same time. */
	concurrency: number;
	/** Not measured. They load the model and the workers once before the run. */
	warmup: number;
	/** Relative weight of each turn kind. `--workload` sets this from a name. */
	mix: TurnMix;
	/** `<provider>/<model>`. The API key comes from the provider's env var. */
	model: string;
	/** Workers for presets that have workers. */
	workers: number;
	workerConcurrency: number;
	mains: number;
	image?: string;
	resourceQuota?: N8NConfig['resourceQuota'];
	workerResourceQuota?: N8NConfig['workerResourceQuota'];
	/** Extra env for every n8n process. */
	env: Record<string, string>;
	/** Directory for the JSON result. */
	out: string;
	/** Leave the stack running after the last topology, to inspect it. */
	keep: boolean;
	/** Port of the live cockpit page, or `off`. 0 picks a free port. */
	cockpit: number | 'off';
	/** Start VictoriaMetrics, VictoriaLogs and Vector next to each stack. */
	observability: boolean;
	/**
	 * Slot sweep: one queue topology for each value, with `workers` workers.
	 * Replaces `topologies`. See `slotSweep`.
	 */
	slots?: number[];
}

const WORKLOADS: Record<string, TurnMix> = {
	plain: { plain: 1 },
	tool: { tool: 1 },
	long: { long: 1 },
	webhook: { webhook: 1 },
	workflow: { workflow: 1 },
	datatable: { datatable: 1 },
	// Editor chat only: the mix of runs before webhook and workflow turns.
	chat: { plain: 5, tool: 3, long: 2 },
	mixed: { plain: 1, tool: 1, datatable: 1, long: 1, webhook: 1, workflow: 1 },
};

const DEFAULTS: BenchConfig = {
	topologies: ['main', 'queue'],
	turns: 30,
	concurrency: 5,
	warmup: 2,
	mix: WORKLOADS.mixed,
	model: 'anthropic/claude-sonnet-4-5',
	workers: 2,
	workerConcurrency: 10,
	mains: 2,
	env: {},
	out: 'agent-bench-results',
	keep: false,
	cockpit: 4790,
	observability: false,
};

/**
 * Presets. `queue-agents-off` keeps workflow queue mode but runs agent turns on
 * the main, which isolates the cost of moving turns to workers.
 * `queue-no-agent-workers` turns agent queue mode on but no worker takes agent
 * turns, so the main runs them under its own limits.
 */
export function presetTopology(name: string, config: BenchConfig): Topology {
	switch (name) {
		case 'main':
			return { name, mains: 1, workers: 0, agentQueue: false };
		case 'queue':
			return { name, mains: 1, workers: config.workers, agentQueue: true };
		case 'queue-agents-off':
			return { name, mains: 1, workers: config.workers, agentQueue: false };
		case 'queue-no-agent-workers':
			return {
				name,
				mains: 1,
				workers: config.workers,
				agentQueue: true,
				env: { N8N_AGENTS_WORKER_ENABLED: 'false' },
			};
		case 'multi-main':
			return { name, mains: config.mains, workers: config.workers, agentQueue: true };
		default:
			throw new Error(
				`Unknown topology "${name}". Use main, queue, queue-agents-off, queue-no-agent-workers, multi-main, or an object in the config file.`,
			);
	}
}

export function resolveTopology(entry: string | Topology, config: BenchConfig): Topology {
	return typeof entry === 'string' ? presetTopology(entry, config) : entry;
}

/**
 * One queue topology for each slot count, all with the same workers. Each one
 * sends as many turns at once as it has slots in total, so every slot is busy
 * and nothing waits in the queue. That isolates what more slots on a worker
 * cost. Each topology runs at least 3 rounds of turns, to reach a steady state.
 * An explicit `concurrency` or `turns` overrides this.
 */
export function slotSweep(
	slots: number[],
	config: BenchConfig,
	explicit: { concurrency: boolean; turns: boolean },
): Topology[] {
	return slots.map((perWorker) => {
		const concurrency = explicit.concurrency
			? config.concurrency
			: Math.max(1, config.workers * perWorker);
		return {
			name: `queue-${config.workers}w-x${perWorker}`,
			mains: 1,
			workers: config.workers,
			agentQueue: true,
			workerConcurrency: perWorker,
			concurrency,
			turns: explicit.turns ? config.turns : Math.max(config.turns, concurrency * 3),
		};
	});
}

/** Load for one topology, with the config as default. */
export function topologyLoad(topology: Topology, config: BenchConfig) {
	return {
		turns: topology.turns ?? config.turns,
		concurrency: topology.concurrency ?? config.concurrency,
	};
}

/** Stack config for one topology. Postgres always, so every topology has the same database. */
export function stackConfig(topology: Topology, config: BenchConfig): N8NConfig {
	const mains = topology.mains ?? 1;
	const workers = topology.workers ?? 0;
	const agentQueue = topology.agentQueue ?? workers > 0;
	const env: Record<string, string> = {
		N8N_ENABLED_MODULES: 'agents',
		N8N_COMMUNITY_PACKAGES_ENABLED: 'false',
		N8N_DIAGNOSTICS_ENABLED: 'false',
		...(agentQueue
			? {
					N8N_AGENTS_QUEUE_MODE_ENABLED: 'true',
					N8N_AGENTS_WORKER_ENABLED: 'true',
					N8N_AGENTS_WORKER_CONCURRENCY: String(
						topology.workerConcurrency ?? config.workerConcurrency,
					),
				}
			: {}),
		...licenseEnv(mains),
		...config.env,
		...topology.env,
	};
	const quota = topology.resourceQuota ?? config.resourceQuota;
	const workerQuota = topology.workerResourceQuota ?? config.workerResourceQuota;
	return {
		postgres: true,
		...(config.observability
			? { services: ['victoriaLogs', 'victoriaMetrics', 'vector'] as const }
			: {}),
		mains,
		workers,
		env,
		projectName: `agent-bench-${topology.name}`,
		...(mains > 1 ? { lbPolicy: 'round_robin' as const } : {}),
		...(config.image ? { image: config.image } : {}),
		...(quota ? { resourceQuota: quota } : {}),
		...(workerQuota ? { workerResourceQuota: workerQuota } : {}),
	};
}

function licenseEnv(mains: number): Record<string, string> {
	if (mains < 2) return {};
	const key = process.env.N8N_LICENSE_ACTIVATION_KEY;
	const cert = process.env.N8N_LICENSE_CERT;
	if (!key && !cert) {
		throw new Error(
			'Multi-main needs a license. Set N8N_LICENSE_ACTIVATION_KEY or N8N_LICENSE_CERT.',
		);
	}
	return key ? { N8N_LICENSE_ACTIVATION_KEY: key } : { N8N_LICENSE_CERT: cert ?? '' };
}

const HELP = `Agent benchmark: start a stack for each topology, run agent chat turns
against a real model, print a table and write a JSON result.

Usage: pnpm --filter n8n-playwright bench:agents -- [options]

  --config <file>        JSON file with any BenchConfig fields (flags override it)
  --topology <list>      main, queue, queue-agents-off, multi-main (comma-separated)
  --workload <name>      plain | tool | long | webhook | workflow | chat | mixed
                         mixed (default): 20% each of the five kinds
                         chat: plain 5 : tool 3 : long 2, editor chat only
  --turns <n>            measured turns for each topology
  --concurrency <n>      turns in flight at the same time
  --warmup <n>           turns before measuring
  --model <p/m>          e.g. anthropic/claude-sonnet-4-5 or openai/gpt-4.1-mini
  --workers <n>          workers for presets with workers
  --worker-concurrency <n>  agent slots on each worker
  --slots <list>         slot sweep, e.g. 10,30,60: one queue topology for each
                         value with --workers workers. Each fills every slot
                         (concurrency = workers x slots) unless --concurrency is set
  --mains <n>            mains for multi-main
  --image <image>        n8n image (default: TEST_IMAGE_N8N or n8nio/n8n:local)
  --out <dir>            result directory
  --main-memory <MB>     memory limit of each main container (workers get --worker-memory, default 4096)
  --worker-memory <MB>   memory limit of each worker container
  --main-cpu <cores>     CPU limit of each main container, for example 1 or 0.5
  --worker-cpu <cores>   CPU limit of each worker container (default: no limit)
  --keep                 leave the last stack running
  --cockpit <port|off>   live cockpit page (default 4790)
  --observability        also start VictoriaMetrics, VictoriaLogs and Vector
  -h, --help

Env: ANTHROPIC_API_KEY or OPENAI_API_KEY for the model.
     N8N_LICENSE_ACTIVATION_KEY or N8N_LICENSE_CERT for multi-main.`;

export function loadConfig(argv: string[]): BenchConfig {
	const { values } = parseArgs({
		args: argv,
		allowPositionals: false,
		options: {
			config: { type: 'string' },
			topology: { type: 'string' },
			workload: { type: 'string' },
			turns: { type: 'string' },
			concurrency: { type: 'string' },
			warmup: { type: 'string' },
			model: { type: 'string' },
			workers: { type: 'string' },
			'worker-concurrency': { type: 'string' },
			slots: { type: 'string' },
			mains: { type: 'string' },
			image: { type: 'string' },
			out: { type: 'string' },
			'main-memory': { type: 'string' },
			'worker-memory': { type: 'string' },
			'main-cpu': { type: 'string' },
			'worker-cpu': { type: 'string' },
			keep: { type: 'boolean' },
			cockpit: { type: 'string' },
			observability: { type: 'boolean' },
			help: { type: 'boolean', short: 'h' },
		},
	});
	if (values.help) {
		process.stdout.write(`${HELP}\n`);
		process.exit(0);
	}

	const fromFile: Partial<BenchConfig> & { workload?: string } = values.config
		? JSON.parse(readFileSync(resolve(values.config), 'utf8'))
		: {};
	const config: BenchConfig = { ...DEFAULTS, ...fromFile, env: { ...fromFile.env } };
	const workload = values.workload ?? fromFile.workload;
	if (workload) {
		const mix = WORKLOADS[workload];
		if (!mix) {
			throw new Error(`Unknown workload "${workload}". Use ${Object.keys(WORKLOADS).join(', ')}.`);
		}
		config.mix = mix;
	}

	const int = (raw: string | undefined, name: string) => {
		if (raw === undefined) return undefined;
		const n = Number(raw);
		if (!Number.isInteger(n) || n < 0) throw new Error(`--${name} must be a whole number`);
		return n;
	};
	if (values.topology) config.topologies = values.topology.split(',').map((t) => t.trim());
	config.turns = int(values.turns, 'turns') ?? config.turns;
	config.concurrency = Math.max(1, int(values.concurrency, 'concurrency') ?? config.concurrency);
	config.warmup = int(values.warmup, 'warmup') ?? config.warmup;
	config.workers = int(values.workers, 'workers') ?? config.workers;
	config.workerConcurrency =
		int(values['worker-concurrency'], 'worker-concurrency') ?? config.workerConcurrency;
	config.mains = int(values.mains, 'mains') ?? config.mains;
	config.model = values.model ?? config.model;
	config.image = values.image ?? config.image;
	config.out = values.out ?? config.out;
	// Quotas are in GB. Workers inherit the main quota when they have none, so give them their own.
	const mainMemory = int(values['main-memory'], 'main-memory');
	const workerMemory = int(values['worker-memory'], 'worker-memory');
	if (mainMemory) {
		config.resourceQuota = { ...config.resourceQuota, memory: mainMemory / 1024 };
	}
	const cores = (raw: string | undefined, name: string) => {
		if (raw === undefined) return undefined;
		const n = Number(raw);
		if (!(n > 0)) throw new Error(`--${name} must be a number above 0`);
		return n;
	};
	const mainCpu = cores(values['main-cpu'], 'main-cpu');
	const workerCpu = cores(values['worker-cpu'], 'worker-cpu');
	if (mainCpu) config.resourceQuota = { ...config.resourceQuota, cpu: mainCpu };
	// Any main quota needs a worker quota, or the workers inherit the one of the main.
	if (workerMemory ?? workerCpu ?? config.resourceQuota) {
		config.workerResourceQuota = {
			...config.workerResourceQuota,
			memory: workerMemory ? workerMemory / 1024 : (config.workerResourceQuota?.memory ?? 4),
			...(workerCpu ? { cpu: workerCpu } : {}),
		};
	}
	config.keep = values.keep ?? config.keep;
	config.observability = values.observability ?? config.observability;
	if (values.cockpit !== undefined) {
		config.cockpit = values.cockpit === 'off' ? 'off' : (int(values.cockpit, 'cockpit') ?? 4790);
	}

	if (values.slots) {
		config.slots = values.slots.split(',').map((s) => {
			const n = int(s.trim(), 'slots');
			if (!n) throw new Error('--slots must be a list of whole numbers above 0');
			return n;
		});
	}
	if (config.slots?.length) {
		config.topologies = slotSweep(config.slots, config, {
			concurrency: values.concurrency !== undefined || fromFile.concurrency !== undefined,
			turns: values.turns !== undefined || fromFile.turns !== undefined,
		});
	}

	const unknownKind = Object.keys(config.mix).find(
		(kind) => !(TURN_KINDS as readonly string[]).includes(kind),
	);
	if (unknownKind) throw new Error(`Unknown turn kind "${unknownKind}" in the mix`);
	if (Object.values(config.mix).every((weight) => (weight ?? 0) <= 0)) {
		throw new Error('The workload mix has no turn kind with a weight above 0');
	}
	return config;
}
