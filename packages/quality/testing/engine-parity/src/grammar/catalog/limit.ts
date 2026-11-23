import fc from 'fast-check';

import type { CatalogEntry } from './types';

export const limit: CatalogEntry = {
	id: 'limit',
	type: 'n8n-nodes-base.limit',
	version: 1,
	role: 'plain',
	inputs: 1,
	outputs: 1,
	deterministic: true,
	params: () =>
		fc.record({
			maxItems: fc.integer({ min: 1, max: 3 }),
			keep: fc.constantFrom('firstItems', 'lastItems'),
		}),
};
