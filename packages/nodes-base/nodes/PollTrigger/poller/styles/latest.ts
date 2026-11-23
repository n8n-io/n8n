import { toRequest } from '../paginations/fetch';
import { type Position, type State, hashKey } from '../state';
import type { FetchPage, Item, PollConfig, PollResult } from '../types';

const SEEN_CAP = 5000;

type Row = { item: Item; hash: string };

const keep = (keys: string[], limit: number) => keys.slice(Math.max(0, keys.length - limit));

/** Latest items: reads from the head while every item on the last page is unseen, and emits the unseen ones oldest first. */
export const pollLatest = async (
	config: PollConfig,
	state: State | undefined,
	fetchPage: FetchPage,
): Promise<PollResult> => {
	const seenLimit = Math.min(config.seenLimit, SEEN_CAP);
	const seen = new Set(state?.seen ?? []);
	const rows: Row[] = [];
	let pos: Position = {};
	for (let pages = 0; pages < (state?.seen ? config.maxPages : 1); pages++) {
		const numbered = { kind: 'page' as const, page: pages + 1, limit: config.pageSize };
		const page = await fetchPage(config.pagination === 'page' ? numbered : toRequest(config, pos));
		const read = page.items.map((item) => ({ item, hash: hashKey(config.key(item)) }));
		rows.push(...read);
		const unseen = new Set(rows.filter((row) => !seen.has(row.hash)).map((row) => row.hash)).size;
		if (
			!page.hasMore ||
			read.length === 0 ||
			read.some((row) => seen.has(row.hash)) ||
			unseen >= config.maxItems
		) {
			break;
		}
		if (config.pagination === 'token') {
			if (page.nextToken === undefined) break;
			pos = { token: page.nextToken };
		} else {
			pos = { offset: (pos.offset ?? 0) + read.length };
		}
	}

	if (!state?.seen) {
		const keys = rows.map((row) => row.hash).reverse();
		return {
			items: [],
			state: { v: 2, seen: keep(keys, seenLimit) },
			warnings: [],
			baseline: true,
		};
	}
	const fresh = new Map<string, Item>();
	for (const row of rows)
		if (!seen.has(row.hash) && !fresh.has(row.hash)) fresh.set(row.hash, row.item);
	const emitted = [...fresh].slice(Math.max(0, fresh.size - config.maxItems)).reverse();
	const keys = keep([...seen, ...emitted.map(([hash]) => hash)], seenLimit);
	return {
		items: emitted.map(([, item]) => item),
		state: { v: 2, seen: keys },
		warnings: [],
		baseline: false,
	};
};
