import { describeFault, generateSchedule, random } from './schedule';
import type { MenuOptions } from './schedule';

const menu: MenuOptions = {
	targets: ['main', 'worker-1', 'worker-2'],
	restartTargets: ['worker-1', 'worker-2'],
	kinds: ['kill', 'stop', 'freeze', 'delay', 'cut', 'hook'],
	hookPoints: ['chaos-fail-job'],
	maxFaultMs: 5_000,
};

describe('random', () => {
	it('repeats the same sequence for the same seed', () => {
		const [a, b] = [random(42), random(42)];
		expect(Array.from({ length: 5 }, () => a.next())).toEqual(
			Array.from({ length: 5 }, () => b.next()),
		);
		expect(random(1).next()).not.toBe(random(2).next());
	});

	it('keeps integers inside their bounds', () => {
		const rng = random(7);
		const values = Array.from({ length: 1000 }, () => rng.int(3, 5));
		expect(new Set(values)).toEqual(new Set([3, 4, 5]));
	});
});

describe('generateSchedule', () => {
	it('gives the same schedule for the same seed and menu', () => {
		expect(generateSchedule(99, menu, 8, 30_000)).toEqual(generateSchedule(99, menu, 8, 30_000));
		expect(generateSchedule(99, menu, 8, 30_000)).not.toEqual(
			generateSchedule(100, menu, 8, 30_000),
		);
	});

	it('orders faults in time inside the duration and keeps them inside the menu', () => {
		const schedule = generateSchedule(5, menu, 50, 30_000);
		expect(schedule.map((s) => s.atMs)).toEqual(
			[...schedule.map((s) => s.atMs)].sort((a, b) => a - b),
		);
		for (const { atMs, fault } of schedule) {
			expect(atMs).toBeGreaterThanOrEqual(0);
			expect(atMs).toBeLessThanOrEqual(30_000);
			expect(menu.targets).toContain(fault.target);
			if ('forMs' in fault) expect(fault.forMs).toBeLessThanOrEqual(5_000);
		}
	});

	it('restarts only restart targets', () => {
		const restarts = generateSchedule(11, menu, 200, 1_000).filter(
			(s) => s.fault.kind === 'kill' || s.fault.kind === 'stop',
		);
		expect(restarts.length).toBeGreaterThan(0);
		expect(restarts.every((s) => s.fault.target !== 'main')).toBe(true);
	});

	it('aims hook faults only at hook targets', () => {
		const hooks = generateSchedule(13, { ...menu, hookTargets: ['worker-1'] }, 300, 1_000).filter(
			(s) => s.fault.kind === 'hook',
		);
		expect(hooks.length).toBeGreaterThan(0);
		expect(new Set(hooks.map((s) => s.fault.target))).toEqual(new Set(['worker-1']));
	});

	it('leaves hook faults out when no hook point is declared', () => {
		const kinds = generateSchedule(3, { ...menu, hookPoints: [] }, 100, 1_000).map(
			(s) => s.fault.kind,
		);
		expect(kinds).not.toContain('hook');
	});

	it('rejects an empty menu or restarts with nothing to restart', () => {
		expect(() => generateSchedule(1, { ...menu, kinds: [] }, 1, 1)).toThrow('empty fault menu');
		expect(() => generateSchedule(1, { ...menu, restartTargets: [] }, 1, 1)).toThrow(
			'restart target',
		);
	});
});

describe('describeFault', () => {
	it('prints every field', () => {
		expect(describeFault({ kind: 'cut', target: 'worker-1', to: 'redis', forMs: 2000 })).toBe(
			'kind=cut target=worker-1 to=redis forMs=2000',
		);
	});
});
