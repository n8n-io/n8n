import { poll } from '../poller';
import type { FetchPage } from '../types';
import { type Result, type Scenario, minimalTrace, runScenario } from './sim/harness';
import { fuzz, makeConfig, styles, targeted } from './sim/scenarios';
import { World, rng } from './sim/world';

const SEEDS = 150;
const paginations = ['offset', 'page', 'token'] as const;

const explain = (sc: Scenario, res: Result) =>
	res.violations.length === 0
		? []
		: [
				`${sc.name} seed ${sc.seed}: ${res.violations[0].g} ${res.violations[0].msg}`,
				...minimalTrace(res, res.violations[0]),
			];

describe('poll: end of list signalled only by an empty page', () => {
	it.each(['offset', 'page'] as const)(
		'completes a newest-first walk on a list that was empty at activation (%s)',
		async (pagination) => {
			const w = new World({
				order: 'newestFirst',
				pageSize: 30,
				timeKeys: false,
				skewMs: 0,
				idKeys: true,
				seenLimit: 100,
				r: rng(1),
				log: () => {},
				hasMore: 'nonEmpty',
			});
			const cfg = makeConfig(
				{ order: 'newestFirst', pagination, useSince: false, ids: true },
				{ clock: () => w.clock, pageSize: 30, maxItems: 90 },
			);
			let fetches = 0;
			const fetchPage: FetchPage = async (req) => {
				fetches++;
				return w.fetch(req);
			};

			const baseline = await poll(cfg, undefined, fetchPage);
			const first = w.insert(3).map((r) => r.key);
			const one = await poll(cfg, baseline.state, fetchPage);
			const second = w.insert(2).map((r) => r.key);
			fetches = 0;
			const two = await poll(cfg, one.state, fetchPage);

			expect(one.items.map((item) => item.id)).toEqual(first);
			expect(two.items.map((item) => item.id)).toEqual(second);
			expect(fetches).toBeLessThanOrEqual(cfg.maxPages + cfg.maxStepBack);
		},
	);

	describe('named scenarios', () => {
		const scenarios = targeted(2000).map((sc) => ({ ...sc, hasMore: 'nonEmpty' as const }));
		it.each(scenarios.map((sc) => [sc.name, sc] as const))('%s', async (_name, sc) => {
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
				const sc: Scenario = { ...fuzz(seed, style, pagination), hasMore: 'nonEmpty' };
				failures.push(...explain(sc, await runScenario(poll, sc)));
			}
			expect(failures).toEqual([]);
		});
	});
});
