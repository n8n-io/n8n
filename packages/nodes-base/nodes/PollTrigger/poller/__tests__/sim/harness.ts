import { deepStrictEqual } from 'node:assert';
import type { PageRequest, PageResponse, Poll, PollConfig, PollResult } from '../../types';
import {
	World,
	decToken,
	fmtSeqs,
	rng,
	type HasMore,
	type Order,
	type Rec,
	type Rng,
} from './world';

export type Ctx = {
	w: World;
	r: Rng;
	cfg: PollConfig;
	tick: number;
	fetch: number;
	req?: PageRequest;
	newestKnown: () => Rec | undefined;
	known: () => Rec[];
};

export type Scenario = {
	name: string;
	seed: number;
	cfg: PollConfig;
	cap?: number;
	idKeys?: boolean;
	interval?: number;
	initial: number;
	ticks: number;
	between?: (c: Ctx) => void;
	before?: (c: Ctx) => boolean | undefined;
	style?: number;
	setup?: (c: Ctx) => void;
	hasMore?: HasMore;
	encodeTs?: (ts: number) => unknown;
};

export type Ev = { p: number; text: string; keys: number[] };
export type Violation = { g: string; msg: string; keys: number[]; polls: number[] };
export type Result = { violations: Violation[]; trace: Ev[]; polls: number; warnedPolls: number };

const deepFreeze = <T>(o: T): T => {
	if (o && typeof o === 'object' && !Object.isFrozen(o)) {
		Object.freeze(o);
		for (const v of Object.values(o)) deepFreeze(v);
	}
	return o;
};

const fmtReq = (req: PageRequest) => {
	const since = req.since === undefined ? '' : ` since=${req.since}`;
	if (req.kind === 'offset') return `offset=${req.offset} limit=${req.limit}${since}`;
	if (req.kind === 'page') return `page=${req.page} limit=${req.limit}${since}`;
	let tok = '-';
	if (req.token !== undefined) {
		try {
			tok = `after#${decToken(req.token)}`;
		} catch {
			tok = '?';
		}
	}
	return `token=${tok} limit=${req.limit}${since}`;
};

const badRequest = (cfg: PollConfig, req: PageRequest): string | undefined => {
	if (!req || req.kind !== cfg.pagination)
		return `request kind ${req?.kind} with pagination ${cfg.pagination}`;
	if (!Number.isInteger(req.limit) || req.limit < 1 || req.limit > cfg.pageSize)
		return `limit ${req.limit} outside 1..pageSize`;
	if (req.kind === 'offset' && (!Number.isInteger(req.offset) || req.offset < 0))
		return `offset ${req.offset}`;
	if (req.kind === 'page' && (!Number.isInteger(req.page) || req.page < 1))
		return `page ${req.page}`;
	if (
		req.since !== undefined &&
		!(cfg.order === 'oldestFirst' && cfg.useSince && Number.isFinite(req.since))
	)
		return `since=${req.since} not allowed`;
	return undefined;
};

export const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function runScenario(poll: Poll, sc: Scenario): Promise<Result> {
	const trace: Ev[] = [];
	const V: Violation[] = [];
	let p = 0;
	const r = rng(sc.seed);
	const w: World = new World({
		order: sc.cfg.order as Order,
		cap: sc.cap,
		pageSize: sc.cfg.pageSize,
		exactPage: sc.cfg.pagination === 'page' ? { overlap: sc.cfg.overlap } : undefined,
		timeKeys: sc.cfg.sortKeyIsTime,
		skewMs: sc.cfg.skewMs,
		idKeys: !!sc.idKeys,
		seenLimit: sc.cfg.seenLimit,
		hasMore: sc.hasMore,
		encodeTs: sc.encodeTs,
		r,
		log: (text, keys = []) => trace.push({ p: w.now, text, keys }),
	});
	const cfg: PollConfig = Object.freeze({ ...sc.cfg, clock: () => w.clock });
	const interval = sc.interval ?? 60_000;
	if (!!sc.idKeys === cfg.sortKeyIsTime)
		throw new Error('sortKeyIsTime must be true for date keys and false for id keys');
	if (cfg.useSince && !cfg.sortKeyIsTime) throw new Error('useSince needs sortKeyIsTime');
	const timeBased = cfg.sortKeyIsTime;
	let t0 = Number.NaN;
	let lastBaselineTrue = 0;
	let baselineDone = false;
	const log = (text: string, keys: number[] = []) => trace.push({ p, text, keys });
	const fail = (g: string, msg: string, keys: number[] = [], polls: number[] = [p]) =>
		V.push({ g, msg, keys, polls });
	const known = () =>
		[...w.all.values()].filter((r) => r.live && (r.emits.length > 0 || !r.afterBaseline));
	const ctx: Ctx = {
		w,
		r,
		cfg,
		tick: 0,
		fetch: 0,
		newestKnown: () =>
			known().reduce<Rec | undefined>((a, r) => (!a || r.seq > a.seq ? r : a), undefined),
		known,
	};
	const warnPolls: number[] = [];
	const snapshot = () => {
		w.baselineSeq = w.seq;
		for (const r of w.all.values()) r.afterBaseline = r.seq > w.baselineSeq;
	};
	let state: unknown;
	let last: Rec | undefined;

	const doPoll = async (quiet: boolean) => {
		p++;
		w.now = p;
		const baseline = state === undefined;
		if (baseline) {
			t0 = w.clock;
		}
		let fetches = 0;
		let ok = 0;
		let failed = false;
		let apiError = false;
		const fetchPage = async (req: PageRequest): Promise<PageResponse> => {
			const f = fetches++;
			ctx.fetch = f;
			ctx.req = req;
			w.advance(r.int(5, 200));
			const bad = badRequest(cfg, req);
			if (bad) {
				apiError = true;
				fail('API', bad);
				throw new Error(`400 ${bad}`);
			}
			let reject = !quiet && sc.before?.(ctx) === true;
			if (baseline && f === 0) {
				reject = false;
				snapshot();
			}
			if (reject) {
				failed = true;
				log(`f${f} ${fmtReq(req)} -> REJECT`);
				throw new Error('simulated 503');
			}
			let res: PageResponse;
			try {
				res = w.fetch(req);
			} catch (e) {
				apiError = true;
				fail('API', errText(e));
				throw e;
			}
			ok++;
			const seqs = res.items.map((i) => w.all.get(i.id as string)!.seq);
			log(`f${f} ${fmtReq(req)} -> ${fmtSeqs(seqs)}${res.hasMore ? ' more' : ''}`, seqs);
			return res;
		};

		const limited = !(baseline && cfg.order === 'oldestFirst' && !cfg.useSince);
		let res: PollResult;
		try {
			res = await poll(cfg, state, fetchPage);
		} catch (e) {
			const m = errText(e);
			log(`reject: ${m}`);
			if (/read.only|not extensible|Cannot (assign|add|delete|define)/i.test(m))
				fail('I3', `mutated its input state: ${m}`);
			else if (!failed && !apiError)
				fail('8', `rejected without a fetch failure after ${ok} fetch(es): ${m}`);
			if (limited && fetches > cfg.maxPages + cfg.maxStepBack)
				fail('7', `${fetches} fetches > maxPages + maxStepBack`);
			return;
		}
		if (failed) fail('8', 'resolved although a fetch rejected');
		if (baseline && fetches === 0) {
			log('first poll made no fetch: baseline taken at its end');
			snapshot();
		}
		if (limited && fetches > cfg.maxPages + cfg.maxStepBack)
			fail('7', `${fetches} fetches > maxPages + maxStepBack`);
		const items = Array.isArray(res?.items) ? res.items : [];
		const warnings = Array.isArray(res?.warnings) ? res.warnings : [];
		if (items.length > cfg.maxItems) fail('7', `${items.length} items > maxItems`);
		if (warnings.length) {
			warnPolls.push(p);
			log(`warn ${JSON.stringify(warnings[0]).slice(0, 80)}`);
		}
		const recs: Rec[] = [];
		for (const it of items) {
			const rec = w.all.get(cfg.key(it));
			if (rec) recs.push(rec);
			else fail('1', `emitted an item that never existed: ${JSON.stringify(it)}`);
		}
		if (typeof res.baseline !== 'boolean')
			fail('I6', `baseline is ${JSON.stringify(res.baseline)}, not a boolean`);
		else if (res.baseline) {
			lastBaselineTrue = p;
			w.settledAfter = p;
			log('baseline: true');
			if (baselineDone) fail('I6', 'returned baseline: true after a poll returned false');
			if (recs.length)
				fail(
					'1',
					`a baseline: true poll emitted ${recs.length} item(s)`,
					recs.map((r) => r.seq),
				);
		} else baselineDone = true;
		if (recs.length)
			log(
				`emit ${fmtSeqs(recs.map((r) => r.seq))}`,
				recs.map((r) => r.seq),
			);
		if (baseline && recs.length)
			fail(
				'1',
				`first poll emitted ${recs.length} item(s)`,
				recs.map((r) => r.seq),
			);
		for (const [i, r] of recs.entries()) {
			if (!r.afterBaseline && !baseline && !(timeBased && r.ts >= t0 - cfg.skewMs))
				fail(
					'1',
					`emitted baseline item #${r.seq} (ts=${r.ts}${timeBased ? `, T0-skew=${t0 - cfg.skewMs}` : ''})`,
					[r.seq],
				);
			r.emits.push(p);
			if (r.emits.length === 2)
				fail('2', `#${r.seq} emitted again (polls ${r.emits.join(',')})`, [r.seq], r.emits);
			const prev = recs[i - 1];
			if (prev && r.ts < prev.ts)
				fail('5', `#${prev.seq} (ts=${prev.ts}) before #${r.seq} (ts=${r.ts}) in one poll`, [
					prev.seq,
					r.seq,
				]);
			if (cfg.order === 'oldestFirst' && !r.late && last && r.ts < last.ts)
				fail(
					'6',
					`#${r.seq} (ts=${r.ts}) emitted after #${last.seq} (ts=${last.ts})`,
					[last.seq, r.seq],
					[...last.emits.slice(0, 1), p],
				);
			if (!last || r.ts >= last.ts) last = r;
		}
		const json = JSON.stringify(res?.state);
		if (json === undefined) {
			fail('I4', 'returned state is not JSON-serialisable');
			state = undefined;
			return;
		}
		const back = JSON.parse(json);
		try {
			deepStrictEqual(back, res.state);
		} catch {
			fail('I4', 'state changes through a JSON round trip');
		}
		const { recent, marks, ...core } = back as { recent?: unknown[]; marks?: unknown[] };
		const coreLength = JSON.stringify(core).length;
		if (coreLength >= cfg.seenLimit * 120 + 4096)
			fail('9', `state is ${coreLength} chars >= seenLimit * 120 + 4096`);
		if ((recent?.length ?? 0) > 2000 || (marks?.length ?? 0) > 200)
			fail('9', `recent ${recent?.length} or marks ${marks?.length} over the cap`);
		if (json.includes('itm:')) fail('9', 'state holds raw keys');
		state = deepFreeze(back);
	};

	w.insert(sc.initial);
	sc.setup?.(ctx);
	w.advance(interval);
	await doPoll(false);
	for (let t = 1; t <= sc.ticks; t++) {
		ctx.tick = t;
		w.now = p + 1;
		w.advance(interval);
		sc.between?.(ctx);
		await doPoll(false);
	}
	ctx.tick = sc.ticks + 1;
	const inWindow = (r: Rec) => cfg.sortKeyIsTime && r.ts >= t0 - cfg.skewMs;
	const backlog = w.live.filter((r) => !r.emits.length && (r.afterBaseline || inWindow(r))).length;
	const served =
		Math.min(cfg.pageSize, sc.cap ?? cfg.pageSize) / (cfg.pagination === 'page' ? 2 : 1);
	const perPoll = Math.max(1, Math.min(cfg.maxItems, cfg.maxPages * (served - cfg.overlap)));
	const bound = Math.ceil(backlog / perPoll) + 2 * Math.ceil(Math.log2(w.live.length + 2)) + 3;
	const quietStart = p;
	for (let i = 0; i < bound + 20; i++) {
		w.advance(interval);
		await doPoll(true);
	}

	const lost: number[] = [];
	const late: number[] = [];
	const skippable = (r: Rec) =>
		cfg.order === 'oldestFirst' &&
		!cfg.useSince &&
		!cfg.sortKeyIsTime &&
		r.createdPoll <= lastBaselineTrue;
	for (const r of w.all.values()) {
		if (!r.live || !r.afterBaseline || (!r.emits.length && skippable(r))) continue;
		if (!r.emits.length) lost.push(r.seq);
		else if (r.emits[0] > quietStart + bound) late.push(r.seq);
	}
	const around = (seq: number) => {
		const c = [...w.all.values()].find((r) => r.seq === seq)!.createdPoll;
		return [c, c + 1];
	};
	if (lost.length)
		fail('3', `${lost.length} live item(s) never emitted: ${fmtSeqs(lost)}`, lost, around(lost[0]));
	if (late.length)
		fail(
			'3',
			`${late.length} item(s) emitted after the ${bound}-poll quiet bound: ${fmtSeqs(late)}`,
			late,
			around(late[0]),
		);
	return { violations: V, trace, polls: p, warnedPolls: warnPolls.length };
}

export const minimalTrace = (res: Result, v: Violation, max = 14) => {
	const keys = new Set(v.keys.slice(0, 2));
	const polls = new Set(v.polls);
	const lines = res.trace
		.filter((e) => polls.has(e.p) || e.keys.some((k) => keys.has(k)))
		.map((e) => `p${e.p} ${e.text}`);
	return lines.length <= max
		? lines
		: [...lines.slice(0, max / 2), `... ${lines.length - max} more`, ...lines.slice(-max / 2)];
};
