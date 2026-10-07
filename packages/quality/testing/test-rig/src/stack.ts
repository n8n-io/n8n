import { sleep } from '@n8n/utils/sleep';
import type { N8NStack } from 'n8n-containers/stack';
import { createN8NStack } from 'n8n-containers/stack';

import { HOOK_DIR, parseHookLine, preloadNodeOptions } from './hooks/control';
import type { HookSpec } from './hooks/spec';
import { parseHookSpecs } from './hooks/spec';
import { N8nClient } from './n8n-client';
import type { Container } from './process';
import { logs } from './process';
import { PostgresProbe, RedisProbe } from './probes';
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
}

const byName = (containers: Container[]) =>
	[...containers].sort((a, b) => a.getName().localeCompare(b.getName(), 'en', { numeric: true }));

/** A running n8n stack with hooks, REST client and probes. */
export class RigStack {
	readonly api: N8nClient;

	readonly db: PostgresProbe;

	readonly redis: RedisProbe;

	private constructor(
		readonly stack: N8NStack,
		readonly stackStartMs: number,
		readonly hooks: HookSpec[],
	) {
		this.api = new N8nClient(stack.baseUrl);
		this.db = new PostgresProbe(async (command) => await this.execIn(/-postgres$/, command));
		this.redis = new RedisProbe(async (command) => await this.execIn(/-redis$/, command));
	}

	static async start(options: StackOptions): Promise<RigStack> {
		const started = Date.now();
		const hooks = parseHookSpecs(options.hooks ?? []);
		const mains = options.mains ?? 1;
		const stack = await createN8NStack({
			projectName: `rig-${options.name}-${process.pid}-${Date.now().toString(36)}`,
			postgres: true,
			mains,
			workers: options.workers,
			image: options.image,
			// A busy Docker VM can take well over the default 60 s to migrate and start.
			startupTimeoutMs: 180_000,
			env: {
				N8N_RUNNERS_MODE: options.runners,
				N8N_RUNNERS_ENABLED: 'true',
				NODE_OPTIONS: preloadNodeOptions(),
				TEST_RIG_HOOK_DIR: HOOK_DIR,
				TEST_RIG_HOOKS: JSON.stringify(hooks),
				...licenceEnv(mains),
				...scaledTimeouts(options.scale),
				...options.env,
			},
		});
		const rig = new RigStack(stack, Date.now() - started, hooks);
		try {
			await rig.assertHooksInstalled();
		} catch (error) {
			await rig.stop();
			throw error;
		}
		return rig;
	}

	get baseUrl() {
		return this.stack.baseUrl;
	}

	main(index = 1): Container {
		const found = this.mains()[index - 1];
		if (!found) throw new Error(`main ${index} not found`);
		return found;
	}

	mains(): Container[] {
		return byName(this.stack.findContainers(/-n8n(-main-\d+)?$/));
	}

	worker(index: number): Container {
		return this.container(new RegExp(`-n8n-worker-${index}$`));
	}

	workers(): Container[] {
		return byName(this.stack.findContainers(/-n8n-worker-\d+$/));
	}

	runner(): Container {
		return this.container(/-task-runner$/);
	}

	container(pattern: RegExp): Container {
		const [found] = this.stack.findContainers(pattern);
		if (!found) throw new Error(`container ${String(pattern)} not found`);
		return found;
	}

	/** Every n8n process container with a short name: main, main-2, worker-1, ... */
	n8nContainers(): Array<{ name: string; container: Container }> {
		const mains = this.mains();
		return [
			...mains.map((container, index) => ({
				name: index === 0 ? 'main' : `main-${index + 1}`,
				container,
			})),
			...this.workers().map((container, index) => ({ name: `worker-${index + 1}`, container })),
		];
	}

	private async execIn(pattern: RegExp, command: string[]): Promise<string> {
		const { output } = await this.container(pattern).exec(command);
		return output.trim();
	}

	/** Fails when a declared hook did not install in the containers of its roles. */
	async assertHooksInstalled(timeoutMs = 20_000) {
		const expected = this.hooks.filter((hook) => !hook.lazy);
		if (expected.length === 0) return;
		const deadline = Date.now() + timeoutMs;
		for (;;) {
			const missing: string[] = [];
			for (const hook of expected) {
				const containers = (hook.roles ?? ['worker']).flatMap((role) =>
					role === 'main' ? this.mains() : this.workers(),
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
		await this.stack.stop();
	}
}
