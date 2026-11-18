export type Item = { [key: string]: unknown };

export type SortKey = number | bigint;

export type PageRequest =
	| { kind: 'offset'; offset: number; limit: number; since?: number }
	| { kind: 'token'; token?: string; limit: number; since?: number }
	| { kind: 'page'; page: number; limit: number; since?: number };

export type PageResponse = {
	items: Item[];
	hasMore: boolean;
	nextToken?: string;
};

export type FetchPage = (request: PageRequest) => Promise<PageResponse>;

export type PollConfig = {
	order: 'newestFirst' | 'oldestFirst' | 'latest';
	/** Next-URL pagination uses 'token': the next URL is the token. */
	pagination: 'offset' | 'token' | 'page';
	pageSize: number;
	maxPages: number;
	maxItems: number;
	key: (item: Item) => string;
	/** A number, a bigint, or a numeric string; integer strings above 2^53 keep their precision. */
	timestamp: (item: Item) => number | bigint | string;
	useSince: boolean;
	sortKeyIsTime: boolean;
	clock: () => number;
	skewMs: number;
	overlap: number;
	maxStepBack: number;
	seenLimit: number;
};

export type PollResult = {
	items: Item[];
	state: unknown;
	warnings: string[];
	baseline: boolean;
};

export type Poll = (
	config: PollConfig,
	state: unknown | undefined,
	fetchPage: FetchPage,
) => Promise<PollResult>;
