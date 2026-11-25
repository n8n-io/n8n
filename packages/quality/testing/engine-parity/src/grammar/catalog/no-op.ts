import fc from 'fast-check';

import type { CatalogEntry } from './types';

export const noOp: CatalogEntry = {
	id: 'noOp',
	type: 'n8n-nodes-base.noOp',
	version: 1,
	role: 'plain',
	inputs: 1,
	outputs: 1,
	deterministic: true,
	params: () => fc.constant({}),
};
