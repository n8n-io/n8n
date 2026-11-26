import fc from 'fast-check';

import type { CatalogEntry } from './types';

export const splitOut: CatalogEntry = {
	id: 'splitOut',
	type: 'n8n-nodes-base.splitOut',
	version: 1,
	role: 'plain',
	inputs: 1,
	outputs: 1,
	deterministic: true,
	params: () =>
		fc
			.record({
				// Mostly the list field, so that most cases split something.
				field: fc.oneof(
					{ arbitrary: fc.constant('list'), weight: 4 },
					{ arbitrary: fc.constantFrom('n', 'nested', 'missing'), weight: 1 },
				),
				include: fc.constantFrom('noOtherFields', 'allOtherFields'),
			})
			.map(({ field, include }) => ({ fieldToSplitOut: field, include, options: {} })),
};
