import type { Item, PollConfig } from '../../types';
import type { Ctx, Scenario } from './harness';
import { rng, type Order, type TsMode } from './world';

export type Style = { n: number; name: string; order: Order; useSince: boolean; ids: boolean };

export const styles: Style[] = [
	{ n: 1, name: 'newest first, date', order: 'newestFirst', useSince: false, ids: false },
	{ n: 2, name: 'newest first, id', order: 'newestFirst', useSince: false, ids: true },
	{ n: 3, name: 'oldest first + since, date', order: 'oldestFirst', useSince: true, ids: false },
	{ n: 4, name: 'oldest first, date', order: 'oldestFirst', useSince: false, ids: false },
	{ n: 5, name: 'oldest first, id', order: 'oldestFirst', useSince: false, ids: true },
];

export const styleOf = (order: Order, useSince: boolean, ids: boolean) =>
	styles.find((s) => s.order === order && s.useSince === useSince && s.ids === ids)!.n;

export type Combo = {
	order: Order;
	pagination: 'offset' | 'page' | 'token';
	useSince: boolean;
	ids?: boolean;
};

const label = (c: Combo) =>
	`${c.order === 'newestFirst' ? 'newest' : 'oldest'}${c.useSince ? '+since' : ''}${c.ids ? ' id' : ' date'}/${c.pagination}`;

export const makeConfig = (c: Combo, over: Partial<PollConfig> = {}): PollConfig => ({
	order: c.order,
	pagination: c.pagination,
	useSince: c.useSince,
	sortKeyIsTime: !c.ids,
	pageSize: 5,
	maxPages: 3,
	maxItems: 15,
	overlap: 1,
	maxStepBack: 2,
	seenLimit: 100,
	skewMs: 5000,
	clock: () => Date.now(),
	key: (i: Item) => i.id as string,
	timestamp: (i: Item) => i.ts as number,
	...over,
});

const capacity = (c: Ctx) => c.cfg.maxPages * c.cfg.pageSize;

type Def = {
	name: string;
	pageCap?: number;
	only?: number[];
	initial?: number;
	setup?: (c: Ctx) => void;
	cap?: number;
	interval?: number;
	ticks: number;
	between?: (c: Ctx) => void;
	before?: (c: Ctx) => boolean | undefined;
};

const defs: Def[] = [
	{
		name: 'late-visible rows',
		ticks: 8,
		between: (c) => {
			c.w.insert(3);
			c.w.insertLate();
		},
		before: (c) => {
			if (c.fetch === 1) c.w.insertLate();
		},
	},
	{
		name: 'steady trickle',
		ticks: 8,
		between: (c) => {
			c.w.insert(c.r.int(1, 2));
		},
	},
	{
		name: 'burst > maxPages*pageSize',
		ticks: 4,
		between: (c) => {
			if (c.tick === 2) c.w.insert(2 * capacity(c) + 3);
		},
	},
	{
		name: 'boundary shift mid-walk',
		ticks: 4,
		between: (c) => {
			if (c.tick === 2) c.w.insert(3 * c.cfg.pageSize + 2);
		},
		before: (c) => {
			if (c.tick !== 2 || !c.req) return;
			if (c.fetch === 1) c.w.del([c.w.near(c.req, -1)], 'last of previous page');
			if (c.fetch === 2) c.w.del([c.w.near(c.req, 0)], 'about to read');
		},
	},
	{
		name: 'delete newest known',
		ticks: 7,
		between: (c) => {
			if (c.tick === 3 || c.tick === 5) c.w.del([c.newestKnown()], 'newest known');
			c.w.insert(2);
		},
	},
	{
		name: 'mass delete',
		ticks: 6,
		between: (c) => {
			if (c.tick === 3)
				c.w.del(
					c
						.known()
						.sort((a, b) => b.seq - a.seq)
						.slice(0, 2 * c.cfg.pageSize + 2),
					'mass',
				);
			c.w.insert(c.tick === 3 ? 3 : 1);
		},
	},
	{
		name: 'server cap 4 (does not divide pageSize)',
		cap: 4,
		pageCap: 28,
		ticks: 5,
		between: (c) => {
			c.w.insert(c.tick === 2 ? 3 * c.cfg.pageSize + 1 : 1);
		},
	},
	{
		name: 'server cap 3, page-boundary deletions',
		cap: 3,
		pageCap: 27,
		ticks: 5,
		between: (c) => {
			if (c.tick === 2) c.w.insert(3 * c.cfg.pageSize + 2);
		},
		before: (c) => {
			if ((c.tick !== 2 && c.tick !== 3) || c.fetch < 1 || !c.req) return;
			c.w.del([c.w.near(c.req, -1), c.w.near(c.req, 0)], 'page boundary');
		},
	},
	{
		name: 'server cap < pageSize',
		cap: 2,
		pageCap: 25,
		ticks: 5,
		between: (c) => {
			c.w.insert(c.tick === 2 ? 8 : 1);
		},
	},
	{
		name: 'fetch failure mid-walk',
		ticks: 5,
		between: (c) => {
			c.w.insert(c.tick === 2 ? 3 * c.cfg.pageSize : 1);
		},
		before: (c) => (c.tick === 2 && c.fetch === 1) || (c.tick === 3 && c.fetch === 0),
	},
	{
		name: 'ties > page',
		only: [1, 3, 4],
		interval: 1000,
		ticks: 4,
		between: (c) => {
			if (c.tick === 1) c.w.insert(c.cfg.pageSize + 2, 'last');
			if (c.tick === 2) c.w.insert(c.cfg.pageSize + 1, 'new');
			if (c.tick === 3) c.w.insert(c.cfg.pageSize, 'last');
		},
	},
	{
		name: 'late writes within skew',
		only: [1, 3, 4],
		ticks: 6,
		between: (c) => {
			if (c.tick % 2 === 0) c.w.insert(2, 'late');
		},
		before: (c) => {
			if (c.tick % 2 === 1 && c.fetch === 0) c.w.insert(1, 'late');
		},
	},
	{
		name: 'mass insert mid-walk',
		ticks: 4,
		between: (c) => {
			if (c.tick === 2) c.w.insert(3 * c.cfg.pageSize);
		},
		before: (c) => {
			if (c.tick === 2 && c.fetch === 1) c.w.insert(2 * c.cfg.pageSize);
		},
	},
	{
		name: 'baseline spans polls',
		only: [4, 5],
		initial: 40,
		ticks: 6,
		between: (c) => {
			c.w.insert(1);
		},
		before: (c) => {
			if (c.tick <= 2) c.w.insert(2);
			return c.tick <= 2 && c.fetch >= 2;
		},
	},
	{
		name: 'head tie group > page, ties during baseline',
		only: [1, 3, 4],
		interval: 1000,
		ticks: 6,
		setup: (c) => {
			c.w.insert(2 * c.cfg.pageSize + 2, 'new');
		},
		before: (c) => {
			if (c.tick === 0) c.w.insert(2, 'last');
		},
		between: (c) => {
			c.w.insert(c.tick <= 2 ? 3 : 1, c.tick <= 2 ? 'last' : 'each');
		},
	},
];

export const targeted = (baseSeed: number): Scenario[] =>
	styles.flatMap((st) =>
		(['offset', 'page', 'token'] as const).flatMap((pagination, j) => {
			const c: Combo = { order: st.order, pagination, useSince: st.useSince, ids: st.ids };
			return defs
				.filter((d) => !d.only || d.only.includes(st.n))
				.map((d, i) => ({
					name: `${st.n}. ${d.name} [${pagination}]`,
					style: st.n,
					seed: baseSeed + st.n * 1000 + i * 10 + j,
					cfg: makeConfig(c, pagination === 'page' ? { pageSize: 30, maxItems: 90 } : {}),
					idKeys: st.ids,
					cap: pagination === 'page' ? d.pageCap : d.cap,
					interval: d.interval,
					initial: d.initial ?? 12,
					ticks: d.ticks,
					setup: d.setup,
					between: d.between,
					before: d.before,
				}));
		}),
	);

export const fuzz = (seed: number, style?: number, pagination?: Combo['pagination']): Scenario => {
	const g = rng(seed * 7919 + 17);
	const forced = styles.find((s) => s.n === style);
	const picked = g.pick(['newestFirst', 'oldestFirst', 'either'] as const)!;
	const drawnOrder: Order =
		picked === 'either' ? (rng(seed * 31 + 7).chance(0.5) ? 'newestFirst' : 'oldestFirst') : picked;
	const drawnSince = drawnOrder === 'oldestFirst' && g.chance(0.5);
	const order = forced?.order ?? drawnOrder;
	const useSince = forced?.useSince ?? drawnSince;
	const twoWay = g.chance(0.5) ? 'offset' : 'token';
	const combo: Combo = {
		order,
		pagination: pagination ?? (rng(seed * 131 + 5).chance(1 / 3) ? 'page' : twoWay),
		useSince,
	};
	const idDraw = !drawnSince && g.chance(0.3);
	const idKeys = forced?.ids ?? (idDraw && !useSince);
	const drawnPs = g.int(2, 8);
	const maxPages = g.int(1, 4);
	const drawnMaxItems = g.int(Math.max(1, drawnPs - 2), drawnPs * maxPages + 2);
	const skewMs = idDraw ? 0 : g.pick([0, 1000, 5000, 30_000])!;
	const drawnOverlap = g.int(1, Math.min(3, drawnPs - 1));
	const drawnSeen = g.chance(0.3) ? g.int(1, 6) : 4 * drawnMaxItems + g.int(0, 50);
	const page = combo.pagination === 'page';
	const pageSize = page ? 25 + (drawnPs - 2) * 2 : drawnPs;
	const maxItems = page
		? Math.max(1, Math.round((drawnMaxItems * pageSize) / drawnPs))
		: drawnMaxItems;
	const overlap = page ? 1 : drawnOverlap;
	const seenLimit =
		page && drawnSeen > 6 ? 4 * maxItems + (drawnSeen - 4 * drawnMaxItems) : drawnSeen;
	const toCap = (c?: number) =>
		c === undefined || !page
			? c
			: 25 +
				Math.round(
					((c - drawnOverlap - 1) / Math.max(1, drawnPs - drawnOverlap - 1)) * (pageSize - 25),
				);
	const sortKeyIsTime = !idKeys;
	const cfg = makeConfig(combo, {
		pageSize,
		maxPages,
		maxItems,
		overlap,
		maxStepBack: g.int(0, 3),
		seenLimit,
		skewMs,
		sortKeyIsTime,
	});
	const tsMode = (c: Ctx): TsMode => {
		const x = c.r.next();
		return x < 0.2 ? 'last' : x < 0.4 ? 'late' : x < 0.5 ? 'new' : 'each';
	};
	return {
		name: `fuzz [${label({ ...combo, ids: idKeys })}]`,
		style: styleOf(order, useSince, idKeys),
		seed,
		cfg,
		idKeys,
		cap: toCap(g.chance(0.3) ? g.int(drawnOverlap + 1, drawnPs) : undefined),
		interval: g.chance(0.3) ? g.int(100, Math.max(100, skewMs)) : 60_000,
		initial: g.int(0, 3 * pageSize),
		ticks: g.int(5, 20),
		between: (c) => {
			const { w, r } = c;
			if (r.chance(0.3))
				w.del([r.pick(w.live), r.chance(0.5) ? r.pick(w.live) : undefined], 'random');
			if (r.chance(0.1)) w.del([c.newestKnown()], 'newest known');
			if (r.chance(0.03))
				w.del(
					c
						.known()
						.sort((a, b) => b.seq - a.seq)
						.slice(0, r.int(cfg.overlap + 1, 2 * pageSize)),
					'mass',
				);
			if (r.chance(0.7)) w.insert(r.int(1, 3), tsMode(c));
			if (r.chance(0.2)) w.insertLate();
			if (r.chance(0.08)) w.insert(r.int(capacity(c), 2 * capacity(c)), tsMode(c));
		},
		before: (c) => {
			const { w, r, req } = c;
			if (!req) return;
			if (r.chance(0.15)) w.insert(r.int(1, pageSize), tsMode(c));
			if (r.chance(0.05)) w.insertLate();
			if (r.chance(0.1)) w.del([w.near(req, -1)], 'last of previous page');
			if (r.chance(0.1)) w.del([w.near(req, 0)], 'about to read');
			if (r.chance(0.05)) w.del([r.pick(w.live)], 'random');
			return r.chance(0.08);
		},
	};
};
