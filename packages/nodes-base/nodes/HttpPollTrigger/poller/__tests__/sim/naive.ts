import { createHash } from 'node:crypto';
import type { Item, Poll } from '../../types';

const hash = (k: string) => createHash('sha1').update(k).digest('base64url').slice(0, 12);

export const naivePoll: Poll = async (cfg, state, fetchPage) => {
	const seen: string[] = (state as { seen?: string[] } | undefined)?.seen ?? [];
	const limit = cfg.pageSize;
	const res = await fetchPage(
		cfg.pagination === 'offset'
			? { kind: 'offset', offset: 0, limit }
			: cfg.pagination === 'page'
				? { kind: 'page', page: 1, limit }
				: { kind: 'token', limit },
	);
	const page = cfg.order !== 'oldestFirst' ? [...res.items].reverse() : res.items;
	const known = new Set(seen);
	const fresh: Item[] =
		state === undefined
			? []
			: page.filter((i) => !known.has(hash(cfg.key(i)))).slice(0, cfg.maxItems);
	const add = state === undefined ? page : fresh;
	return {
		items: fresh,
		state: { seen: [...seen, ...add.map((i) => hash(cfg.key(i)))].slice(-cfg.seenLimit) },
		warnings: [],
		baseline: state === undefined,
	};
};
