import fc from 'fast-check';

import type { ParityRules } from './rules';

/**
 * Expressions are plain data until a node is placed. Then a reference resolves
 * against the nodes upstream of that node. `pick` is a number from 0 to 1 that
 * selects one of those nodes, so a shrink moves it toward the trigger.
 *
 * Expressions never use `$now`, `$today`, `Math.random` or `$execution.id`.
 */

/** Paths into the items that `data.ts` generates. `missing` is never set. */
export const FIELD_PATHS = ['n', 's', 'b', 'x', 'id', 'nested.n', 'nested.s', 'missing'] as const;
export type FieldPath = (typeof FIELD_PATHS)[number];

export type ItemSource =
	| { kind: 'json' }
	| { kind: 'input'; accessor: 'first' | 'last' }
	| { kind: 'node'; pick: number; accessor: 'first' | 'last' | 'item' }
	/** A node that did not run before this one: downstream, or not in the workflow. */
	| { kind: 'ghost'; pick: number; accessor: 'first' | 'item' };

export type ValueExpr =
	| { kind: 'field'; source: ItemSource; path: FieldPath }
	| { kind: 'count'; source: { kind: 'input' } | { kind: 'node'; pick: number } }
	| { kind: 'literal'; value: number | string | boolean | null }
	| { kind: 'arith'; op: '+' | '-' | '*'; left: ValueExpr; right: ValueExpr }
	| { kind: 'concat'; left: ValueExpr; right: ValueExpr }
	| { kind: 'meta'; name: '$runIndex' | '$itemIndex' };

/** What an expression can see where it is placed. */
export interface ExprScope {
	/** The nodes upstream of the current node, trigger first. */
	upstream: string[];
	/** Names of nodes that did not run before the current node. */
	elsewhere: string[];
}

// Not fc.double: most doubles in [0, 1) are near 0, so almost every pick would select the trigger.
const pick = fc.noBias(fc.integer({ min: 0, max: 999 })).map((n) => n / 1000);

export function itemSourceArb(rules: ParityRules): fc.Arbitrary<ItemSource> {
	const ghostWeight = Math.round(rules.expressions.ghostRate * 100);
	return fc.oneof(
		{ arbitrary: fc.constant({ kind: 'json' as const }), weight: 50 },
		{
			arbitrary: fc.record({
				kind: fc.constant('input' as const),
				accessor: fc.constantFrom('first' as const, 'last' as const),
			}),
			weight: 10,
		},
		{
			arbitrary: fc.record({
				kind: fc.constant('node' as const),
				pick,
				accessor: fc.constantFrom('first' as const, 'last' as const, 'item' as const),
			}),
			weight: Math.max(0, 40 - ghostWeight),
		},
		{
			arbitrary: fc.record({
				kind: fc.constant('ghost' as const),
				pick,
				accessor: fc.constantFrom('first' as const, 'item' as const),
			}),
			weight: ghostWeight,
		},
	);
}

const literalArb: fc.Arbitrary<ValueExpr> = fc.record({
	kind: fc.constant('literal' as const),
	value: fc.oneof(
		fc.integer({ min: -3, max: 10 }),
		fc.constantFrom('a', 'b', 'x y', ''),
		fc.boolean(),
		fc.constant(null),
	),
});

export function fieldArb(rules: ParityRules): fc.Arbitrary<ValueExpr> {
	return fc.record({
		kind: fc.constant('field' as const),
		source: itemSourceArb(rules),
		path: fc.constantFrom(...FIELD_PATHS),
	});
}

/** A value expression. Most of them read upstream data. */
export function valueExprArb(rules: ParityRules): fc.Arbitrary<ValueExpr> {
	const field = fieldArb(rules);
	const count: fc.Arbitrary<ValueExpr> = fc.record({
		kind: fc.constant('count' as const),
		source: fc.oneof(
			fc.constant({ kind: 'input' as const }),
			fc.record({ kind: fc.constant('node' as const), pick }),
		),
	});
	const meta: fc.Arbitrary<ValueExpr> = fc.record({
		kind: fc.constant('meta' as const),
		name: fc.constantFrom('$runIndex' as const, '$itemIndex' as const),
	});
	const leaf = fc.oneof(
		{ arbitrary: field, weight: 6 },
		{ arbitrary: literalArb, weight: 2 },
		{ arbitrary: count, weight: 1 },
		{ arbitrary: meta, weight: 1 },
	);
	return fc.oneof(
		{ arbitrary: leaf, weight: 6 },
		{
			arbitrary: fc.record({
				kind: fc.constant('arith' as const),
				op: fc.constantFrom('+' as const, '-' as const, '*' as const),
				left: leaf,
				right: leaf,
			}),
			weight: 2,
		},
		{
			arbitrary: fc.record({ kind: fc.constant('concat' as const), left: leaf, right: leaf }),
			weight: 2,
		},
	);
}

function pickFrom(names: string[], fraction: number): string | undefined {
	if (names.length === 0) return undefined;
	return names[Math.min(names.length - 1, Math.floor(fraction * names.length))];
}

const quote = (name: string) => `$(${JSON.stringify(name)})`;

function renderPath(path: FieldPath): string {
	// Optional chaining keeps a missing parent from failing most expressions.
	return path
		.split('.')
		.map((part, i) => (i === 0 ? `.${part}` : `?.${part}`))
		.join('');
}

function renderSource(source: ItemSource, scope: ExprScope): string {
	switch (source.kind) {
		case 'json':
			return '$json';
		case 'input':
			return `$input.${source.accessor}().json`;
		case 'node': {
			const name = pickFrom(scope.upstream, source.pick) ?? 'Ghost';
			return source.accessor === 'item'
				? `${quote(name)}.item.json`
				: `${quote(name)}.${source.accessor}().json`;
		}
		case 'ghost': {
			const name = pickFrom(scope.elsewhere, source.pick) ?? 'Ghost';
			return source.accessor === 'item'
				? `${quote(name)}.item.json`
				: `${quote(name)}.first().json`;
		}
	}
}

/** Renders the expression as JavaScript, without the `{{ }}` markers. */
export function renderValue(expr: ValueExpr, scope: ExprScope): string {
	switch (expr.kind) {
		case 'field':
			return `${renderSource(expr.source, scope)}${renderPath(expr.path)}`;
		case 'count':
			return expr.source.kind === 'input'
				? '$input.all().length'
				: `${quote(pickFrom(scope.upstream, expr.source.pick) ?? 'Ghost')}.all().length`;
		case 'literal':
			return JSON.stringify(expr.value);
		case 'arith':
			return `(Number(${renderValue(expr.left, scope)}) ${expr.op} Number(${renderValue(expr.right, scope)}))`;
		case 'concat':
			return `(String(${renderValue(expr.left, scope)}) + "-" + String(${renderValue(expr.right, scope)}))`;
		case 'meta':
			return expr.name;
	}
}

/** Renders the expression as an n8n parameter value. */
export function renderExpression(expr: ValueExpr, scope: ExprScope): string {
	return `={{ ${renderValue(expr, scope)} }}`;
}
