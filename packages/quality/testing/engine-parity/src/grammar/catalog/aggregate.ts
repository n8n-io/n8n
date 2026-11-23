import fc from 'fast-check';

import type { CatalogEntry } from './types';

const base = {
	type: 'n8n-nodes-base.aggregate',
	version: 1,
	role: 'plain' as const,
	inputs: 1,
	outputs: 1,
	deterministic: true as const,
};

export const aggregateFields: CatalogEntry = {
	...base,
	id: 'aggregate.fields',
	params: () =>
		fc
			.uniqueArray(fc.constantFrom('n', 's', 'id', 'list', 'nested', 'missing'), {
				minLength: 1,
				maxLength: 2,
			})
			.map((fields) => ({
				aggregate: 'aggregateIndividualFields',
				fieldsToAggregate: {
					fieldToAggregate: fields.map((field) => ({
						fieldToAggregate: field,
						renameField: false,
					})),
				},
				options: {},
			})),
};

export const aggregateAll: CatalogEntry = {
	...base,
	id: 'aggregate.all',
	params: () =>
		fc.constant({
			aggregate: 'aggregateAllItemData',
			destinationFieldName: 'data',
			include: 'allFields',
			options: {},
		}),
};
