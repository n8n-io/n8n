import fc from 'fast-check';

import { conditionsArb } from './conditions';
import type { CatalogEntry } from './types';

export const ifCondition: CatalogEntry = {
	id: 'if.condition',
	type: 'n8n-nodes-base.if',
	version: 2.2,
	role: 'if',
	inputs: 1,
	outputs: 2,
	deterministic: true,
	params: (ctx) =>
		fc
			// Mostly loose: strict type validation fails most cases on the first item.
			.oneof(
				{ arbitrary: fc.constant(false), weight: 4 },
				{ arbitrary: fc.constant(true), weight: 1 },
			)
			.chain((strict) =>
				conditionsArb(ctx, strict).map(({ conditions }) => ({
					conditions,
					looseTypeValidation: !strict,
					options: {},
				})),
			),
};
