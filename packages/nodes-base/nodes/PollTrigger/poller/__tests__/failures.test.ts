import { poll } from '../poller';
import type { FetchPage, PollConfig } from '../types';
import { makeConfig, styles } from './sim/scenarios';
import { World, rng } from './sim/world';

const paginations = ['offset', 'page', 'token'] as const;

const combos = styles.flatMap((style) =>
	paginations.map((pagination) => [style.n, pagination] as const),
);

const setup = (styleNumber: number, pagination: (typeof paginations)[number]) => {
	const style = styles.find((s) => s.n === styleNumber)!;
	const w = new World({
		order: style.order,
		pageSize: 5,
		timeKeys: !style.ids,
		skewMs: 0,
		idKeys: style.ids,
		seenLimit: 100,
		r: rng(1),
		log: () => {},
	});
	const cfg: PollConfig = makeConfig(
		{ order: style.order, pagination, useSince: style.useSince, ids: style.ids },
		{ clock: () => w.clock, skewMs: 0, maxPages: 5, maxItems: 50 },
	);
	const fetchPage: FetchPage = async (req) => w.fetch(req);
	return { w, cfg, fetchPage };
};

describe('poll: fetch failures', () => {
	it.each(combos)(
		'style %i with %s pagination rejects when a later fetch fails',
		async (style, pagination) => {
			const { w, cfg, fetchPage } = setup(style, pagination);
			w.insert(3);
			w.advance(1_000);
			const { state } = await poll(cfg, undefined, fetchPage);
			w.advance(60_000);
			const created = w.insert(12).map((r) => r.key);

			let calls = 0;
			const failing: FetchPage = async (req) => {
				if (++calls === 2) throw new Error('simulated 503');
				return await fetchPage(req);
			};
			await expect(poll(cfg, state, failing)).rejects.toThrow('simulated 503');

			const retried = await poll(cfg, state, fetchPage);
			expect(retried.items.map((item) => item.id)).toEqual(created);
		},
	);

	it.each(combos)(
		'style %i with %s pagination rejects when the first fetch fails',
		async (style, pagination) => {
			const { w, cfg, fetchPage } = setup(style, pagination);
			w.insert(3);
			const { state } = await poll(cfg, undefined, fetchPage);
			w.insert(2);
			await expect(
				poll(cfg, state, async () => {
					throw new Error('simulated 503');
				}),
			).rejects.toThrow('simulated 503');
		},
	);
});
