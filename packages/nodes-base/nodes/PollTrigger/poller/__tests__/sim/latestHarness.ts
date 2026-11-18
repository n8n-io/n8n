import { deepStrictEqual } from 'node:assert';
import type { Item, PageRequest, PageResponse, Poll, PollConfig, PollResult } from '../../types';
import { errText, type Ev, type Violation } from './harness';
import { World, fmtSeqs, rng, type Rec, type Rng } from './world';

const fmtReq = (req: PageRequest) =>
	req.kind === 'offset'
		? `offset=${req.offset}`
		: req.kind === 'page'
			? `page=${req.page} limit=${req.limit}`
			: `token=${req.token ? 'next' : '-'}`;

export type LCtx = {
	w: World;
	r: Rng;
	cfg: PollConfig;
	tick: number;
	fetch: number;
	req?: PageRequest;
	at: (delta: number) => Rec | undefined;
	late: (n: number, maxPos: number) => void;
	del: (recs: Array<Rec | undefined>, why: string) => void;
};

export type LScenario = {
	name: string;
	seed: number;
	cfg: PollConfig;
	cap?: number;
	initial: number;
	ticks: number;
	setup?: (c: LCtx) => void;
	between?: (c: LCtx) => void;
	before?: (c: LCtx) => boolean | undefined;
};

const mix = (seed: number, tick: number, f = -1) =>
	(Math.imul(seed, 1000003) + Math.imul(tick, 7919) + Math.imul(f + 2, 104729)) >>> 0;

export type LResult = {
	violations: Violation[];
	trace: Ev[];
	created: number;
	lost: number;
	dups: number;
	l3: boolean;
	l3Why: string;
};

const deepFreeze = <T>(o: T): T => {
	if (o && typeof o === 'object' && !Object.isFrozen(o)) {
		Object.freeze(o);
		for (const v of Object.values(o)) deepFreeze(v);
	}
	return o;
};

export const latestConfig = (
	pagination: 'offset' | 'page' | 'token',
	over: Partial<PollConfig> = {},
): PollConfig => ({
	order: 'latest',
	pagination,
	pageSize: 5,
	maxPages: 3,
	maxItems: 15,
	seenLimit: 1000,
	key: (i: Item) => i.id as string,
	timestamp: (i: Item) => i.ts as number,
	useSince: false,
	sortKeyIsTime: false,
	clock: () => Date.now(),
	skewMs: 0,
	overlap: 1,
	maxStepBack: 0,
	...over,
});

const QUIET_POLLS = 3;

export async function runLatest(poll: Poll, sc: LScenario): Promise<LResult> {
	const trace: Ev[] = [];
	const V: Violation[] = [];
	let p = 0;
	const r = rng(sc.seed);
	const w: World = new World({
		order: 'newestFirst',
		cap: sc.cap,
		pageSize: sc.cfg.pageSize,
		timeKeys: false,
		skewMs: 0,
		idKeys: true,
		seenLimit: Number.MAX_SAFE_INTEGER,
		r,
		log: (text, keys = []) => trace.push({ p: w.now, text, keys }),
	});
	const cfg: PollConfig = Object.freeze({ ...sc.cfg, clock: () => w.clock });
	const log = (text: string, keys: number[] = []) => trace.push({ p, text, keys });
	const fail = (g: string, msg: string, keys: number[] = [], polls: number[] = [p]) =>
		V.push({ g, msg, keys, polls });
	const why = new Set<string>();
	if (sc.cap !== undefined && sc.cap < cfg.pageSize) why.add('server cap');
	const ctx: LCtx = {
		w,
		r,
		cfg,
		tick: 0,
		fetch: 0,
		at: (delta) => w.live[ctx.fetch * cfg.pageSize + delta],
		late: (n, maxPos) => {
			const r = ctx.r;
			if (!w.live.length) {
				w.insert(n);
				return;
			}
			why.add('late writes');
			w.insert(n, 'each', r.int(1, Math.max(1, Math.min(maxPos, w.live.length))));
		},
		del: (recs, reason) => {
			if (recs.some((x) => x?.live)) why.add('deletions');
			w.del(recs, reason);
		},
	};
	const firstPageKeys = new Set<string>();
	let state: unknown;
	let prevStartSeq = -1;

	const doPoll = async (quiet: boolean) => {
		p++;
		w.now = p;
		const baseline = state === undefined;
		const startSeq = w.seq;
		let fetches = 0;
		let ok = 0;
		let failed = false;
		const fetchPage = async (req: PageRequest): Promise<PageResponse> => {
			const f = fetches++;
			ctx.fetch = f;
			ctx.req = req;
			ctx.r = rng(mix(sc.seed, ctx.tick, f));
			w.advance(ctx.r.int(5, 200));
			if (
				!req ||
				req.kind !== cfg.pagination ||
				!Number.isInteger(req.limit) ||
				req.limit < 1 ||
				req.limit > cfg.pageSize ||
				req.since !== undefined ||
				(req.kind === 'offset' && !(Number.isInteger(req.offset) && req.offset >= 0)) ||
				(req.kind === 'page' && !(Number.isInteger(req.page) && req.page >= 1))
			) {
				fail('API', `bad request ${JSON.stringify(req)}`);
				throw new Error('400 bad request');
			}
			const reject = !quiet && sc.before?.(ctx) === true && !(baseline && f === 0);
			if (baseline && f === 0) {
				w.baselineSeq = w.seq;
				for (const x of w.all.values()) x.afterBaseline = x.seq > w.baselineSeq;
			}
			if (reject) {
				why.add('fetch failures');
				failed = true;
				log(`f${f} ${fmtReq(req)} -> REJECT`);
				throw new Error('simulated 503');
			}
			let res: PageResponse;
			try {
				res = w.fetch(req);
			} catch (e) {
				fail('API', errText(e));
				throw e;
			}
			ok++;
			if (
				(req.kind === 'offset' && req.offset === 0) ||
				(req.kind === 'page' && req.page === 1) ||
				(req.kind === 'token' && req.token === undefined)
			)
				for (const it of res.items) firstPageKeys.add(it.id as string);
			const seqs = res.items.map((i) => w.all.get(i.id as string)!.seq);
			log(`f${f} ${fmtReq(req)} -> ${fmtSeqs(seqs)}${res.hasMore ? ' more' : ''}`, seqs);
			return res;
		};
		const rest = () => {
			if (quiet) return;
			for (let f = fetches; f < cfg.maxPages; f++) {
				ctx.fetch = f;
				ctx.req = undefined;
				ctx.r = rng(mix(sc.seed, ctx.tick, f));
				w.advance(ctx.r.int(5, 200));
				sc.before?.(ctx);
			}
		};
		let res: PollResult;
		try {
			res = await poll(cfg, state, fetchPage);
			rest();
		} catch (e) {
			rest();
			const m = errText(e);
			log(`reject: ${m}`);
			if (/read.only|not extensible|Cannot (assign|add|delete|define)/i.test(m))
				fail('I3', `mutated its input state: ${m}`);
			else if (!failed) fail('R4', `rejected without a fetch failure after ${ok} fetch(es): ${m}`);
			return;
		}
		if (baseline && fetches === 0) {
			w.baselineSeq = w.seq;
			for (const x of w.all.values()) x.afterBaseline = x.seq > w.baselineSeq;
		}
		if (failed) fail('R4', 'resolved although a fetch rejected');
		if (fetches > cfg.maxPages) fail('R2', `${fetches} fetches > maxPages`);
		if (prevStartSeq >= 0 && startSeq - prevStartSeq > (cfg.maxPages - 1) * cfg.pageSize)
			why.add('gap > (maxPages-1)*pageSize');
		prevStartSeq = startSeq;
		const items = Array.isArray(res?.items) ? res.items : [];
		if (items.length > cfg.maxItems) fail('R2', `${items.length} items > maxItems`);
		if (items.length >= cfg.maxItems) why.add('maxItems hit');
		const recs: Rec[] = [];
		for (const it of items) {
			const rec = w.all.get(cfg.key(it));
			if (rec) recs.push(rec);
			else fail('L2', `emitted an item that never existed: ${JSON.stringify(it)}`);
		}
		if (recs.length)
			log(
				`emit ${fmtSeqs(recs.map((x) => x.seq))}`,
				recs.map((x) => x.seq),
			);
		if (baseline && recs.length)
			fail(
				'L2',
				`first poll emitted ${recs.length} item(s)`,
				recs.map((x) => x.seq),
			);
		for (const x of recs) {
			x.emits.push(p);
			if (x.emits.length === 2) {
				if (firstPageKeys.size < Math.min(cfg.seenLimit, 5000))
					fail(
						'L1',
						`#${x.seq} emitted again (polls ${x.emits.join(',')}), ${firstPageKeys.size} keys < seenLimit passed the first page`,
						[x.seq],
						x.emits,
					);
				else log(`dup #${x.seq} (seen set exceeded)`, [x.seq]);
			}
		}
		const json = JSON.stringify(res?.state);
		if (json === undefined) {
			fail('I4', 'returned state is not JSON-serialisable');
			return;
		}
		const back = JSON.parse(json);
		try {
			deepStrictEqual(back, res.state);
		} catch {
			fail('I4', 'state changes through a JSON round trip');
		}
		if (json.includes('itm:')) fail('L5', 'state holds raw keys');
		if (json.length >= cfg.seenLimit * 60 + 4096)
			fail('L5', `state is ${json.length} chars >= seenLimit * 60 + 4096`);
		state = deepFreeze(back);
	};

	w.insert(sc.initial);
	ctx.r = rng(mix(sc.seed, 0));
	sc.setup?.(ctx);
	w.advance(60_000);
	await doPoll(false);
	for (let t = 1; t <= sc.ticks; t++) {
		ctx.tick = t;
		w.now = p + 1;
		w.advance(60_000);
		ctx.r = rng(mix(sc.seed, t));
		sc.between?.(ctx);
		await doPoll(false);
	}
	ctx.tick = sc.ticks + 1;
	for (let i = 0; i < QUIET_POLLS; i++) {
		w.advance(60_000);
		await doPoll(true);
	}
	const created = [...w.all.values()].filter((x) => x.afterBaseline && x.live);
	const lost = created.filter((x) => !x.emits.length);
	const dups = [...w.all.values()].filter((x) => x.emits.length > 1).length;
	const l3 = why.size === 0;
	if (l3 && lost.length) {
		const c = lost[0].createdPoll;
		fail(
			'L3',
			`${lost.length} item(s) lost in an L3 run: ${fmtSeqs(lost.map((x) => x.seq))}`,
			lost.map((x) => x.seq),
			[c, c + 1],
		);
	}
	return {
		violations: V,
		trace,
		created: created.length,
		lost: lost.length,
		dups,
		l3,
		l3Why: [...why].join(', '),
	};
}

type Def = {
	name: string;
	cap?: number;
	over?: Partial<PollConfig>;
	initial?: number;
	ticks: number;
	setup?: (c: LCtx) => void;
	between?: (c: LCtx) => void;
	before?: (c: LCtx) => boolean | undefined;
};

const span = (c: LCtx) => (c.cfg.maxPages - 1) * c.cfg.pageSize;

const defs: Def[] = [
	{
		name: 'trickle within one gap',
		ticks: 8,
		between: (c) => {
			c.w.insert(c.r.int(1, 3));
		},
	},
	{
		name: 'burst = (maxPages-1)*pageSize',
		ticks: 5,
		between: (c) => {
			c.w.insert(c.tick === 2 ? span(c) : 1);
		},
	},
	{
		name: 'burst > maxPages*pageSize',
		ticks: 5,
		between: (c) => {
			c.w.insert(c.tick === 2 ? 2 * c.cfg.maxPages * c.cfg.pageSize + 3 : 1);
		},
	},
	{
		name: 'burst hits maxItems',
		over: { maxItems: 4 },
		ticks: 5,
		between: (c) => {
			c.w.insert(c.tick === 2 ? span(c) : 1);
		},
	},
	{
		name: 'deletions between page fetches',
		ticks: 5,
		between: (c) => {
			c.w.insert(c.tick === 2 ? span(c) : 1);
		},
		before: (c) => {
			if (c.tick === 2 && c.fetch >= 1) c.del([c.at(-1)], 'last of previous page');
		},
	},
	{
		name: 'late writes below the head',
		ticks: 6,
		between: (c) => {
			c.w.insert(1);
			if (c.tick % 2 === 0) c.late(2, 2 * c.cfg.pageSize);
		},
	},
	{
		name: 'fetch failure mid-walk',
		ticks: 5,
		between: (c) => {
			c.w.insert(c.tick === 2 ? span(c) : 1);
		},
		before: (c) => c.tick === 2 && c.fetch === 1,
	},
	{
		name: 'first fetch failure',
		ticks: 5,
		between: (c) => {
			c.w.insert(c.r.int(1, 3));
		},
		before: (c) => c.tick === 2 && c.fetch === 0,
	},
	{
		name: 'unsorted first page',
		ticks: 6,
		setup: (c) => c.late(3, c.cfg.pageSize - 1),
		between: (c) => {
			c.w.insert(1);
			c.late(2, c.cfg.pageSize - 1);
		},
	},
	{
		name: 'seen set churn (seenLimit small)',
		over: { seenLimit: 8 },
		ticks: 10,
		between: (c) => {
			c.w.insert(c.r.int(2, 4));
		},
	},
	{
		name: 'server cap < pageSize',
		cap: 3,
		ticks: 5,
		between: (c) => {
			c.w.insert(c.tick === 2 ? 6 : 1);
		},
	},
	{
		name: 'server cap 4, page-boundary deletions',
		cap: 4,
		ticks: 5,
		between: (c) => {
			c.w.insert(c.tick === 2 ? 7 : 1);
		},
		before: (c) => {
			if (c.tick === 2 && c.fetch >= 1) c.del([c.at(-1), c.at(0)], 'page boundary');
		},
	},
];

export const latestTargeted = (baseSeed: number): LScenario[] =>
	defs.flatMap((d, i) =>
		(['offset', 'page', 'token'] as const).map((pagination, j) => ({
			name: `0. ${d.name} [${pagination}]`,
			seed: baseSeed + i * 10 + j,
			cfg: latestConfig(pagination, d.over),
			cap: d.cap,
			initial: d.initial ?? 12,
			ticks: d.ticks,
			setup: d.setup,
			between: d.between,
			before: d.before,
		})),
	);

export const latestFuzz = (seed: number, forced?: 'offset' | 'page' | 'token'): LScenario => {
	const g = rng(seed * 6007 + 3);
	const twoWay = g.chance(0.5) ? 'offset' : 'token';
	const pagination = forced ?? (rng(seed * 131 + 5).chance(1 / 3) ? 'page' : twoWay);
	const pageSize = g.int(2, 8);
	const maxPages = g.int(1, 4);
	const maxItems = g.int(Math.max(1, pageSize - 2), pageSize * maxPages + 2);
	const seenLimit = g.chance(0.2) ? g.int(4, 30) : g.int(200, 2000);
	const clean = g.chance(0.4);
	const cap = !clean && g.chance(0.2) ? g.int(2, pageSize) : undefined;
	const gap = (maxPages - 1) * pageSize;
	return {
		name: `0. fuzz [${pagination}${clean ? ' clean' : ''}]`,
		seed,
		cfg: latestConfig(pagination, { pageSize, maxPages, maxItems, seenLimit }),
		cap,
		initial: g.int(0, 3 * pageSize),
		ticks: g.int(5, 20),
		between: (c) => {
			const { w, r } = c;
			if (clean) {
				w.insert(r.int(0, gap));
				return;
			}
			if (r.chance(0.2))
				c.del([r.pick(w.live), r.chance(0.5) ? r.pick(w.live) : undefined], 'random');
			if (r.chance(0.1)) c.late(r.int(1, 2), 2 * pageSize);
			if (r.chance(0.7)) w.insert(r.int(1, Math.max(1, gap)));
			if (r.chance(0.1)) w.insert(r.int(maxPages * pageSize, 2 * maxPages * pageSize));
		},
		before: (c) => {
			if (clean) return;
			const { w, r } = c;
			if (r.chance(0.1)) w.insert(r.int(1, pageSize));
			if (c.fetch > 0 && r.chance(0.1)) c.del([c.at(-1)], 'last of previous page');
			if (r.chance(0.05)) c.del([c.at(0)], 'about to read');
			return r.chance(0.06);
		},
	};
};
