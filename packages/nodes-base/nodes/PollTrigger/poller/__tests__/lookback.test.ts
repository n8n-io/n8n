import { poll } from '../poller';
import type { FetchPage, Item } from '../types';
import { makeConfig, styles } from './sim/scenarios';
import { World, rng } from './sim/world';

const paginations = ['offset', 'page', 'token'] as const;

describe('poll: rows that become visible late', () => {
	it.each(styles.flatMap((style) => paginations.map((p) => [style.n, p] as const)))(
		'style %i with %s pagination emits a late row once',
		async (styleNumber, pagination) => {
			const style = styles.find((s) => s.n === styleNumber)!;
			const w = new World({
				order: style.order,
				pageSize: 30,
				timeKeys: !style.ids,
				skewMs: 10_000,
				idKeys: style.ids,
				seenLimit: 100,
				r: rng(7),
				log: () => {},
			});
			const cfg = makeConfig(
				{ order: style.order, pagination, useSince: style.useSince, ids: style.ids },
				{ clock: () => w.clock, skewMs: 10_000, pageSize: 30, maxItems: 90 },
			);
			const fetchPage: FetchPage = async (req) => w.fetch(req);
			const ids = (items: Item[]) => items.map((item) => item.id);

			w.insert(5);
			w.advance(20_000);
			const baseline = await poll(cfg, undefined, fetchPage);
			w.baselineSeq = w.seq;
			w.settledAfter = -1;
			w.advance(1_000);
			const fresh = w.insert(3).map((r) => r.key);
			w.advance(1_000);
			const first = await poll(cfg, baseline.state, fetchPage);
			expect(ids(first.items)).toEqual(fresh);

			w.advance(1_000);
			const late = w.insertLate();
			expect(late).toBeDefined();
			w.advance(1_000);
			const second = await poll(cfg, first.state, fetchPage);
			expect(ids(second.items)).toEqual([late!.key]);

			w.advance(1_000);
			const third = await poll(cfg, second.state, fetchPage);
			expect(third.items).toEqual([]);
		},
	);
});
