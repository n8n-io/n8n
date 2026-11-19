import { CHAOS_HOOKS, chaosProfile, chaosSchedule, engineChaosHooks, hitSince } from './run';
import { parseHookSpecs } from '../hooks/spec';

const options = {
	seed: 7,
	faults: 12,
	durationMs: 600_000,
	perSecond: 4,
	workers: 2,
	kinds: ['kill', 'stop', 'freeze', 'delay', 'cut', 'hook'] as const,
	settleMs: 1,
};

describe('chaosProfile', () => {
	it('runs queue mode with workers when no engine is set', () => {
		const { stack, menu, settings } = chaosProfile({ workers: 2 });
		expect(stack).toEqual({ workers: 2, hooks: CHAOS_HOOKS });
		expect(menu).toEqual({
			targets: ['main', 'worker-1', 'worker-2'],
			restartTargets: ['worker-1', 'worker-2'],
			hookTargets: ['worker-1', 'worker-2'],
			hookPoints: CHAOS_HOOKS.map((h) => h.point),
		});
		expect(settings).toEqual({});
	});

	it('runs engine v2 in the main with no workers, and faults only the main', () => {
		const { stack, menu, settings } = chaosProfile({ workers: 2, engine: 'in-process' });
		expect(stack.workers).toBe(0);
		expect(stack.engine).toBe('in-process');
		expect(settings).toEqual({ engineType: 'v2' });
		expect(menu.targets).toEqual(['main']);
		expect(menu.restartTargets).toEqual(['main']);
		expect(menu.hookTargets).toEqual(['main']);
		expect(menu.upstreams).toEqual({ main: ['postgres'] });
		expect(stack.hooks?.every((h) => h.roles?.join() === 'main')).toBe(true);
	});

	it('hooks the engine container and cuts links between both planes and their services in remote mode', () => {
		const { stack, menu } = chaosProfile({ workers: 0, engine: 'container' });
		expect(menu.targets).toEqual(['main', 'engine']);
		expect(menu.restartTargets).toEqual(['main', 'engine']);
		expect(menu.hookTargets).toEqual(['engine']);
		expect(menu.upstreams).toEqual({
			main: ['postgres', 'redis', 'engine'],
			engine: ['engine-postgres', 'redis', 'main'],
		});
		expect(stack.hooks?.every((h) => h.roles?.join() === 'engine')).toBe(true);
	});
});

describe('engineChaosHooks', () => {
	it('are valid hook specs with one crash point', () => {
		const hooks = parseHookSpecs(engineChaosHooks('container'));
		expect(hooks.filter((h) => (h.kind ?? 'pause') === 'pause').map((h) => h.point)).toEqual([
			'chaos-crash-after-step-complete',
		]);
	});
});

describe('chaosSchedule', () => {
	it('keeps an engine schedule on the profile targets and links', () => {
		const schedule = chaosSchedule({ ...options, kinds: [...options.kinds], engine: 'in-process' });
		expect(schedule).toHaveLength(12);
		for (const { fault } of schedule) {
			expect(fault.target).toBe('main');
			if (fault.kind === 'delay' || fault.kind === 'cut') expect(fault.to).toBe('postgres');
		}
	});
});

describe('hitSince', () => {
	const line = (at: number, point: string) =>
		`[test-rig] ${new Date(at).toISOString()} pid=1 hit ${point} {}`;

	it('ignores a hit of the point logged before the arm time', async () => {
		const armedAt = Date.now();
		const log = [line(armedAt - 1_000, 'p'), line(armedAt + 10, 'q')].join('\n');
		expect(await hitSince(async () => log, 'p', armedAt, 300)).toBe(false);
	});

	it('finds a hit of the point logged after the arm time', async () => {
		const armedAt = Date.now();
		let log = line(armedAt - 1_000, 'p');
		setTimeout(() => (log += `\n${line(Date.now(), 'p')}`), 100);
		expect(await hitSince(async () => log, 'p', armedAt, 2_000)).toBe(true);
	});
});
