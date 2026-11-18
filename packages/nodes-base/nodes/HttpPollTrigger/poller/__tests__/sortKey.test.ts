import { poll } from '../poller';
import { compareSortKeys, toSortKey } from '../sortKey';
import type { Item } from '../types';
import { type Result, type Scenario, minimalTrace, runScenario } from './sim/harness';
import { fuzz, makeConfig, styles, targeted } from './sim/scenarios';
import { World, rng } from './sim/world';

const SEEDS = 100;
const BASE = 9007199254740993n;
const encodeTs = (ts: number) => (BASE + BigInt(ts)).toString();
const timestamp = (item: Item) => item.ts as string;

const explain = (sc: Scenario, res: Result) =>
	res.violations.length === 0
		? []
		: [
				`${sc.name} seed ${sc.seed}: ${res.violations[0].g} ${res.violations[0].msg}`,
				...minimalTrace(res, res.violations[0]),
			];

const withBigIds = (sc: Scenario): Scenario => ({
	...sc,
	encodeTs,
	cfg: { ...sc.cfg, timestamp },
});

describe('sort keys', () => {
	it('keeps integer strings above 2^53 exact', () => {
		expect(toSortKey('9007199254740993')).toBe(9007199254740993n);
		expect(compareSortKeys(toSortKey('9007199254740993'), toSortKey('9007199254740992'))).toBe(1);
	});

	it('turns safe integers into numbers', () => {
		expect(toSortKey(5n)).toBe(5);
		expect(toSortKey('42')).toBe(42);
		expect(toSortKey(' 7 ')).toBe(7);
	});

	it('accepts decimal strings and numbers', () => {
		expect(toSortKey('1700000000.25')).toBe(1700000000.25);
		expect(toSortKey(1700000000000)).toBe(1700000000000);
	});

	it('compares bigints with numbers', () => {
		expect(compareSortKeys(9007199254740993n, 5)).toBe(1);
		expect(compareSortKeys(5, 9007199254740993n)).toBe(-1);
	});

	it.each(['', 'abc', null, undefined, Number.NaN])('rejects %j', (value) => {
		expect(() => toSortKey(value)).toThrow('is not a number');
	});

	it('stores bigint sort keys as strings in the state', async () => {
		const w = new World({
			order: 'newestFirst',
			pageSize: 5,
			timeKeys: false,
			skewMs: 0,
			idKeys: true,
			seenLimit: 100,
			r: rng(1),
			log: () => {},
			encodeTs,
		});
		w.insert(3);
		const cfg = makeConfig(
			{ order: 'newestFirst', pagination: 'offset', useSince: false, ids: true },
			{ clock: () => w.clock, timestamp },
		);
		const result = await poll(cfg, undefined, async (req) => w.fetch(req));
		expect(result.state).toMatchObject({
			target: { ts: encodeTs(w.live[0].ts), keys: [expect.any(String)] },
			lookback: { from: encodeTs(w.live[0].ts) },
		});
	});

	describe('ids above 2^53', () => {
		const idStyles = styles.filter((style) => style.ids).map((style) => style.n);

		it.each(
			targeted(3000)
				.filter((sc) => sc.style !== undefined && idStyles.includes(sc.style))
				.map((sc) => [sc.name, withBigIds(sc)] as const),
		)('%s', async (_name, sc) => {
			expect(explain(sc, await runScenario(poll, sc))).toEqual([]);
		});

		it.each(
			idStyles.flatMap((style) =>
				(['offset', 'page', 'token'] as const).map((pagination) => [style, pagination] as const),
			),
		)('fuzz style %i with %s pagination', async (style, pagination) => {
			const failures: string[] = [];
			for (let seed = 1; seed <= SEEDS; seed++) {
				const sc = withBigIds(fuzz(seed, style, pagination));
				failures.push(...explain(sc, await runScenario(poll, sc)));
			}
			expect(failures).toEqual([]);
		});
	});
});
