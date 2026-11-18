import { type Ctx, type Page, type Row, canFetch, fetchRows, stalls } from '../paginations/fetch';
import { backward, forward } from '../paginations/search';
import { sameSortKey } from '../sortKey';
import type { Edge, Frontier, Position } from '../state';
import type { Item, SortKey } from '../types';

export type SortedWalk = {
	ascending: boolean;
	frontier: Frontier;
	cap: number;
	keep: boolean;
	start: Position;
	done?: (row: Row) => boolean;
	onPage?: (rows: Row[], head: boolean) => void;
	onCollect?: (row: Row) => void;
	known?: (row: Row) => boolean;
	fromHead?: boolean;
};

export type SortedResult = {
	items: Item[];
	frontier: Frontier;
	complete: boolean;
	position: Position;
	marks: Array<{ token?: string; ts: SortKey }>;
};

const lastIndex = <T>(xs: T[], test: (x: T) => boolean) => {
	for (let i = xs.length - 1; i >= 0; i--) if (test(xs[i])) return i;
	return -1;
};

const edgeOf = (start: number, rows: Row[]): Edge => ({
	start,
	end: start + rows.length,
	last: rows[rows.length - 1].hash,
});

const recheckIfStalled = (ctx: Ctx, page: Page, pos: Position): Position =>
	stalls(ctx, page, pos.offset ?? 0)
		? { ...pos, recheck: page.rows[page.rows.length - 1].hash }
		: pos;

/**
 * A list API may only signal its end with an empty page. An empty page within the last proving page re-reads that page,
 * and an unchanged last item there ends the list.
 */
export const walkSorted = async (ctx: Ctx, walk: SortedWalk): Promise<SortedResult> => {
	const { config } = ctx;
	let frontier: Frontier = { ts: walk.frontier.ts, keys: [...walk.frontier.keys] };
	let keys = new Set(frontier.keys);
	const items: Item[] = [];
	let count = 0;
	const behind = (row: Row) =>
		frontier.ts !== null &&
		(sameSortKey(row.ts, frontier.ts)
			? keys.has(row.hash)
			: walk.ascending
				? row.ts < frontier.ts
				: row.ts > frontier.ts);
	const collect = (row: Row) => {
		if (sameSortKey(row.ts, frontier.ts)) {
			keys.add(row.hash);
			frontier.keys.push(row.hash);
		} else {
			frontier = { ts: row.ts, keys: [row.hash] };
			keys = new Set(frontier.keys);
		}
		count++;
		if (walk.keep) items.push(row.item);
		walk.onCollect?.(row);
	};
	const marks: SortedResult['marks'] = [];
	const end = (complete: boolean, position: Position): SortedResult => ({
		items,
		frontier,
		marks,
		complete,
		position,
	});

	let pos = walk.start;
	while (true) {
		if (!canFetch(ctx)) return end(false, pos);
		const page = await fetchRows(ctx, pos);
		const { rows } = page;
		const offset = page.start;
		const head = config.pagination === 'token' ? pos.token === undefined : offset === 0;
		const listEnd =
			config.pagination !== 'token' &&
			(rows.length === 0
				? offset === 0
				: pos.recheck !== undefined && rows[rows.length - 1].hash === pos.recheck);
		const hasMore = page.hasMore && !listEnd;
		walk.onPage?.(rows, head);
		if (walk.fromHead && head && frontier.ts === null && rows.length > 0) {
			frontier = { ts: rows[0].ts, keys: [] };
		}

		let from = 0;
		if (config.pagination !== 'token') {
			const anchors = new Set(pos.anchors ?? []);
			const lastBehind = lastIndex(rows, behind);
			const lastAnchor = lastIndex(rows, (row) => anchors.has(row.hash));
			if (hasMore && rows.length > 0 && rows.every(behind)) {
				ctx.search++;
				const lo = offset + Math.max(1, rows.length - config.overlap);
				pos = recheckIfStalled(ctx, page, {
					...forward(pos, lo, rows.length),
					edge: edgeOf(offset, rows),
				});
				continue;
			}
			const { edge } = pos;
			if (rows.length === 0 && offset > 0 && !pos.recheck && edge && offset <= edge.end) {
				ctx.search++;
				pos = { ...pos, offset: edge.start, recheck: edge.last };
				continue;
			}
			if (lastBehind < 0 && lastAnchor < 0 && offset > 0) {
				ctx.search++;
				pos = backward(config, pos, offset, rows.length);
				continue;
			}
			from = Math.max(lastBehind, lastAnchor) + 1;
		}
		ctx.valid++;
		const reread: Position = {
			offset: config.pagination === 'token' ? undefined : offset,
			token: pos.token,
			since: pos.since,
			anchors: pos.anchors,
		};
		for (const row of rows.slice(from)) {
			if (walk.done?.(row)) return end(true, reread);
			if (behind(row) || walk.known?.(row)) continue;
			if (count >= walk.cap) return end(false, reread);
			collect(row);
		}
		if (config.pagination === 'token') {
			if (rows.length > 0) marks.push({ token: pos.token, ts: rows[0].ts });
			if (!hasMore) return end(true, reread);
			if (page.nextToken === undefined) return end(false, reread);
			pos = { token: page.nextToken, since: pos.since };
			continue;
		}
		const kept = Math.min(config.overlap, rows.length);
		const next: Position = {
			offset: offset + Math.max(hasMore ? 1 : 0, rows.length - config.overlap),
			since: pos.since,
			anchors: rows.slice(rows.length - kept).map((row) => row.hash),
		};
		if (!hasMore) return end(true, next);
		pos =
			rows.length > 0 ? recheckIfStalled(ctx, page, { ...next, edge: edgeOf(offset, rows) }) : next;
	}
};
