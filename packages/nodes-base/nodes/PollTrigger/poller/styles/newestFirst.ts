import { type Ctx, fetchRows } from '../paginations/fetch';
import { sameSortKey } from '../sortKey';
import { type Frontier, type State, emptyFrontier } from '../state';
import { type Outcome, ascending, headPosition } from './sorted';
import { walkSorted } from './walk';

/** The higher of two targets; at an equal sort key, both key sets cover that sort key. */
const combine = (a: Frontier | undefined, b: Frontier | undefined): Frontier | undefined => {
	if (!a || a.ts === null) return b ?? a;
	if (!b || b.ts === null || b.ts < a.ts) return a;
	if (b.ts > a.ts) return b;
	return { ts: a.ts, keys: [...new Set([...a.keys, ...b.keys])] };
};

const baselineNewest = async (ctx: Ctx): Promise<Outcome> => {
	const { config } = ctx;
	if (config.sortKeyIsTime) {
		return { items: [], state: { v: 2, target: { ts: config.clock() - config.skewMs, keys: [] } } };
	}
	const head = (await fetchRows(ctx, headPosition())).rows[0];
	return {
		items: [],
		state: { v: 2, target: head ? { ts: head.ts, keys: [head.hash] } : emptyFrontier() },
	};
};

export const pollNewest = async (ctx: Ctx, state: State | undefined): Promise<Outcome> => {
	if (!state?.target) return await baselineNewest(ctx);
	const { target } = state;
	const targetKeys = new Set(target.keys);
	const { lookback, recent } = ctx;
	const bound =
		target.ts !== null && lookback !== undefined && lookback < target.ts ? lookback : target.ts;
	let nextTarget = state.nextTarget && {
		ts: state.nextTarget.ts,
		keys: [...state.nextTarget.keys],
	};

	const result = await walkSorted(ctx, {
		ascending: false,
		frontier: state.frontier ?? emptyFrontier(),
		cap: ctx.config.maxItems,
		keep: true,
		start: state.position ?? headPosition(),
		done: (row) => bound !== null && row.ts < bound,
		known: (row) =>
			(sameSortKey(row.ts, target.ts) && targetKeys.has(row.hash)) || recent.has(row.hash),
		fromHead: true,
		onPage: (rows, head) => {
			if (head && !nextTarget && rows.length > 0) nextTarget = { ts: rows[0].ts, keys: [] };
		},
		onCollect: (row) => {
			if (nextTarget && sameSortKey(row.ts, nextTarget.ts) && !nextTarget.keys.includes(row.hash)) {
				nextTarget.keys.push(row.hash);
			}
		},
	});

	const items = ascending(ctx.config, result.items);
	if (result.complete) {
		return { items, state: { v: 2, target: combine(target, nextTarget) ?? target } };
	}
	return {
		items,
		state: { v: 2, target, frontier: result.frontier, nextTarget, position: result.position },
	};
};
