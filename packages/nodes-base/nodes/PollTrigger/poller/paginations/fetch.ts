import { toSortKey } from '../sortKey';
import { type Position, hashKey } from '../state';
import type { FetchPage, Item, PageRequest, PageResponse, PollConfig, SortKey } from '../types';
import { type Window, pageFor, sameWindow } from './pageNumber';

export type Ctx = {
	config: PollConfig;
	fetchPage: FetchPage;
	valid: number;
	search: number;
	unlimited: boolean;
	cap?: number;
	lookback?: SortKey;
	recent: Set<string>;
};

export type Row = { item: Item; ts: SortKey; hash: string };

export type Page = {
	rows: Row[];
	hasMore: boolean;
	nextToken?: string;
	start: number;
	window?: Window;
};

export const newCtx = (config: PollConfig, fetchPage: FetchPage): Ctx => ({
	config,
	fetchPage,
	valid: 0,
	search: 0,
	unlimited: false,
	recent: new Set(),
});

/** Search fetches use the step-back budget first, then the page budget. */
export const canFetch = (ctx: Ctx) =>
	ctx.unlimited ||
	ctx.valid + Math.max(0, ctx.search - ctx.config.maxStepBack) < ctx.config.maxPages;

export const toRequest = (config: PollConfig, pos: Position): PageRequest => {
	const since = pos.since === undefined ? {} : { since: pos.since };
	if (config.pagination === 'token') {
		const token = pos.token === undefined ? {} : { token: pos.token };
		return { kind: 'token', limit: config.pageSize, ...token, ...since };
	}
	return { kind: 'offset', offset: pos.offset ?? 0, limit: config.pageSize, ...since };
};

const MIN_PAGE_CAP = 25;

/**
 * Learns the server's page-size cap from a short page that has more. An API whose `hasMore` only means "not empty" also
 * returns a short last page, so a short page below the smallest supported cap is not taken as a cap.
 */
const learnCap = (
	config: PollConfig,
	cap: number | undefined,
	limit: number,
	page: PageResponse,
) => {
	const n = page.items.length;
	if (n >= limit && limit === config.pageSize) return undefined;
	if (n < limit && page.hasMore && n >= MIN_PAGE_CAP) return n;
	return cap;
};

export const fetchRows = async (ctx: Ctx, pos: Position): Promise<Page> => {
	const { config } = ctx;
	const since = pos.since === undefined ? {} : { since: pos.since };
	const numbered =
		config.pagination === 'page' ? pageFor(config, ctx.cap, pos.offset ?? 0) : undefined;
	const page = await ctx.fetchPage(
		numbered ? { kind: 'page', ...numbered, ...since } : toRequest(config, pos),
	);
	if (numbered) ctx.cap = learnCap(config, ctx.cap, numbered.limit, page);
	const start = numbered
		? (numbered.page - 1) * Math.min(numbered.limit, ctx.cap ?? numbered.limit)
		: (pos.offset ?? 0);
	const rows = page.items.map((item) => ({
		item,
		ts: toSortKey(config.timestamp(item)),
		hash: hashKey(config.key(item)),
	}));
	return { rows, hasMore: page.hasMore, nextToken: page.nextToken, start, window: numbered };
};

export const midpoint = (lo: number, hi: number) => lo + Math.floor((hi - lo) / 2);

/** In page-number mode, a list that ends inside a window maps every later offset back to that window. */
export const stalls = (ctx: Ctx, page: Page, offset: number) =>
	page.window !== undefined &&
	page.rows.length > 0 &&
	sameWindow(pageFor(ctx.config, ctx.cap, offset), page.window);
