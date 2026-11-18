import type { PageRequest, PageResponse } from '../../types';

export type Order = 'newestFirst' | 'oldestFirst';
export type TsMode = 'each' | 'new' | 'last' | 'late';

export type Rec = {
	seq: number;
	key: string;
	ts: number;
	live: boolean;
	afterBaseline: boolean;
	createdPoll: number;
	createdAt: number;
	late?: boolean;
	emits: number[];
};

export const rng = (seed: number) => {
	let a = seed >>> 0;
	const next = () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	return {
		next,
		int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)),
		chance: (p: number) => next() < p,
		pick: <T>(xs: T[]): T | undefined => xs[Math.floor(next() * xs.length)],
	};
};
export type Rng = ReturnType<typeof rng>;

export const encToken = (seq: number) => Buffer.from(`c${seq}`).toString('base64url');
export const decToken = (t: string) => {
	const s = Buffer.from(t, 'base64url').toString();
	if (!/^c\d+$/.test(s)) throw new Error(`bad token ${JSON.stringify(t)}`);
	return Number(s.slice(1));
};

export type Log = (text: string, keys?: number[]) => void;

export type HasMore = 'exact' | 'nonEmpty';

export type WorldOpts = {
	order: Order;
	cap?: number;
	pageSize: number;
	exactPage?: { overlap: number };
	timeKeys: boolean;
	skewMs: number;
	idKeys: boolean;
	seenLimit: number;
	r: Rng;
	log: Log;
	hasMore?: HasMore;
	encodeTs?: (ts: number) => unknown;
};

export class World {
	o: WorldOpts;
	all = new Map<string, Rec>();
	list: Rec[] = [];
	seq = 0;
	clock = 1_700_000_000_000;
	maxTs = 0;
	tieCount = 0;
	now = 0;
	baselineSeq = Number.POSITIVE_INFINITY;
	settledAfter = 0;

	constructor(o: WorldOpts) {
		this.o = o;
		if (o.idKeys) this.maxTs = 1000;
		if (
			o.exactPage &&
			(o.pageSize < 25 || (o.cap !== undefined && o.cap < 25) || o.exactPage.overlap !== 1)
		)
			throw new Error(
				`page mode in an exact style needs pageSize and cap >= 25 and overlap 1 (pageSize ${o.pageSize}, cap ${o.cap}, overlap ${o.exactPage.overlap})`,
			);
	}

	get live() {
		return this.list.filter((r) => r.live);
	}

	advance(ms: number) {
		this.clock += ms;
	}

	nextTs(mode: TsMode, first: boolean) {
		const { idKeys, timeKeys, skewMs, r } = this.o;
		if (!idKeys && mode !== 'last' && (mode !== 'new' || first)) this.clock++;
		let ts: number;
		if (idKeys) ts = this.maxTs + 10;
		else if (mode === 'last' || (mode === 'new' && !first)) ts = this.maxTs;
		else ts = mode === 'late' ? this.clock - r.int(0, skewMs) : this.clock;
		ts = Math.max(ts, this.maxTs, timeKeys ? this.clock - skewMs : Number.NEGATIVE_INFINITY);
		if (ts === this.maxTs && this.tieCount >= this.o.seenLimit) ts++;
		if (idKeys && ts <= this.maxTs)
			throw new Error(`API model 1 violated: id ${ts} ties or repeats (max ${this.maxTs})`);
		if (ts < this.maxTs || (timeKeys && ts < this.clock - skewMs))
			throw new Error(
				`API model 2 violated: ts=${ts} maxTs=${this.maxTs} clock-skew=${this.clock - skewMs}`,
			);
		this.tieCount = ts === this.maxTs ? this.tieCount + 1 : 1;
		this.maxTs = ts;
		return ts;
	}

	insert(n: number, mode: TsMode = 'each', at?: number) {
		if (n <= 0) return [];
		const out: Rec[] = [];
		for (let i = 0; i < n; i++) {
			const seq = ++this.seq;
			const rec: Rec = {
				seq,
				key: `itm:${seq}`,
				ts: this.nextTs(mode, i === 0),
				live: true,
				afterBaseline: seq > this.baselineSeq,
				createdPoll: this.now,
				createdAt: this.clock,
				emits: [],
			};
			this.all.set(rec.key, rec);
			if (at !== undefined) {
				const below = this.live[at];
				this.list.splice(below ? this.list.indexOf(below) : this.list.length, 0, rec);
			} else if (this.o.order === 'newestFirst') this.list.unshift(rec);
			else this.list.push(rec);
			out.push(rec);
		}
		const tss = [...new Set(out.map((r) => r.ts))];
		this.o.log(
			`+ins ${fmtSeqs(out.map((r) => r.seq))} ts=${tss.length === 1 ? tss[0] : `${tss[0]}..${tss.at(-1)}`}${mode === 'each' ? '' : ` (${mode})`}${at === undefined ? '' : ` at position ${at}`}`,
			out.map((r) => r.seq),
		);
		return out;
	}

	insertLate() {
		const { idKeys, skewMs, r } = this.o;
		if (skewMs <= 0) return undefined;
		const recentFrom = this.clock - skewMs;
		const anchors = [...this.all.values()].filter(
			(x) =>
				x.live &&
				!x.late &&
				x.afterBaseline &&
				x.createdPoll > this.settledAfter &&
				x.createdAt >= recentFrom,
		);
		if (idKeys && !anchors.length) return undefined;
		const lo = idKeys ? Math.min(...anchors.map((x) => x.ts)) + 1 : recentFrom;
		const hi = this.maxTs - 1;
		if (hi < lo) return undefined;
		const ts = r.int(lo, hi);
		if (idKeys && [...this.all.values()].some((x) => x.ts === ts)) return undefined;
		const seq = ++this.seq;
		const rec: Rec = {
			seq,
			key: `itm:${seq}`,
			ts,
			live: true,
			afterBaseline: seq > this.baselineSeq,
			createdPoll: this.now,
			createdAt: this.clock,
			late: true,
			emits: [],
		};
		this.all.set(rec.key, rec);
		const after = this.o.order === 'newestFirst' ? (x: Rec) => x.ts < ts : (x: Rec) => x.ts > ts;
		const index = this.list.findIndex(after);
		this.list.splice(index < 0 ? this.list.length : index, 0, rec);
		this.o.log(`+late #${seq} ts=${ts}`, [seq]);
		return rec;
	}

	del(recs: Array<Rec | undefined>, why: string) {
		const xs = [...new Set(recs.filter((r): r is Rec => !!r && r.live))].sort(
			(a, b) => a.seq - b.seq,
		);
		if (!xs.length) return;
		for (const r of xs) r.live = false;
		this.o.log(
			`-del ${fmtSeqs(xs.map((r) => r.seq))} (${why})`,
			xs.map((r) => r.seq),
		);
	}

	view(since?: number) {
		return this.list.filter((r) => r.live && (since === undefined || r.ts >= since));
	}

	start(v: Rec[], req: PageRequest) {
		if (req.kind === 'offset') return req.offset;
		if (req.kind === 'page') return (req.page - 1) * this.size(req);
		if (req.token === undefined) return 0;
		const anchor = decToken(req.token);
		const pos = this.list.findIndex((r) => r.seq === anchor);
		if (pos < 0) throw new Error(`unknown token ${req.token}`);
		const after = new Set(this.list.slice(pos + 1));
		const i = v.findIndex((r) => after.has(r));
		return i < 0 ? v.length : i;
	}

	near(req: PageRequest, delta: number) {
		const v = this.view(req.since);
		return v[this.start(v, req) + delta];
	}

	size(req: PageRequest) {
		return Math.min(req.limit, this.o.cap ?? Number.POSITIVE_INFINITY);
	}

	fetch(req: PageRequest): PageResponse {
		if (!Number.isInteger(req.limit) || req.limit < 1 || req.limit > this.o.pageSize)
			throw new Error(`limit ${req.limit} outside 1..pageSize`);
		if (req.kind === 'page' && !(Number.isInteger(req.page) && req.page >= 1))
			throw new Error(`page ${req.page} is not an integer >= 1`);
		const v = this.view(req.since);
		const start = this.start(v, req);
		const page = v.slice(start, start + this.size(req));
		const items = page.map((r) => ({
			id: r.key,
			ts: this.o.encodeTs ? this.o.encodeTs(r.ts) : r.ts,
		}));
		const hasMore =
			this.o.hasMore === 'nonEmpty' ? page.length > 0 : start + page.length < v.length;
		const res: PageResponse = { items, hasMore };
		if (req.kind === 'token') {
			const last = page.at(-1);
			const tok = last ? encToken(last.seq) : req.token;
			if (tok !== undefined) res.nextToken = tok;
		}
		return res;
	}
}

export const fmtSeqs = (seqs: number[]) => {
	if (!seqs.length) return '[]';
	const step = seqs.length > 1 ? seqs[1] - seqs[0] : 1;
	const run =
		seqs.length > 3 && Math.abs(step) === 1 && seqs.every((s, i) => s === seqs[0] + i * step);
	if (run) return `#${seqs[0]}..#${seqs.at(-1)}`;
	const shown = seqs
		.slice(0, 8)
		.map((s) => `#${s}`)
		.join(' ');
	return seqs.length > 8 ? `${shown} +${seqs.length - 8}` : shown;
};
