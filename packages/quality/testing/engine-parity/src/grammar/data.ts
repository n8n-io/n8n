import fc from 'fast-check';

import type { IrItem } from './ir';

const smallInt = fc.integer({ min: -2, max: 9 });
const shortString = fc.oneof(
	fc.constantFrom('a', 'b', 'c', '', 'a.b', '1'),
	fc.string({ maxLength: 3 }),
);

/**
 * Trigger items. The keys come from a small set, so expressions and node
 * parameters often find the fields they read. Every key is optional.
 */
export const itemJsonArb: fc.Arbitrary<Record<string, unknown>> = fc.record(
	{
		n: smallInt,
		s: shortString,
		b: fc.boolean(),
		x: fc.oneof(fc.constant(null), smallInt, shortString),
		// Few values, so that Merge by field finds matches.
		id: fc.integer({ min: 0, max: 3 }),
		nested: fc.record({ n: smallInt, s: shortString }, { requiredKeys: [] }),
		list: fc.array(fc.oneof(smallInt, fc.record({ n: smallInt })), { maxLength: 3 }),
		'a.b': shortString,
		empty: fc.constant({}),
	},
	{ requiredKeys: [] },
);

export function triggerItemsArb(maxItems: number): fc.Arbitrary<IrItem[]> {
	return fc.array(
		itemJsonArb.map((json) => ({ json })),
		{ minLength: 0, maxLength: maxItems },
	);
}
