import type { PollConfig } from '../types';

export type Window = { page: number; limit: number };

/**
 * A page-number window of size e starts at a multiple of e. Picks the largest size whose window holds the `overlap` items
 * from `offset` on plus one more, so the page re-reads what the offset rules want and still moves forward.
 */
export const pageFor = (config: PollConfig, cap: number | undefined, offset: number): Window => {
	const { overlap, pageSize } = config;
	if (offset === 0) return { page: 1, limit: pageSize };
	const largest = Math.min(pageSize, cap ?? pageSize);
	for (let size = largest; size > overlap; size--) {
		const start = offset - (offset % size);
		if (offset - start < size - overlap) return { page: start / size + 1, limit: size };
	}
	return { page: Math.floor(offset / largest) + 1, limit: largest };
};

export const sameWindow = (a: Window, b: Window) => a.page === b.page && a.limit === b.limit;
