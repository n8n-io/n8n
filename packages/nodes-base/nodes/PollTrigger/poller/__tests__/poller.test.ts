import { poll } from '../poller';
import { type Result, type Scenario, minimalTrace, runScenario } from './sim/harness';
import { fuzz, styles, targeted } from './sim/scenarios';

const SEEDS = 150;
const paginations = ['offset', 'page', 'token'] as const;

const explain = (sc: Scenario, res: Result) =>
	res.violations.length === 0
		? []
		: [
				`${sc.name} seed ${sc.seed}: ${res.violations[0].g} ${res.violations[0].msg}`,
				...minimalTrace(res, res.violations[0]),
			];

describe('poll: sorted styles', () => {
	describe('named scenarios', () => {
		it.each(targeted(1000).map((sc) => [sc.name, sc] as const))('%s', async (_name, sc) => {
			expect(explain(sc, await runScenario(poll, sc))).toEqual([]);
		});
	});

	describe('fuzz', () => {
		const combos = styles.flatMap((style) =>
			paginations.map((pagination) => [style.n, pagination] as const),
		);
		it.each(combos)('style %i with %s pagination', async (style, pagination) => {
			const failures: string[] = [];
			for (let seed = 1; seed <= SEEDS; seed++) {
				const sc = fuzz(seed, style, pagination);
				failures.push(...explain(sc, await runScenario(poll, sc)));
			}
			expect(failures).toEqual([]);
		});
	});
});
