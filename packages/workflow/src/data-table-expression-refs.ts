/**
 * Finds `$datatable` references in expression text, so the engine can fetch the
 * rows before a node runs. Reads `$datatable.<table>.first`, `.last`,
 * `.row[<expr>]` and `.find({ <column>: <expr> })`. The table and column names
 * must be literal, so a reference is always discoverable without running the
 * expression.
 */

import type { DataTableExpressionAccessors, DataTableExpressionRows } from './data-table.types';

const PREFIX = '$datatable';

const IDENTIFIER = /^[A-Za-z_$][\w$]*/;

/** An unquoted object key cannot hold these, so anything left is not a column name. */
const INVALID_COLUMN = /[,:{}()[\]]/;

export type DataTableExpressionRef =
	| { table: string; accessor: 'first' | 'last' }
	| { table: string; accessor: 'row'; keyExpression: string }
	| { table: string; accessor: 'find'; column: string; keyExpression: string };

/** A reference whose row is looked up by a key, rather than by position. */
export type KeyedDataTableRef = Extract<DataTableExpressionRef, { keyExpression: string }>;

export const isKeyedDataTableRef = (ref: DataTableExpressionRef): ref is KeyedDataTableRef =>
	'keyExpression' in ref;

/** A literal name read as `.name`, `['name']` or `["name"]`. */
function readMember(text: string, pos: number): { name: string; end: number } | undefined {
	if (text[pos] === '.') {
		const match = IDENTIFIER.exec(text.slice(pos + 1));
		if (!match) return undefined;
		return { name: match[0], end: pos + 1 + match[0].length };
	}

	if (text[pos] === '[') {
		const quote = text[pos + 1];
		if (quote !== "'" && quote !== '"') return undefined;
		const close = text.indexOf(quote, pos + 2);
		if (close === -1 || text[close + 1] !== ']') return undefined;
		return { name: text.slice(pos + 2, close), end: close + 2 };
	}

	return undefined;
}

/** The text inside a bracketed accessor, with nested brackets and quotes kept intact. */
function readDelimited(
	text: string,
	pos: number,
	open: '[' | '(' | '{',
): { expression: string; end: number } | undefined {
	const close = { '[': ']', '(': ')', '{': '}' }[open];
	if (text[pos] !== open) return undefined;

	let depth = 0;
	let quote: string | undefined;

	for (let i = pos; i < text.length; i++) {
		const char = text[i];

		if (quote) {
			if (char === '\\') i++;
			else if (char === quote) quote = undefined;
			continue;
		}

		if (char === "'" || char === '"' || char === '`') quote = char;
		else if (char === open) depth++;
		else if (char === close) {
			depth--;
			if (depth === 0) {
				const expression = text.slice(pos + 1, i).trim();
				return expression ? { expression, end: i + 1 } : undefined;
			}
		}
	}

	return undefined;
}

const readBracketExpression = (text: string, pos: number) => readDelimited(text, pos, '[');

/**
 * The single `{ <column>: <expr> }` argument of a `find(...)` call. One column
 * only, because a reference always resolves to at most one row.
 */
function readFindArgument(
	text: string,
	pos: number,
): { column: string; expression: string; end: number } | undefined {
	const call = readDelimited(text, pos, '(');
	if (!call) return undefined;

	const object = readDelimited(call.expression, 0, '{');
	if (!object || object.end !== call.expression.length) return undefined;

	const separator = object.expression.indexOf(':');
	if (separator === -1) return undefined;

	const key = object.expression.slice(0, separator).trim();
	const expression = object.expression.slice(separator + 1).trim();
	if (!expression) return undefined;

	const column = /^(['"])(.*)\1$/.exec(key)?.[2] ?? key;
	if (!column || INVALID_COLUMN.test(column)) return undefined;

	return { column, expression, end: call.end };
}

function readRef(text: string, pos: number): DataTableExpressionRef | undefined {
	const table = readMember(text, pos);
	if (!table) return undefined;

	const accessor = readMember(text, table.end);
	if (!accessor) return undefined;

	switch (accessor.name) {
		case 'first':
		case 'last':
			return { table: table.name, accessor: accessor.name };

		case 'row': {
			const key = readBracketExpression(text, accessor.end);
			return key
				? { table: table.name, accessor: 'row', keyExpression: key.expression }
				: undefined;
		}

		case 'find': {
			const argument = readFindArgument(text, accessor.end);
			return argument
				? {
						table: table.name,
						accessor: 'find',
						column: argument.column,
						keyExpression: argument.expression,
					}
				: undefined;
		}

		default:
			return undefined;
	}
}

/** Every `$datatable` reference in a piece of expression text. */
export function extractDataTableRefs(text: string): DataTableExpressionRef[] {
	if (!text.includes(PREFIX)) return [];

	const refs: DataTableExpressionRef[] = [];

	for (let at = text.indexOf(PREFIX); at !== -1; at = text.indexOf(PREFIX, at + PREFIX.length)) {
		const ref = readRef(text, at + PREFIX.length);
		if (ref) refs.push(ref);
	}

	return refs;
}

/**
 * Exposes prefetched rows the way an expression reads them. `find()` is a
 * function rather than a data path, so it replaces the stored `matched` index;
 * it only reads rows that were already fetched.
 */
export function buildDataTableAccessors(
	rows: DataTableExpressionRows,
): Record<string, DataTableExpressionAccessors> {
	return Object.fromEntries(
		Object.entries(rows).map(([table, { matched, ...accessors }]) => [
			table,
			{
				...accessors,
				find(criteria: Record<string, unknown>) {
					const [column, value] = Object.entries(criteria ?? {})[0] ?? [];
					if (column === undefined) return undefined;
					return matched[column]?.[String(value)];
				},
			},
		]),
	);
}

/** Every string in a parameter tree, so nested and collection parameters are scanned too. */
export function* collectStrings(value: unknown): Generator<string> {
	if (typeof value === 'string') yield value;
	else if (Array.isArray(value)) for (const entry of value) yield* collectStrings(entry);
	else if (value !== null && typeof value === 'object')
		for (const entry of Object.values(value)) yield* collectStrings(entry);
}

/** What a partly typed `$datatable` path points at, for editor completions. */
export type DataTableExpressionPath =
	| { at: 'table' }
	| { at: 'accessor'; table: string }
	/** On a row, so the next name is one of its columns. */
	| { at: 'rowField'; table: string };

export const DATA_TABLE_ACCESSORS = ['first', 'last', 'row', 'find'] as const;

/**
 * Reads a `$datatable` path that the editor may still be completing, so the
 * completion source knows which names to offer next.
 */
export function describeDataTablePath(base: string): DataTableExpressionPath | undefined {
	if (base === PREFIX) return { at: 'table' };
	if (!base.startsWith(PREFIX)) return undefined;

	const table = readMember(base, PREFIX.length);
	if (!table) return undefined;
	if (table.end === base.length) return { at: 'accessor', table: table.name };

	const accessor = readMember(base, table.end);
	if (!accessor) return undefined;

	switch (accessor.name) {
		case 'first':
		case 'last':
			return accessor.end === base.length ? { at: 'rowField', table: table.name } : undefined;

		case 'row': {
			const key = readBracketExpression(base, accessor.end);
			return key?.end === base.length ? { at: 'rowField', table: table.name } : undefined;
		}

		case 'find': {
			const argument = readFindArgument(base, accessor.end);
			return argument?.end === base.length ? { at: 'rowField', table: table.name } : undefined;
		}

		default:
			return undefined;
	}
}
