import { type Ctx, canFetch, fetchRows, midpoint, type Row, stalls } from '../paginations/fetch';
import { higherFrontier, lookbackFrontier } from '../lookback';
import { compareSortKeys, toSortKey } from '../sortKey';
import {
	type Edge,
	type Frontier,
	type Mark,
	type Position,
	type State,
	emptyFrontier,
} from '../state';
import type { SortKey } from '../types';
import { type Outcome, ascending, headPosition } from './sorted';
import { walkSorted } from './walk';

export const pollSince = async (ctx: Ctx, state: State | undefined): Promise<Outcome> => {
	const { config } = ctx;
	if (!state?.frontier || state.frontier.ts === null) {
		return {
			items: [],
			state: { v: 2, frontier: { ts: config.clock() - config.skewMs, keys: [] } },
			baseline: true,
		};
	}
	const walking = state.cursor !== undefined && state.position !== undefined;
	const cursor = walking ? state.cursor! : lookbackFrontier(ctx.lookback, state.frontier);
	const result = await walkSorted(ctx, {
		ascending: true,
		frontier: cursor,
		cap: config.maxItems,
		keep: true,
		start: walking ? state.position! : headPosition(cursor.ts ?? undefined),
		known: (row) => ctx.recent.has(row.hash),
	});
	const frontier = higherFrontier(state.frontier, result.frontier);
	return {
		items: ascending(config, result.items),
		state: result.complete
			? { v: 2, frontier }
			: { v: 2, frontier, position: result.position, cursor: result.frontier },
	};
};

type Tail = { done: boolean; frontier: Frontier; position: Position; marks?: Mark[] };

const MARKS_CAP = 200;

const storeMark = (mark: { token?: string; ts: SortKey }): Mark => ({
	token: mark.token,
	ts: typeof mark.ts === 'bigint' ? mark.ts.toString() : mark.ts,
});

/** Keeps the marks from the window start on, plus the last one before it. */
const pruneMarks = (marks: Mark[], from: SortKey | undefined): Mark[] => {
	const sorted = [...marks].sort((a, b) => compareSortKeys(toSortKey(a.ts), toSortKey(b.ts)));
	const before = from === undefined ? -1 : lastIndexBelow(sorted, from);
	return sorted.slice(Math.max(0, before, sorted.length - MARKS_CAP));
};

const lastIndexBelow = (marks: Mark[], from: SortKey) => {
	let index = -1;
	marks.forEach((mark, i) => {
		if (toSortKey(mark.ts) < from) index = i;
	});
	return index;
};

/**
 * Offset modes start at the stored offset without anchors, so the search steps back to the window start.
 * A token cannot step back: the walk starts from the last page that began before the window.
 */
const lookbackStart = (ctx: Ctx, state: State, cursor: Frontier): Position => {
	if (ctx.config.pagination !== 'token') return { offset: state.position?.offset ?? 0 };
	const marks = state.marks ?? [];
	const index = cursor.ts === null ? -1 : lastIndexBelow(marks, cursor.ts);
	return index < 0 ? {} : { token: marks[index].token };
};

const tailAt = (ctx: Ctx, offset: number, n: number, last: Row | undefined): Tail => ({
	done: true,
	frontier: last ? { ts: last.ts, keys: [last.hash] } : emptyFrontier(),
	position: { offset: offset + Math.max(0, n - ctx.config.overlap) },
});

/** Finds the last page by galloping then bisecting on offsets, resuming the search state of an earlier poll. */
const findTail = async (ctx: Ctx, from: Position): Promise<Tail> => {
	const { config } = ctx;
	let { lo = 0, hi, step = config.pageSize } = from;
	let offset = from.offset ?? 0;
	let edge: Edge | undefined;
	let recheck: string | undefined;
	while (canFetch(ctx)) {
		const page = await fetchRows(ctx, { offset });
		offset = page.start;
		ctx.valid++;
		const n = page.rows.length;
		const last = page.rows.at(-1);
		const listEnd = recheck !== undefined && last?.hash === recheck;
		if ((!page.hasMore || listEnd) && (last || offset === 0)) return tailAt(ctx, offset, n, last);
		if (n === 0 && offset > 0 && recheck === undefined && edge && offset <= edge.end) {
			offset = edge.start;
			recheck = edge.last;
			continue;
		}
		recheck = undefined;
		if (last) {
			edge = { start: offset, end: offset + n, last: last.hash };
			lo = offset + n;
			if (hi !== undefined && hi <= lo) hi = undefined;
		} else {
			hi = offset;
			if (hi <= lo) lo = 0;
		}
		if (hi === undefined) {
			offset = lo + step;
			step *= 2;
		} else {
			offset = midpoint(lo, hi);
		}
		if (last && stalls(ctx, page, offset)) recheck = last.hash;
	}
	return { done: false, frontier: emptyFrontier(), position: { offset, lo, hi, step } };
};

/** Walks to the tail without emitting: the first poll ignores the limits, a poll resuming after a failure respects them. */
const baselineTail = async (ctx: Ctx, state: State | undefined): Promise<Outcome> => {
	ctx.unlimited = !state;
	const found =
		ctx.config.pagination !== 'token'
			? await findTail(ctx, state?.position ?? {})
			: await walkSorted(ctx, {
					ascending: true,
					frontier: state?.frontier ?? emptyFrontier(),
					cap: Number.POSITIVE_INFINITY,
					keep: false,
					start: state?.position ?? headPosition(),
				}).then((result) => ({
					done: result.complete,
					frontier: result.frontier,
					position: result.position,
					marks: [...(state?.marks ?? []), ...result.marks.map(storeMark)],
				}));
	const { frontier, position } = found;
	const marks = found.marks ? pruneMarks(found.marks, undefined) : undefined;
	if (!found.done) {
		return {
			items: [],
			state: { v: 2, frontier, position, marks, baselining: true },
			baseline: true,
		};
	}
	return { items: [], state: { v: 2, frontier, position, marks }, baseline: true };
};

export const pollTail = async (ctx: Ctx, state: State | undefined): Promise<Outcome> => {
	const { config } = ctx;
	if (!state && config.sortKeyIsTime) {
		return {
			items: [],
			state: { v: 2, frontier: { ts: config.clock() - config.skewMs, keys: [] } },
			baseline: true,
		};
	}
	if (!state || state.baselining) return await baselineTail(ctx, state);
	const stored = state.frontier ?? emptyFrontier();
	const walking = state.cursor !== undefined;
	const cursor = walking ? state.cursor! : lookbackFrontier(ctx.lookback, stored);
	const result = await walkSorted(ctx, {
		ascending: true,
		frontier: cursor,
		cap: config.maxItems,
		keep: true,
		start:
			walking || cursor === stored
				? (state.position ?? headPosition())
				: lookbackStart(ctx, state, cursor),
		known: (row) => ctx.recent.has(row.hash),
	});
	const marks =
		config.pagination === 'token'
			? pruneMarks([...(state.marks ?? []), ...result.marks.map(storeMark)], ctx.lookback)
			: undefined;
	return {
		items: ascending(config, result.items),
		state: {
			v: 2,
			frontier: higherFrontier(state.frontier, result.frontier),
			position: result.position,
			cursor: result.complete ? undefined : result.frontier,
			marks,
		},
	};
};
