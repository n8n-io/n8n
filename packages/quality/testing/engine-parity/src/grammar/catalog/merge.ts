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

export const mergeCombineByPosition: CatalogEntry = {
	...base,
	id: 'merge.combineByPosition',
	params: () =>
		fc.boolean().map((includeUnpaired) => ({
			mode: 'combine',
			combineBy: 'combineByPosition',
			options: { includeUnpaired },
		})),
};

export const mergeCombineByFields: CatalogEntry = {
	...base,
	id: 'merge.combineByFields',
	params: () =>
		fc
			.record({
				field: fc.constantFrom('id', 'n', 's'),
				joinMode: fc.constantFrom(
					'keepMatches',
					'keepNonMatches',
					'keepEverything',
					'enrichInput1',
				),
			})
			.map(({ field, joinMode }) => ({
				mode: 'combine',
				combineBy: 'combineByFields',
				fieldsToMatchString: field,
				joinMode,
				options: {},
			})),
};
