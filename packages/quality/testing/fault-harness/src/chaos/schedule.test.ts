import { generateSchedule, random } from './schedule';
import type { MenuOptions, ScheduledFault } from './schedule';

const menu: MenuOptions = {
	targets: ['main', 'worker-1', 'worker-2'],
	restartTargets: ['worker-1', 'worker-2'],
	kinds: ['kill', 'stop', 'freeze', 'delay', 'cut', 'hook'],
	hookPoints: ['chaos-fail-job'],
	maxFaultMs: 5_000,
};

const end = ({ atMs, fault }: ScheduledFault) => atMs + ('forMs' in fault ? fault.forMs : 5_000);

describe('random', () => {
	it('repeats the same sequence for the same seed', () => {
		const [a, b] = [random(42), random(42)];
		expect(Array.from({ length: 5 }, () => a.next())).toEqual(
			Array.from({ length: 5 }, () => b.next()),
		);
		expect(random(1).next()).not.toBe(random(2).next());
	});
});

describe('generateSchedule', () => {
	it('gives the same schedule for the same seed and menu', () => {
		expect(generateSchedule(99, menu, 8, 120_000)).toEqual(generateSchedule(99, menu, 8, 120_000));
		expect(generateSchedule(99, menu, 8, 120_000)).not.toEqual(
			generateSchedule(100, menu, 8, 120_000),
		);
	});

	it('orders faults in time inside the duration, keeps them inside the menu and apart on one target', () => {
		const schedule = generateSchedule(5, menu, 30, 600_000);
		expect(schedule.map((s) => s.atMs)).toEqual(
			[...schedule.map((s) => s.atMs)].sort((a, b) => a - b),
		);
		for (const [index, entry] of schedule.entries()) {
			expect(entry.atMs).toBeGreaterThanOrEqual(0);
			expect(entry.atMs).toBeLessThanOrEqual(600_000);
			expect(menu.targets).toContain(entry.fault.target);
			if ('forMs' in entry.fault) expect(entry.fault.forMs).toBeLessThanOrEqual(5_000);
			const next = schedule
				.slice(index + 1)
				.find((other) => other.fault.target === entry.fault.target);
			if (next) expect(next.atMs).toBeGreaterThan(end(entry));
		}
	});

	it('restarts only restart targets', () => {
		const restarts = generateSchedule(11, menu, 40, 600_000).filter(
			(s) => s.fault.kind === 'kill' || s.fault.kind === 'stop',
		);
		expect(restarts.length).toBeGreaterThan(0);
		expect(restarts.every((s) => s.fault.target !== 'main')).toBe(true);
	});

	it('aims hook faults only at hook targets', () => {
		const hooks = generateSchedule(13, { ...menu, hookTargets: ['worker-1'] }, 40, 600_000).filter(
			(s) => s.fault.kind === 'hook',
		);
		expect(hooks.length).toBeGreaterThan(0);
		expect(new Set(hooks.map((s) => s.fault.target))).toEqual(new Set(['worker-1']));
	});

	it('leaves hook faults out when no hook point is declared', () => {
		const kinds = generateSchedule(3, { ...menu, hookPoints: [] }, 40, 600_000).map(
			(s) => s.fault.kind,
		);
		expect(kinds).not.toContain('hook');
	});

	it('rejects a menu with no usable fault or restarts with nothing to restart', () => {
		expect(() => generateSchedule(1, { ...menu, kinds: [] }, 1, 1)).toThrow('empty fault menu');
		expect(() => generateSchedule(1, { ...menu, kinds: ['hook'], hookPoints: [] }, 1, 1)).toThrow(
			'empty fault menu',
		);
		expect(() => generateSchedule(1, { ...menu, restartTargets: [] }, 1, 1)).toThrow(
			'restart target',
		);
	});
});
