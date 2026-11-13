import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

type SortRule = { column: string; direction: string };

const sameColumn = (a: string, b: string, caseInsensitive: boolean) =>
	caseInsensitive ? a.toLowerCase() === b.toLowerCase() : a === b;

export function getStartAfter(ctx: IExecuteFunctions, itemIndex: number) {
	const cursor = ((ctx.getNodeParameter('startAfter', itemIndex, {}) as IDataObject).values ??
		{}) as IDataObject;
	return {
		column: String(cursor.column ?? ''),
		value: typeof cursor.value === 'number' ? cursor.value : String(cursor.value ?? ''),
	};
}

export function assertUniqueCursorColumn(
	node: INode,
	itemIndex: number,
	uniqueColumns: string[],
	column: string,
	table: string,
	caseInsensitive = false,
) {
	if (!uniqueColumns.some((unique) => sameColumn(unique, column, caseInsensitive))) {
		throw new NodeOperationError(
			node,
			`Column "${column}" in table "${table}" is not unique. Start After needs a column with a single-column unique index or primary key`,
			{ itemIndex },
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
 * Appends the cursor column as the final sort key unless a Sort rule already
 * names it. The walk is only correct with no Sort rules, or with Sort = cursor
 * column ASC. The node does not guard this; the user owns the Sort rules.
 */
export function addCursorSortRule(
	sortRules: SortRule[],
	column: string,
	caseInsensitive = false,
): SortRule[] {
	return sortRules.some((rule) => sameColumn(rule.column, column, caseInsensitive))
		? sortRules
		: [...sortRules, { column, direction: 'ASC' }];
}
