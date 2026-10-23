import { parseChaosArgs } from './chaos-args';

describe('parseChaosArgs', () => {
	it('has defaults and draws a seed when none is given', () => {
		expect(parseChaosArgs([], () => 0.5)).toMatchObject({
			seed: 2 ** 30,
			faults: 4,
			durationMs: 40_000,
			perSecond: 4,
			workers: 2,
			kinds: ['kill', 'stop', 'freeze', 'delay', 'cut', 'hook'],
			settleMs: 120_000,
			shrink: false,
			repeats: 3,
			minFailures: 2,
		});
	});

	it('reads every option', () => {
		expect(
			parseChaosArgs([
				'--seed',
				'7',
				'--faults',
				'2',
				'--duration',
				'10',
				'--rate',
				'1',
				'--workers',
				'1',
				'--kinds',
				'freeze,cut',
				'--settle',
				'30',
				'--shrink',
				'--repeats',
				'5',
				'--min-failures',
				'4',
				'--budget',
				'60',
				'--out',
				'/o',
			]),
		).toEqual({
			seed: 7,
			faults: 2,
			durationMs: 10_000,
			perSecond: 1,
			workers: 1,
			kinds: ['freeze', 'cut'],
			settleMs: 30_000,
			shrink: true,
			repeats: 5,
			minFailures: 4,
			budgetMs: 60_000,
			outDir: '/o',
			help: false,
		});
	});

	it.each([
		[['--kinds', 'explode']],
		[['--faults', '0']],
		[['--repeats', '2', '--min-failures', '3']],
	])('rejects %o', (args) => {
		expect(() => parseChaosArgs(args)).toThrow('Usage:');
	});
});
