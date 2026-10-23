import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { sleep } from '@n8n/utils/sleep';

import type { AppliedFault } from './execute';
import { runSchedule } from './execute';
import type { Fault, FaultKind, ScheduledFault } from './schedule';
import { generateSchedule } from './schedule';
import { HOOK_DIR, hook } from '../hooks/control';
import type { HookSpec } from '../hooks/spec';
import { FILES } from '../hooks/spec';
import type { Violation } from '../invariants';
import { checkWorkload } from '../invariants';
import { network } from '../network';
import type { Container } from '../process';
import { docker, freeze, logs, signal, startAgain, waitForExit } from '../process';
import { RigStack } from '../stack';
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
		message: 'test-rig chaos fault',
	},
];

export interface ChaosOptions {
	seed: number;
	faults: number;
	durationMs: number;
	perSecond: number;
	workers: number;
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

export function chaosSchedule(options: ChaosOptions): ScheduledFault[] {
	const workers = Array.from({ length: options.workers }, (_, i) => `worker-${i + 1}`);
	return generateSchedule(
		options.seed,
		{
			targets: ['main', ...workers],
			restartTargets: workers,
			hookTargets: workers,
			kinds: options.kinds,
			hookPoints: CHAOS_HOOKS.map((h) => h.point),
		},
		options.faults,
		options.durationMs,
	);
}

const running = async (container: Container) =>
	(await docker('inspect', '--format', '{{.State.Status}}', container.getId())).trim();

/** Applies chaos faults to a rig stack; each fault heals itself when its time is up. */
export function rigExecutor(rig: RigStack) {
	const byName = (name: string) => {
		const found = rig.n8nContainers().find((c) => c.name === name);
		if (!found) throw new Error(`no container ${name}`);
		return found.container;
	};
	const upstream = (to: 'postgres' | 'redis') =>
		rig.container(to === 'postgres' ? /-postgres$/ : /-redis$/);

	return async (fault: Fault) => {
		const container = byName(fault.target);
		switch (fault.kind) {
			case 'kill':
			case 'stop':
				await signal(container, fault.kind === 'kill' ? 'SIGKILL' : 'SIGTERM');
				await waitForExit(container, 120_000);
				await startAgain(container);
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
				await point.arm();
				await sleep(fault.forMs);
				await point.disarm();
				return;
			}
		}
	};
}

/** Brings every n8n container back to running, unfrozen, with a clean network and no armed hooks. */
async function heal(rig: RigStack) {
	for (const { container } of rig.n8nContainers()) {
		const status = await running(container);
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
	const rig = await RigStack.start({
		name: `chaos-${options.seed}`,
		workers: options.workers,
		runners: 'internal',
		scale: 6,
		hooks: CHAOS_HOOKS,
	});
	try {
		await rig.api.signIn();
		const workload = await Workload.setup(rig);
		workload.start(options.perSecond);
		const applied = await runSchedule(schedule, rigExecutor(rig), { now: Date.now, sleep });
		const remaining = options.durationMs - Math.max(0, ...applied.map((a) => a.endedMs));
		if (remaining > 0) await sleep(remaining);
		const requests = await workload.stop();
		await heal(rig);
		const record = await workload.record(requests, options.settleMs);
		if (options.outDir) {
			const dir = join(options.outDir, `seed-${options.seed}-${Date.now()}`);
			mkdirSync(dir, { recursive: true });
			for (const { name, container } of rig.n8nContainers()) {
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
			accepted: requests.filter((r) => r.status === 200).length,
			executions: Object.keys(record.executions).length,
			violations: checkWorkload(record),
		};
	} finally {
		await rig.stop();
	}
}
