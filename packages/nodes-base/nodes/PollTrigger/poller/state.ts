import { createHash } from 'node:crypto';

import type { SortKey } from './types';

export type Frontier = { ts: SortKey | null; keys: string[] };

/** The last page that proved the position: its window and the hash of its last item. */
export type Edge = { start: number; end: number; last: string };

export type Position = {
	offset?: number;
	token?: string;
	since?: number;
	lo?: number;
	hi?: number;
	step?: number;
	anchors?: string[];
	cap?: number;
	edge?: Edge;
	recheck?: string;
};

export type StoredSortKey = number | string;

/** An emitted item: its key hash, its sort key, and the clock time of the poll that emitted it. */
export type Recent = [hash: string, ts: StoredSortKey, at: number];

/** The token that fetched a page, and the sort key of the first item on that page. */
export type Mark = { token?: string; ts: StoredSortKey };

export type State = {
	v: 2;
	target?: Frontier;
	frontier?: Frontier;
	nextTarget?: Frontier;
	position?: Position;
	baselining?: true;
	seen?: string[];
	cursor?: Frontier;
	marks?: Mark[];
	recent?: Recent[];
	lookback?: { from: StoredSortKey | null; at: number };
};

export const hashKey = (key: string) => createHash('sha1').update(key).digest('hex').slice(0, 16);

export const isState = (value: unknown): value is State =>
	typeof value === 'object' && value !== null && 'v' in value && value.v === 2;

export const emptyFrontier = (): Frontier => ({ ts: null, keys: [] });

export const toJson = <T>(value: T): T =>
	JSON.parse(
		JSON.stringify(value, (_key, field: unknown) =>
			typeof field === 'bigint' ? field.toString() : field,
		),
	);

const loadFrontier = (frontier: Frontier): Frontier => {
	const ts: unknown = frontier.ts;
	return { ts: typeof ts === 'string' ? BigInt(ts) : frontier.ts, keys: frontier.keys };
};

/** Copies a stored state and turns sort keys stored as strings back into bigints. */
export const loadState = (raw: unknown): State | undefined => {
	if (!isState(raw)) return undefined;
	const state = toJson(raw);
	for (const field of ['target', 'frontier', 'nextTarget', 'cursor'] as const) {
		const frontier = state[field];
		if (frontier) state[field] = loadFrontier(frontier);
	}
	return state;
};
