import { compareSortKeys, toSortKey } from './sortKey';
import { type Frontier, type Recent, type State, type StoredSortKey, hashKey } from './state';
import type { Item, PollConfig, SortKey } from './types';

const RECENT_CAP = 2000;

type Entry = { hash: string; ts: SortKey; at: number };

export type Window = { from?: SortKey; entries: Entry[]; started: boolean };

const cap = (entries: Entry[]) =>
	entries.length > RECENT_CAP
		? [...entries].sort((a, b) => compareSortKeys(b.ts, a.ts)).slice(0, RECENT_CAP)
		: entries;

const store = (ts: SortKey): StoredSortKey => (typeof ts === 'bigint' ? ts.toString() : ts);

const higher = (a: SortKey | undefined, b: SortKey | undefined) =>
	a === undefined ? b : b === undefined || compareSortKeys(a, b) >= 0 ? a : b;

export const boundaryOf = (config: PollConfig, state: State | undefined): Frontier | undefined =>
	config.order === 'newestFirst' ? state?.target : state?.frontier;

const walking = (config: PollConfig, state: State) =>
	config.order === 'newestFirst' ? state.position !== undefined : state.cursor !== undefined;

/**
 * Items can become visible after a walk passed their sort key, up to `skewMs` late. Each walk re-reads from `from`:
 * for dates the start of the previous walk minus `skewMs`, for ids the lowest sort key emitted since then.
 * `from` moves only when a walk starts and never goes down, so every emitted item at or above it stays in the recent
 * list and is never emitted twice.
 */
export const openWindow = (config: PollConfig, state: State | undefined): Window => {
	const entries = (state?.recent ?? []).map(([hash, ts, at]) => ({ hash, ts: toSortKey(ts), at }));
	const previous = state?.lookback;
	if (!state || !previous) return { entries, started: false };
	const stored = previous.from === null ? undefined : toSortKey(previous.from);
	if (walking(config, state)) return { from: stored, entries: cap(entries), started: false };
	const cutoff = previous.at - config.skewMs;
	const fresh = entries.filter((entry) => entry.at >= cutoff);
	const lowestFresh = fresh.reduce<SortKey | undefined>(
		(low, entry) => (low === undefined || entry.ts < low ? entry.ts : low),
		undefined,
	);
	const boundary = boundaryOf(config, state)?.ts ?? undefined;
	const candidate = config.sortKeyIsTime ? cutoff : (lowestFresh ?? boundary ?? undefined);
	const from = higher(stored, candidate);
	const inWindow = entries.filter(
		(entry) => entry.at >= cutoff || (from !== undefined && entry.ts >= from),
	);
	const kept = cap(inWindow);
	const raised = kept.length < inWindow.length ? higher(from, kept[kept.length - 1].ts) : from;
	return { from: raised, entries: kept, started: true };
};

/** Records this poll's emitted items, and on the poll that completes the baseline, the baseline boundary. */
export const closeWindow = (
	config: PollConfig,
	previous: State | undefined,
	next: State,
	items: Item[],
	window: Window,
	now: number,
) => {
	const entries: Recent[] = window.entries.map(({ hash, ts, at }) => [hash, store(ts), at]);
	for (const item of items) {
		entries.push([hashKey(config.key(item)), store(toSortKey(config.timestamp(item))), now]);
	}
	let from = window.from;
	if (!previous?.lookback) {
		if (next.baselining) return;
		const boundary = boundaryOf(config, next);
		from = boundary?.ts ?? undefined;
		if (boundary && boundary.ts !== null) {
			for (const hash of boundary.keys) entries.push([hash, store(boundary.ts), now]);
		}
	}
	next.recent = entries;
	const at = window.started || !previous?.lookback ? now : previous.lookback.at;
	next.lookback = { from: from === undefined ? null : store(from), at };
};

/** The walk frontier that re-reads every item from the window start on. */
export const lookbackFrontier = (from: SortKey | undefined, frontier: Frontier): Frontier =>
	from !== undefined && frontier.ts !== null && from < frontier.ts
		? { ts: from, keys: [] }
		: frontier;

/** The higher of two frontiers; at an equal sort key, both key sets. */
export const higherFrontier = (a: Frontier | undefined, b: Frontier): Frontier => {
	if (!a || a.ts === null) return b;
	if (b.ts === null || b.ts < a.ts) return a;
	if (b.ts > a.ts) return b;
	return { ts: a.ts, keys: [...new Set([...a.keys, ...b.keys])] };
};
