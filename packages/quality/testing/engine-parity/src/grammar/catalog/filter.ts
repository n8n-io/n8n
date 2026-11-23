import fc from 'fast-check';

import { conditionsArb } from './conditions';
import type { CatalogEntry } from './types';

export const filter: CatalogEntry = {
	id: 'filter',
	type: 'n8n-nodes-base.filter',
	version: 2.2,
	role: 'plain',
	inputs: 1,
	outputs: 1,
	deterministic: true,
	params: (ctx) =>
		fc
			.oneof(
				{ arbitrary: fc.constant(false), weight: 4 },
				{ arbitrary: fc.constant(true), weight: 1 },
			)
			.chain((strict) =>
				conditionsArb(ctx, strict, true).map(({ conditions }) => ({
					conditions,
					looseTypeValidation: !strict,
					options: {},
				})),
			),
};
