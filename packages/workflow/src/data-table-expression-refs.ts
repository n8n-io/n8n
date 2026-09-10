/**
 * Finds `$datatable` references in expression text, so the engine can fetch the
 * rows before a node runs. Reads `$datatable.<table>.first`, `.last`,
 * `.row[<expr>]` and `.by.<column>[<expr>]`. The table and column names must be
 * literal, so a reference is always discoverable without running the expression.
 */

const PREFIX = '$datatable';

const IDENTIFIER = /^[A-Za-z_$][\w$]*/;

export type DataTableExpressionRef =
	| { table: string; accessor: 'first' | 'last' }
	| { table: string; accessor: 'row' | 'by'; column: string; keyExpression: string };

export const DATA_TABLE_ACCESSORS = ['first', 'last', 'row', 'by'] as const;

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

/** The text inside `[...]`, with nested brackets and quotes kept intact. */
function readKey(text: string, pos: number): { expression: string; end: number } | undefined {
	if (text[pos] !== '[') return undefined;

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
		else if (char === '[') depth++;
		else if (char === ']') {
			depth--;
			if (depth === 0) {
				const expression = text.slice(pos + 1, i).trim();
				return expression ? { expression, end: i + 1 } : undefined;
			}
		}
	}

	return undefined;
}

/** As much of a `$datatable` path as is there, and where the reading stopped. */
function readPath(
	text: string,
	pos: number,
): { table: string; accessor?: string; ref?: DataTableExpressionRef; end: number } | undefined {
	const table = readMember(text, pos);
	if (!table) return undefined;

	const accessor = readMember(text, table.end);
	if (!accessor) return { table: table.name, end: table.end };

	const path = { table: table.name, accessor: accessor.name, end: accessor.end };

	switch (accessor.name) {
		case 'first':
		case 'last':
			return { ...path, ref: { table: table.name, accessor: accessor.name } };

		case 'row': {
			const key = readKey(text, accessor.end);
			if (!key) return path;
			return {
				...path,
				ref: { table: table.name, accessor: 'row', column: 'id', keyExpression: key.expression },
				end: key.end,
			};
		}

		case 'by': {
			const column = readMember(text, accessor.end);
			const key = column && readKey(text, column.end);
			if (!column || !key) return path;
			return {
				...path,
				ref: {
					table: table.name,
					accessor: 'by',
					column: column.name,
					keyExpression: key.expression,
				},
				end: key.end,
			};
		}

		default:
			return path;
	}
}

/** Every string in a parameter tree, so nested and collection parameters are scanned too. */
function* collectStrings(value: unknown): Generator<string> {
	if (typeof value === 'string') yield value;
	else if (Array.isArray(value)) for (const entry of value) yield* collectStrings(entry);
	else if (value !== null && typeof value === 'object')
		for (const entry of Object.values(value)) yield* collectStrings(entry);
}

/** Every distinct `$datatable` reference in a string or parameter tree. */
export function extractDataTableRefs(parameters: unknown): DataTableExpressionRef[] {
	const byKey = new Map<string, DataTableExpressionRef>();

	for (const text of collectStrings(parameters)) {
		for (let at = text.indexOf(PREFIX); at !== -1; at = text.indexOf(PREFIX, at + PREFIX.length)) {
			const ref = readPath(text, at + PREFIX.length)?.ref;
			if (ref) byKey.set(JSON.stringify(ref), ref);
		}
	}

	return [...byKey.values()];
}

/** What a partly typed `$datatable` path points at, for editor completions. */
export type DataTableExpressionPath =
	| { at: 'table' }
	| { at: 'accessor'; table: string }
	/** After `.by`, so the next name is a column. */
	| { at: 'column'; table: string }
	/** On a row, so the next name is one of its columns. */
	| { at: 'rowField'; table: string };

/**
 * Reads a `$datatable` path that the editor may still be completing, so the
 * completion source knows which names to offer next.
 */
export function describeDataTablePath(base: string): DataTableExpressionPath | undefined {
	if (base === PREFIX) return { at: 'table' };
	if (!base.startsWith(PREFIX)) return undefined;

	const path = readPath(base, PREFIX.length);
	if (!path || path.end !== base.length) return undefined;

	if (!path.accessor) return { at: 'accessor', table: path.table };
	if (path.ref) return { at: 'rowField', table: path.table };
	if (path.accessor === 'by') return { at: 'column', table: path.table };
	return undefined;
}
