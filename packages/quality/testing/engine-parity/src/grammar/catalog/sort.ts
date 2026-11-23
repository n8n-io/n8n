import fc from 'fast-check';

import type { CatalogEntry } from './types';

export const sort: CatalogEntry = {
	id: 'sort',
	type: 'n8n-nodes-base.sort',
	version: 1,
	role: 'plain',
	inputs: 1,
	outputs: 1,
	deterministic: true,
	// The order of the output is what the node does.
	orderSensitive: true,
	params: () =>
		fc
			.record({
				field: fc.constantFrom('n', 's', 'id'),
				order: fc.constantFrom('ascending', 'descending'),
			})
			.map(({ field, order }) => ({
				type: 'simple',
				sortFieldsUi: { sortField: [{ fieldName: field, order }] },
				options: {},
			})),
};
