/** What the cockpit shows about a run: the settings of each topology and the turn scenarios. */
import type { RunConfig, Scenario } from './cockpit';
import {
	stackConfig,
	topologyLoad,
	type BenchConfig,
	type Topology,
	type TurnKind,
	type TurnMix,
} from './config';
import { KIND_PATHS, PROMPTS } from './workload';

const SECRET_ENV = /LICENSE|KEY|TOKEN|SECRET|PASSWORD|CERT/i;

/** The settings of one topology, as the cockpit shows them. Null when the stack config fails. */
export function runConfig(topology: Topology, config: BenchConfig): RunConfig | undefined {
	try {
		const n8n = stackConfig(topology, config);
		const env = n8n.env ?? {};
		const slots = Number(env.N8N_AGENTS_WORKER_CONCURRENCY);
		return {
			mains: n8n.mains ?? 1,
			workers: n8n.workers ?? 0,
			...(n8n.webhooks ? { webhooks: n8n.webhooks } : {}),
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

export function scenarios(mix: TurnMix): Scenario[] {
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
