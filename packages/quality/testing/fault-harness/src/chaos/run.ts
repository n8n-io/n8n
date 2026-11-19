import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { sleep } from '@n8n/utils/sleep';

import type { AppliedFault } from './execute';
import { runSchedule } from './execute';
import type { Fault, FaultKind, MenuOptions, ScheduledFault, Upstream } from './schedule';
import { generateSchedule } from './schedule';
import { HOOK_DIR, hitBetween, hook } from '../hooks/control';
import type { HookSpec, Role } from '../hooks/spec';
import { FILES } from '../hooks/spec';
import type { Violation } from '../invariants';
import { checkEngineWorkload, checkWorkload } from '../invariants';
import { network } from '../network';
import type { Container, Signal } from '../process';
import { docker, freeze, logs, signal, startAgain, waitForExit } from '../process';
import type { StackOptions } from '../stack';
import { CONTROL_POSTGRES, ENGINE_POSTGRES, HarnessStack } from '../stack';
import { ENGINE_V2_SETTINGS } from '../workflows';
import type { WorkloadRequest } from '../workload';
import { Workload } from '../workload';

/** Fault hooks a chaos schedule can arm; declared on every chaos stack. */
export const CHAOS_HOOKS: HookSpec[] = [
	{
		point: 'chaos-skip-lock-renewal',
		file: FILES.bullScripts,
		target: '',
		method: 'extendLock',
		kind: 'drop',
		returns: 1,
		lazy: true,
	},
	{
		point: 'chaos-fail-job',
		file: FILES.jobProcessor,
		target: 'JobProcessor.prototype',
		method: 'processJob',
		kind: 'fault',
		phase: 'before',
	},
];

export type EngineMode = NonNullable<StackOptions['engine']>;

const scopedTo = (file: string, target: string) => ({ file, target, method: 'handle' });

/**
 * Hooks an engine v2 chaos schedule can arm, in the container that runs the data plane.
 * The `pause` hook is a crash point: the run kills the container when a call reaches it.
 */
export function engineChaosHooks(engine: EngineMode): HookSpec[] {
	const roles: Role[] = [engine === 'container' ? 'engine' : 'main'];
	const stepStore = { file: FILES.engineStepStore, target: 'TypeOrmStepStore.prototype' };
	const ready = scopedTo(FILES.engineStepReady, 'StepReadyHandler.prototype');
	return [
		{
			point: 'chaos-fail-settled-load',
			...stepStore,
			method: 'loadStep',
			kind: 'fault',
			phase: 'before',
			scope: scopedTo(FILES.engineStepSettled, 'StepSettledHandler.prototype'),
			roles,
		},
		{
			point: 'chaos-fail-start-load',
			file: FILES.engineExecutionStore,
			target: 'TypeOrmExecutionStore.prototype',
			method: 'loadExecution',
			kind: 'fault',
			phase: 'before',
			scope: scopedTo(FILES.engineExecutionStart, 'ExecutionStartHandler.prototype'),
			roles,
		},
		{
			point: 'chaos-fail-ready-claim',
			...stepStore,
			method: 'claimStep',
			kind: 'fault',
			phase: 'before',
			scope: ready,
			roles,
		},
		{
			point: 'chaos-crash-after-step-complete',
			...stepStore,
			method: 'completeStep',
			kind: 'pause',
			phase: 'after',
			scope: ready,
			roles,
		},
	];
}

export interface ChaosOptions {
	seed: number;
	faults: number;
	durationMs: number;
	perSecond: number;
	workers: number;
	/** Runs the engine v2 profile instead of queue mode; `workers` is then ignored. */
	engine?: EngineMode;
	kinds: FaultKind[];
	settleMs: number;
	outDir?: string;
}

export interface ChaosResult {
	seed: number;
	schedule: ScheduledFault[];
	applied: AppliedFault[];
	requests: number;
	accepted: number;
	executions: number;
	violations: Violation[];
}

export interface ChaosProfile {
	stack: Pick<StackOptions, 'workers' | 'engine' | 'hooks'>;
	menu: Omit<MenuOptions, 'kinds'>;
	settings: Record<string, unknown>;
	check: (
		workload: Workload,
		requests: WorkloadRequest[],
		settleMs: number,
	) => Promise<{ record: unknown; executions: number; violations: Violation[] }>;
}

/** The stack, fault menu and invariants of a chaos run: queue mode with workers, or engine v2. */
export function chaosProfile({
	workers,
	engine,
}: Pick<ChaosOptions, 'workers' | 'engine'>): ChaosProfile {
	if (!engine) {
		const names = Array.from({ length: workers }, (_, i) => `worker-${i + 1}`);
		return {
			stack: { workers, hooks: CHAOS_HOOKS },
			menu: {
				targets: ['main', ...names],
				restartTargets: names,
				hookTargets: names,
				hookPoints: CHAOS_HOOKS.map((h) => h.point),
			},
			settings: {},
			check: async (workload, requests, settleMs) => {
				const record = await workload.record(requests, settleMs);
				return {
					record,
					executions: Object.keys(record.executions).length,
					violations: checkWorkload(record),
				};
			},
		};
	}
	const hooks = engineChaosHooks(engine);
	const targets = engine === 'container' ? ['main', 'engine'] : ['main'];
	return {
		stack: { workers: 0, engine, hooks },
		menu: {
			targets,
			restartTargets: targets,
			hookTargets: [engine === 'container' ? 'engine' : 'main'],
			hookPoints: hooks.map((h) => h.point),
			upstreams:
				engine === 'container'
					? { main: ['postgres', 'redis', 'engine'], engine: ['engine-postgres', 'redis', 'main'] }
					: { main: ['postgres'] },
		},
		settings: ENGINE_V2_SETTINGS,
		check: async (workload, requests, settleMs) => {
			const record = await workload.recordEngine(requests, settleMs);
			return {
				record,
				executions: record.executions.length,
				violations: checkEngineWorkload(record),
			};
		},
	};
}

export function chaosSchedule(options: ChaosOptions): ScheduledFault[] {
	return generateSchedule(
		options.seed,
		{ ...chaosProfile(options).menu, kinds: options.kinds },
		options.faults,
		options.durationMs,
	);
}

const SERVICES = {
	postgres: CONTROL_POSTGRES,
	'engine-postgres': ENGINE_POSTGRES,
	redis: /-redis$/,
};

/** Applies chaos faults to a harness stack; each fault heals itself when its time is up. */
function harnessExecutor(harness: HarnessStack) {
	const byName = (name: string) => {
		const found = harness.n8nContainers().find((c) => c.name === name);
		if (!found) throw new Error(`no container ${name}`);
		return found.container;
	};
	const upstream = (to: Upstream) =>
		to === 'main' || to === 'engine' ? byName(to) : harness.container(SERVICES[to]);
	const crashPoints = new Set(
		harness.hooks.filter((h) => (h.kind ?? 'pause') === 'pause').map((h) => h.point),
	);
	const restart = async (container: Container, how: Signal) => {
		await signal(container, how);
		await waitForExit(container, 120_000);
		await startAgain(container);
	};

	return async (fault: Fault): Promise<Pick<AppliedFault, 'hit'> | undefined> => {
		const container = byName(fault.target);
		switch (fault.kind) {
			case 'kill':
			case 'stop':
				await restart(container, fault.kind === 'kill' ? 'SIGKILL' : 'SIGTERM');
				return;
			case 'freeze':
				await freeze(container, true);
				await sleep(fault.forMs);
				await freeze(container, false);
				return;
			case 'delay':
				await network.delay(container, upstream(fault.to), fault.ms);
				await sleep(fault.forMs);
				await network.restore(container);
				return;
			case 'cut':
				await network.cut(container, upstream(fault.to));
				await sleep(fault.forMs);
				await network.restore(container);
				return;
			case 'hook': {
				const point = hook([container], fault.point);
				if (crashPoints.has(fault.point)) {
					const reached = point.waitHit(fault.forMs).then(
						() => true,
						() => false,
					);
					await point.arm();
					const hit = await reached;
					await point.disarm();
					if (hit) await restart(container, 'SIGKILL');
					return { hit };
				}
				const armedAt = Date.now();
				await point.arm();
				await sleep(fault.forMs);
				await point.disarm();
				return { hit: hitBetween(await logs(container), fault.point, armedAt, Date.now()) };
			}
		}
	};
}

/** Brings every n8n container back to running, unfrozen, with a clean network and no armed hooks. */
async function heal(harness: HarnessStack) {
	for (const { container } of harness.n8nContainers()) {
		const status = (
			await docker('inspect', '--format', '{{.State.Status}}', container.getId())
		).trim();
		if (status === 'paused') await freeze(container, false);
		if (status === 'exited') await startAgain(container);
		if (status !== 'exited') await network.restore(container).catch(() => undefined);
		await container.exec([
			'node',
			'-e',
			`const fs = require('fs'); for (const f of fs.readdirSync(${JSON.stringify(HOOK_DIR)})) if (f.endsWith('.arm')) fs.rmSync(${JSON.stringify(HOOK_DIR)} + '/' + f);`,
		]);
	}
}

/** One chaos run: a stack, a steady workload, the scheduled faults, then the invariants. */
export async function chaosRun(
	options: ChaosOptions,
	schedule = chaosSchedule(options),
): Promise<ChaosResult> {
	const profile = chaosProfile(options);
	const harness = await HarnessStack.start({
		name: `chaos-${options.seed}`,
		runners: 'internal',
		scale: 6,
		...profile.stack,
	});
	let started: Workload | undefined;
	try {
		await harness.api.signIn();
		const workload = await Workload.setup(harness, profile.settings);
		started = workload;
		workload.start(options.perSecond);
		const applied = await runSchedule(schedule, harnessExecutor(harness), { now: Date.now, sleep });
		const remaining = options.durationMs - Math.max(0, ...applied.map((a) => a.endedMs));
		if (remaining > 0) await sleep(remaining);
		const requests = await workload.stop();
		await heal(harness);
		const { record, executions, violations } = await profile.check(
			workload,
			requests,
			options.settleMs,
		);
		if (options.outDir) {
			const dir = join(options.outDir, `seed-${options.seed}-${Date.now()}`);
			mkdirSync(dir, { recursive: true });
			for (const { name, container } of harness.n8nContainers()) {
				writeFileSync(join(dir, `${name}.log`), await logs(container).catch(() => ''));
			}
			writeFileSync(
				join(dir, 'record.json'),
				JSON.stringify({ schedule, applied, record }, null, 2),
			);
		}
		return {
			seed: options.seed,
			schedule,
			applied,
			requests: requests.length,
			accepted: requests.filter((r) => r.accepted).length,
			executions,
			violations,
		};
	} finally {
		await started?.stop();
		await harness.stop();
	}
}
