import fc from 'fast-check';

import type { CatalogEntry } from './types';

/** Output 0 is "done" and output 1 is "loop". Engine v2 runs version 3 only. */
export const splitInBatches: CatalogEntry = {
	id: 'splitInBatches',
	type: 'n8n-nodes-base.splitInBatches',
	version: 3,
	role: 'loop',
	inputs: 1,
	outputs: 2,
	deterministic: true,
	params: () => fc.integer({ min: 1, max: 3 }).map((batchSize) => ({ batchSize, options: {} })),
};
