import fc from 'fast-check';

import type { CatalogEntry } from './types';

const TYPE = 'n8n-nodes-base.merge';
const VERSION = 3;

const base = {
	type: TYPE,
	version: VERSION,
	role: 'merge' as const,
	inputs: 2,
	outputs: 1,
	deterministic: true as const,
};

export const mergeAppend: CatalogEntry = {
	...base,
	id: 'merge.append',
	params: () => fc.constant({ mode: 'append', numberInputs: 2 }),
};
