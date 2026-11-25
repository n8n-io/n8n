import fc from 'fast-check';

import { valueExprArb } from '../expressions';
import type { GenContext, ParamDraft } from './types';

const operatorArb = fc.oneof(
	fc.record({
		operator: fc.record({
			type: fc.constant('number'),
			operation: fc.constantFrom('gt', 'lt', 'equals', 'gte'),
		}),
		rightValue: fc.integer({ min: -1, max: 5 }),
	}),
	fc.record({
		operator: fc.record({
			type: fc.constant('string'),
			operation: fc.constantFrom('equals', 'contains', 'notEquals'),
		}),
		// 'A' matches 'a' only when the comparison ignores case.
		rightValue: fc.constantFrom('a', 'A', 'b', ''),
	}),
	fc.record({
		operator: fc.record({
			type: fc.constant('boolean'),
			operation: fc.constantFrom('true', 'false'),
			singleValue: fc.constant(true),
		}),
		rightValue: fc.constant(''),
	}),
	fc.record({
		operator: fc.record({
			type: fc.constant('string'),
			operation: fc.constantFrom('exists', 'notExists', 'empty'),
			singleValue: fc.constant(true),
		}),
		rightValue: fc.constant(''),
	}),
);

/**
 * The `filter` parameter of If, Filter and Switch rules, version 2 of the filter.
 * The engine reads `caseSensitive` from this value. The node option `ignoreCase`
 * only sets it in the editor, so the caller must keep the two in agreement.
 */
export function conditionsArb(
	ctx: GenContext,
	strict: boolean,
	caseSensitive: boolean,
): fc.Arbitrary<{ conditions: ParamDraft }> {
	return fc
		.record({
			combinator: fc.constantFrom('and', 'or'),
			list: fc.array(fc.record({ left: valueExprArb(ctx.rules), op: operatorArb }), {
				minLength: 1,
				maxLength: 2,
			}),
		})
		.map(({ combinator, list }) => ({
			conditions: {
				options: {
					caseSensitive,
					leftValue: '',
					typeValidation: strict ? 'strict' : 'loose',
					version: 2,
				},
				conditions: list.map(({ left, op }, i) => ({
					id: `c${i}`,
					leftValue: { $expr: left },
					rightValue: op.rightValue,
					operator: op.operator,
				})),
				combinator,
			},
		}));
}
