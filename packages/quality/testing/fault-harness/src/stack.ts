import { sleep } from '@n8n/utils/sleep';
import type { N8NStack } from 'n8n-containers/stack';
import { createN8NStack } from 'n8n-containers/stack';

import { HOOK_DIR, parseHookLine, preloadNodeOptions } from './hooks/control';
import type { HookSpec } from './hooks/spec';
import { parseHookSpecs } from './hooks/spec';
import { N8nClient } from './n8n-client';
import type { Container } from './process';
import { logs } from './process';
import { EngineProbe, PostgresProbe, RedisProbe } from './probes';
import { licenceEnv, scaledTimeouts } from './timeouts';

export interface StackOptions {
	name: string;
	mains?: number;
	workers: number;
	runners: 'internal' | 'external';
	/** Divides lock, renew, stall and grace timeouts. */
	scale: number;
	hooks?: HookSpec[];
	env?: Record<string, string>;
	/** n8n image for this stack. The runners image stays the one TEST_IMAGE_N8N selects, so use it with internal runners. */
	image?: string;
	/** Runs engine v2 in the main (`in-process`) or in a separate `n8n engine` container. */
	engine?: 'in-process' | 'container';
}

export const CONTROL_POSTGRES = /(?<!-engine)-postgres$/;
export const ENGINE_POSTGRES = /-engine-postgres$/;

const byName = (containers: Container[]) =>
	[...containers].sort((a, b) => a.getName().localeCompare(b.getName(), 'en', { numeric: true }));

const running = new Set<HarnessStack>();
const starting = new Set<Promise<unknown>>();

/** Stops every stack this process started and has not stopped, for cleanup after a timeout or an interrupt. */
export async function stopAllStacks() {
	await Promise.allSettled([...starting]);
	const results = await Promise.allSettled(
		[...running].map(async (harness) => await harness.stop()),
	);
	const errors = results.flatMap((result) =>
		result.status === 'rejected' ? [result.reason as unknown] : [],
	);
	if (errors.length > 0) throw new AggregateError(errors, 'failed to stop every stack');
}

/** A running n8n stack with hooks, REST client and probes. */
export class HarnessStack {
	readonly api: N8nClient;

	readonly db: PostgresProbe;

	readonly redis: RedisProbe;

	/** The engine v2 database; on the stack Postgres in-process, on its own Postgres with an engine container. */
	readonly engineDb: EngineProbe;

	private stopping?: Promise<void>;

	private constructor(
		readonly stack: N8NStack,
		readonly hooks: HookSpec[],
	) {
		this.api = new N8nClient(stack.baseUrl);
		this.db = new PostgresProbe(async (command) => await this.execIn(CONTROL_POSTGRES, command));
		this.redis = new RedisProbe(async (command) => await this.execIn(/-redis$/, command));
		this.engineDb = new EngineProbe(async (query) => {
			const dedicated = this.stack.findContainers(ENGINE_POSTGRES).length > 0;
			return await this.execIn(dedicated ? ENGINE_POSTGRES : CONTROL_POSTGRES, [
				'psql',
				'-U',
				dedicated ? 'engine_user' : 'n8n_user',
				'-d',
				'n8n_engine',
				'-tAc',
				query,
			]);
		});
	}

	static async start(options: StackOptions): Promise<HarnessStack> {
		const hooks = parseHookSpecs(options.hooks ?? []);
		const mains = options.mains ?? 1;
		const creating = createN8NStack({
			projectName: `harness-${options.name}-${process.pid}-${Date.now().toString(36)}`,
			postgres: true,
			mains,
			workers: options.workers,
			image: options.image,
			engine: options.engine,
			// A busy Docker VM can take well over the default 60 s to migrate and start.
			startupTimeoutMs: 180_000,
			env: {
				N8N_RUNNERS_MODE: options.runners,
				N8N_RUNNERS_ENABLED: 'true',
				NODE_OPTIONS: preloadNodeOptions(),
				FAULT_HARNESS_HOOKS: JSON.stringify(hooks),
				...licenceEnv(mains),
				...scaledTimeouts(options.scale),
				...options.env,
				FAULT_HARNESS_HOOK_DIR: HOOK_DIR,
			},
		}).then((stack) => {
			const harness = new HarnessStack(stack, hooks);
			running.add(harness);
			return harness;
		});
		starting.add(creating);
		const harness = await creating.finally(() => starting.delete(creating));
		try {
			await harness.assertHooksInstalled();
		} catch (error) {
			await harness.stop();
			throw error;
		}
		return harness;
	}

	mains(): Container[] {
		return byName(this.stack.findContainers(/-n8n(-main-\d+)?$/));
	}

	worker(index: number): Container {
		const found = this.workers()[index - 1];
		if (!found) throw new Error(`worker ${index} not found`);
		return found;
	}

	workers(): Container[] {
		return byName(this.stack.findContainers(/-n8n-worker-\d+$/));
	}

	/** The `n8n engine` container of a stack with `engine: 'container'`. */
	engine(): Container {
		const [found] = this.engines();
		if (!found) throw new Error('engine container not found');
		return found;
	}

	engines(): Container[] {
		return this.stack.findContainers(/-n8n-engine$/);
	}

	container(pattern: RegExp): Container {
		const [found] = this.stack.findContainers(pattern);
		if (!found) throw new Error(`container ${String(pattern)} not found`);
		return found;
	}

	/** Every n8n process container with a short name: main, main-2, worker-1, ..., engine */
	n8nContainers(): Array<{ name: string; container: Container }> {
		const mains = this.mains();
		return [
			...mains.map((container, index) => ({
				name: index === 0 ? 'main' : `main-${index + 1}`,
				container,
			})),
			...this.workers().map((container, index) => ({ name: `worker-${index + 1}`, container })),
			...this.engines().map((container) => ({ name: 'engine', container })),
		];
	}

	private async execIn(pattern: RegExp, command: string[]): Promise<string> {
		const { output } = await this.container(pattern).exec(command);
		return output.trim();
	}

	/** Fails when a declared hook did not install in the containers of its roles. */
	async assertHooksInstalled() {
		const expected = this.hooks.filter((hook) => !hook.lazy);
		if (expected.length === 0) return;
		const deadline = Date.now() + 20_000;
		for (;;) {
			const missing: string[] = [];
			for (const hook of expected) {
				const containers = (hook.roles ?? ['worker']).flatMap((role) =>
					role === 'main' ? this.mains() : role === 'engine' ? this.engines() : this.workers(),
				);
				for (const container of containers) {
					const events = (await logs(container))
						.split('\n')
						.map(parseHookLine)
						.filter((line) => line?.point === hook.point);
					const failed = events.find(
						(line) => line?.event === 'missing' || line?.event === 'invalid',
					);
					if (failed) {
						throw new Error(
							`hook ${hook.point} ${failed.event} in ${container.getName()}: ${JSON.stringify(failed.detail)}`,
						);
					}
					if (!events.some((line) => line?.event === 'installed'))
						missing.push(`${hook.point}@${container.getName()}`);
				}
			}
			if (missing.length === 0) return;
			if (Date.now() > deadline) throw new Error(`hooks not installed: ${missing.join(', ')}`);
			await sleep(500);
		}
	}

	async stop() {
		this.stopping ??= this.stack.stop().finally(() => running.delete(this));
		await this.stopping;
	}
}
