import type { IDataObject, INode, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type {
	ColumnInfo,
	ConstructExecutionMetaData,
	PgpClient,
	PgpDatabase,
	QueryMode,
	QueryValues,
	QueryWithValues,
	SortRule,
	WhereClause,
} from './interfaces';

export function wrapData(data: IDataObject | IDataObject[]): INodeExecutionData[] {
	if (!Array.isArray(data)) {
		return [{ json: data }];
	}
	return data.map((item) => ({
		json: item,
	}));
}

export function prepareErrorItem(
	items: INodeExecutionData[],
	error: IDataObject | NodeOperationError | Error,
	index: number,
) {
	return {
		json: { message: error.message, item: { ...items[index].json }, error: { ...error } },
		pairedItem: { item: index },
	} as INodeExecutionData;
}

export function parsePostgresError(
	node: INode,
	error: any,
	queries: QueryWithValues[],
	itemIndex?: number,
) {
	if (error.message.includes('syntax error at or near') && queries.length) {
		try {
			const snippet = error.message.match(/syntax error at or near "(.*)"/)[1] as string;
			const failedQureryIndex = queries.findIndex((query) => query.query.includes(snippet));

			if (failedQureryIndex !== -1) {
				if (!itemIndex) {
					itemIndex = failedQureryIndex;
				}
				const failedQuery = queries[failedQureryIndex].query;
				const lines = failedQuery.split('\n');
				const lineIndex = lines.findIndex((line) => line.includes(snippet));
				const errorMessage = `Syntax error at line ${lineIndex + 1} near "${snippet}"`;
				error.message = errorMessage;
			}
		} catch {}
	}

	let message = error.message;
	const errorDescription = error.description ? error.description : error.detail || error.hint;
	let description = errorDescription;

	if (!description && queries[itemIndex || 0]?.query) {
		description = `Failed query: ${queries[itemIndex || 0].query}`;
	}

	if (error.message.includes('ECONNREFUSED')) {
		message = 'Connection refused';
		try {
			description = error.message.split('ECONNREFUSED ')[1].trim();
		} catch (e) {}
	}

	if (error.message.includes('ENOTFOUND')) {
		message = 'Host not found';
		try {
			description = error.message.split('ENOTFOUND ')[1].trim();
		} catch (e) {}
	}

	if (error.message.includes('ETIMEDOUT')) {
		message = 'Connection timed out';
		try {
			description = error.message.split('ETIMEDOUT ')[1].trim();
		} catch (e) {}
	}

	return new NodeOperationError(node, error as Error, {
		message,
		description,
		itemIndex,
	});
}

export function addWhereClauses(
	node: INode,
	itemIndex: number,
	query: string,
	clauses: WhereClause[],
	replacements: QueryValues,
	combineConditions: string,
): [string, QueryValues] {
	if (clauses.length === 0) return [query, replacements];

	let combineWith = 'AND';

	if (combineConditions === 'OR') {
		combineWith = 'OR';
	}

	let replacementIndex = replacements.length + 1;

	let whereQuery = ' WHERE';
	const values: QueryValues = [];

	clauses.forEach((clause, index) => {
		if (clause.condition === 'equal') {
			clause.condition = '=';
		}
		if (['>', '<', '>=', '<='].includes(clause.condition)) {
			const value = Number(clause.value);

			if (Number.isNaN(value)) {
				throw new NodeOperationError(
					node,
					`Operator in entry ${index + 1} of 'Select Rows' works with numbers, but value ${
						clause.value
					} is not a number`,
					{
						itemIndex,
					},
				);
			}

			clause.value = value;
		}
		const columnReplacement = `$${replacementIndex}:name`;
		values.push(clause.column);
		replacementIndex = replacementIndex + 1;

		let valueReplacement = '';
		if (clause.condition !== 'IS NULL') {
			valueReplacement = ` $${replacementIndex}`;
			values.push(clause.value);
			replacementIndex = replacementIndex + 1;
		}

		const operator = index === clauses.length - 1 ? '' : ` ${combineWith}`;

		whereQuery += ` ${columnReplacement} ${clause.condition}${valueReplacement}${operator}`;
	});

	return [`${query}${whereQuery}`, replacements.concat(...values)];
}

export function addSortRules(
	query: string,
	rules: SortRule[],
	replacements: QueryValues,
): [string, QueryValues] {
	if (rules.length === 0) return [query, replacements];

	let replacementIndex = replacements.length + 1;

	let orderByQuery = ' ORDER BY';
	const values: string[] = [];

	rules.forEach((rule, index) => {
		const columnReplacement = `$${replacementIndex}:name`;
		values.push(rule.column);
		replacementIndex = replacementIndex + 1;

		const endWith = index === rules.length - 1 ? '' : ',';

		const sortDirection = rule.direction === 'DESC' ? 'DESC' : 'ASC';

		orderByQuery += ` ${columnReplacement} ${sortDirection}${endWith}`;
	});

	return [`${query}${orderByQuery}`, replacements.concat(...values)];
}

export function addReturning(
	query: string,
	outputColumns: string[],
	replacements: QueryValues,
): [string, QueryValues] {
	if (outputColumns.includes('*')) return [`${query} RETURNING *`, replacements];

	const replacementIndex = replacements.length + 1;

	return [`${query} RETURNING $${replacementIndex}:name`, [...replacements, outputColumns]];
}

export const configureQueryRunner =
	(
		node: INode,
		constructExecutionMetaData: ConstructExecutionMetaData,
		continueOnFail: boolean,
		pgp: PgpClient,
		db: PgpDatabase,
	) =>
	async (queries: QueryWithValues[], items: INodeExecutionData[], options: IDataObject) => {
		let returnData: INodeExecutionData[] = [];

		const queryBatching = (options.queryBatching as QueryMode) || 'single';

		if (queryBatching === 'single') {
			try {
				returnData = (await db.multi(pgp.helpers.concat(queries)))
					.map((result, i) => {
						return constructExecutionMetaData(wrapData(result as IDataObject[]), {
							itemData: { item: i },
						});
					})
					.flat();
				returnData = returnData.length ? returnData : [{ json: { success: true } }];
			} catch (err) {
				const error = parsePostgresError(node, err, queries);
				if (!continueOnFail) throw error;

				return [
					{
						json: {
							message: error.message,
							error: { ...error },
						},
					},
				];
			}
		}

		if (queryBatching === 'transaction') {
			returnData = await db.tx(async (transaction) => {
				const result: INodeExecutionData[] = [];
				for (let i = 0; i < queries.length; i++) {
					try {
						const transactionResult: IDataObject[] = await transaction.any(
							queries[i].query,
							queries[i].values,
						);

						const executionData = constructExecutionMetaData(
							wrapData(transactionResult.length ? transactionResult : [{ success: true }]),
							{ itemData: { item: i } },
						);

						result.push(...executionData);
					} catch (err) {
						const error = parsePostgresError(node, err, queries, i);
						if (!continueOnFail) throw error;
						result.push(prepareErrorItem(items, error, i));
						return result;
					}
				}
				return result;
			});
		}

		if (queryBatching === 'independently') {
			returnData = await db.task(async (t) => {
				const result: INodeExecutionData[] = [];
				for (let i = 0; i < queries.length; i++) {
					try {
						const transactionResult: IDataObject[] = await t.any(
							queries[i].query,
							queries[i].values,
						);

						const executionData = constructExecutionMetaData(
							wrapData(transactionResult.length ? transactionResult : [{ success: true }]),
							{ itemData: { item: i } },
						);

						result.push(...executionData);
					} catch (err) {
						const error = parsePostgresError(node, err, queries, i);
						if (!continueOnFail) throw error;
						result.push(prepareErrorItem(items, error, i));
					}
				}
				return result;
			});
		}

		return returnData;
	};

export function replaceEmptyStringsByNulls(
	items: INodeExecutionData[],
	replace?: boolean,
): INodeExecutionData[] {
	if (!replace) return items;

	const returnData: INodeExecutionData[] = items.map((item) => {
		const newItem = { ...item };
		const keys = Object.keys(newItem.json);

		for (const key of keys) {
			if (newItem.json[key] === '') {
				newItem.json[key] = null;
			}
		}

		return newItem;
	});

	return returnData;
}

export function prepareItem(values: IDataObject[]) {
	const item = values.reduce((acc, { column, value }) => {
		acc[column as string] = value;
		return acc;
	}, {} as IDataObject);

	return item;
}

export async function getTableSchema(
	db: PgpDatabase,
	schema: string,
	table: string,
): Promise<ColumnInfo[]> {
	const columns = await db.any(
		'SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
		[schema, table],
	);

	return columns;
}

export function checkItemAgainstSchema(
	node: INode,
	item: IDataObject,
	columnsInfo: ColumnInfo[],
	index: number,
) {
	if (columnsInfo.length === 0) return item;
	const schema = columnsInfo.reduce((acc, { column_name, data_type, is_nullable }) => {
		acc[column_name] = { type: data_type.toUpperCase(), nullable: is_nullable === 'YES' };
		return acc;
	}, {} as IDataObject);

	for (const key of Object.keys(item)) {
		if (schema[key] === undefined) {
			throw new NodeOperationError(node, `Column '${key}' does not exist in selected table`, {
				itemIndex: index,
			});
		}
		if (item[key] === null && !(schema[key] as IDataObject)?.nullable) {
			throw new NodeOperationError(node, `Column '${key}' is not nullable`, {
				itemIndex: index,
			});
		}
	}

	return item;
}
