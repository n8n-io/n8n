import { isRecord } from '@n8n/utils/is-record';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

type SortRule = { column: string; direction: string };
/** An empty `value` asks for the first page. */
type StartAfter = { column: string; value?: string };

const sameColumn = (a: string, b: string, caseInsensitive: boolean) =>
	caseInsensitive ? a.toLowerCase() === b.toLowerCase() : a === b;

export function getStartAfter(
	ctx: IExecuteFunctions,
	itemIndex: number,
	tooBigFix = 'In Options, set Output Large-Format Numbers As to Text.',
): StartAfter | undefined {
	const startAfter: unknown = ctx.getNodeParameter('startAfter.values', itemIndex, null);
	if (!isRecord(startAfter)) return undefined;

	const { column, value } = startAfter;
	if (typeof column !== 'string' || column === '') {
		throw new NodeOperationError(ctx.getNode(), 'Choose a column in Start After', {
			itemIndex,
			description: 'Start After needs a unique column, for example the primary key.',
		});
	}

	if (value === undefined || value === null || value === '') return { column };
	if (typeof value === 'object') {
		throw new NodeOperationError(ctx.getNode(), 'The Start After value must be text or a number', {
			itemIndex,
			description: `Use the value of "${column}" in the last row of the page before.`,
		});
	}
	if (typeof value === 'number' && Number.isInteger(value) && !Number.isSafeInteger(value)) {
		throw new NodeOperationError(ctx.getNode(), 'The Start After value is too big to be exact', {
			itemIndex,
			description:
				`n8n cannot keep all digits of a number above 9007199254740991, so the next page can skip rows. ${tooBigFix}`.trim(),
		});
	}

	// The value stays text, so the database casts it to the type of the column
	return { column, value: String(value) };
}

export function assertCursorColumnInOutput(
	node: INode,
	itemIndex: number,
	outputColumns: unknown,
	column: string,
	caseInsensitive = false,
) {
	// An expression can give Output Columns as one string.
	const selected: unknown[] = Array.isArray(outputColumns) ? outputColumns : [outputColumns];
	const hasColumn = selected.some(
		(name) =>
			name === '*' || (typeof name === 'string' && sameColumn(name, column, caseInsensitive)),
	);
	if (!hasColumn) {
		throw new NodeOperationError(node, `Add "${column}" to Output Columns`, {
			itemIndex,
			description: `Start After needs "${column}" in the output to get the next page.`,
		});
	}
}

export function assertUniqueCursorColumn(
	node: INode,
	itemIndex: number,
	uniqueColumns: string[],
	column: string,
	caseInsensitive = false,
) {
	if (!uniqueColumns.some((unique) => sameColumn(unique, column, caseInsensitive))) {
		throw new NodeOperationError(
			node,
			`Column "${column}" has no unique index that Start After can use`,
			{
				itemIndex,
				description:
					'Start After needs a primary key or a unique index on this column alone. A unique index on more than one column does not count. If values repeat, a page skips the rows that share the last value.',
			},
		);
	}
}

export function assertCursorColumnNotNull(
	node: INode,
	itemIndex: number,
	column: string,
	nullable: boolean,
) {
	if (nullable) {
		throw new NodeOperationError(node, `Column "${column}" can be null`, {
			itemIndex,
			description: `Start After needs a column that is never null. A null value never comes after another value, so no page returns the rows with null. Make "${column}" NOT NULL, or use another unique column, for example the primary key.`,
		});
	}
}

export function assertCursorColumnType(
	node: INode,
	itemIndex: number,
	column: string,
	type: string,
	supported: RegExp,
) {
	if (!supported.test(type)) {
		throw new NodeOperationError(
			node,
			`Start After does not support the column "${column}" of type ${type}`,
			{
				itemIndex,
				description:
					'n8n can change values of this type in the output, so the next page can repeat or skip rows. Use a unique column with numbers or text.',
			},
		);
	}
}

/**
 * Adds the cursor predicate to a query. `base` is the query before
 * addWhereClauses, which prepends ' WHERE '. The existing conditions are
 * wrapped so an OR chain stays grouped under the cursor AND.
 */
export function addCursorPredicate(base: string, query: string, predicate: string): string {
	const where = query.slice(base.length);
	return where
		? `${base} WHERE (${where.slice(' WHERE '.length)}) AND ${predicate}`
		: `${base} WHERE ${predicate}`;
}

/**
 * The cursor column must be the first sort key. A key before it changes the
 * order of the rows, so "after the last value" skips rows.
 */
export function getStartAfterSortRules(
	node: INode,
	itemIndex: number,
	sortRules: SortRule[],
	column: string,
	caseInsensitive = false,
): SortRule[] {
	if (sortRules.length === 0) return [{ column, direction: 'ASC' }];
	if (sameColumn(sortRules[0].column, column, caseInsensitive)) return sortRules;

	const fix = sortRules.some((rule) => sameColumn(rule.column, column, caseInsensitive))
		? `Move "${column}" to the top of Sort.`
		: `Add "${column}" as the first sort rule, or remove the other sort rules.`;

	throw new NodeOperationError(node, `Sort by "${column}" first`, {
		itemIndex,
		description: `Start After pages by "${column}", so "${column}" must be the first sort rule. ${fix}`,
	});
}
