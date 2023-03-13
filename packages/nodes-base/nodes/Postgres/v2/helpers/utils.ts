import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, ILoadOptionsFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import pgPromise from 'pg-promise';
import type {
	ColumnInfo,
	PgpClient,
	PgpDatabase,
	QueryMode,
	QueryValues,
	QueryWithValues,
	SortRule,
	WhereClause,
} from './interfaces';

export function getItemsCopy(
	items: INodeExecutionData[],
	properties: string[],
	guardedColumns?: { [key: string]: string },
): IDataObject[] {
	let newItem: IDataObject;
	return items.map((item) => {
		newItem = {};
		if (guardedColumns) {
			Object.keys(guardedColumns).forEach((column) => {
				newItem[column] = item.json[guardedColumns[column]];
			});
		} else {
			for (const property of properties) {
				newItem[property] = item.json[property];
			}
		}
		return newItem;
	});
}

export function getItemCopy(
	item: INodeExecutionData,
	properties: string[],
	guardedColumns?: { [key: string]: string },
): IDataObject {
	const newItem: IDataObject = {};
	if (guardedColumns) {
		Object.keys(guardedColumns).forEach((column) => {
			newItem[column] = item.json[guardedColumns[column]];
		});
	} else {
		for (const property of properties) {
			newItem[property] = item.json[property];
		}
	}
	return newItem;
}

export function generateReturning(pgp: PgpClient, returning: string): string {
	return (
		' RETURNING ' +
		returning
			.split(',')
			.map((returnedField) => pgp.as.name(returnedField.trim()))
			.join(', ')
	);
}

export function wrapData(data: IDataObject[]): INodeExecutionData[] {
	if (!Array.isArray(data)) {
		return [{ json: data }];
	}
	return data.map((item) => ({
		json: item,
	}));
}

export async function configurePostgres(this: IExecuteFunctions | ILoadOptionsFunctions) {
	const credentials = await this.getCredentials('postgres');
	const options = this.getNodeParameter('options', 0, {}) as IDataObject;

	const pgp = pgPromise();

	if (options.largeNumbersOutput === 'numbers') {
		pgp.pg.types.setTypeParser(20, (value: string) => {
			return parseInt(value, 10);
		});
		pgp.pg.types.setTypeParser(1700, (value: string) => {
			return parseFloat(value);
		});
	}

	const config: IDataObject = {
		host: credentials.host as string,
		port: credentials.port as number,
		database: credentials.database as string,
		user: credentials.user as string,
		password: credentials.password as string,
	};

	if (options.connectionTimeoutMillis) {
		config.connectionTimeoutMillis = options.connectionTimeoutMillis as number;
	}

	if (credentials.allowUnauthorizedCerts === true) {
		config.ssl = {
			rejectUnauthorized: false,
		};
	} else {
		config.ssl = !['disable', undefined].includes(credentials.ssl as string | undefined);
		config.sslmode = (credentials.ssl as string) || 'disable';
	}

	const db = pgp(config);
	return { db, pgp };
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

export function parsePostgresError(this: IExecuteFunctions, error: any, itemIndex?: number) {
	let message = error.message;
	const description = error.description ? error.description : error.detail || error.hint;

	if ((error?.message as string).includes('ECONNREFUSED')) {
		message = 'Connection refused';
	}

	return new NodeOperationError(this.getNode(), error as Error, {
		message,
		description,
		itemIndex,
	});
}

export function addWhereClauses(
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
	const values: string[] = [];

	clauses.forEach((clause, index) => {
		if (clause.condition === 'equal') {
			clause.condition = '=';
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

		const endWith = index === rules.length - 1 ? '' : ', ';

		orderByQuery += ` ${columnReplacement} ${rule.direction}${endWith}`;
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

export async function runQueries(
	this: IExecuteFunctions,
	pgp: PgpClient,
	db: PgpDatabase,
	queries: QueryWithValues[],
	items: INodeExecutionData[],
	options: IDataObject,
) {
	let returnData: INodeExecutionData[] = [];

	const queryBatching = (options.queryBatching as QueryMode) || 'multiple';

	if (queryBatching === 'multiple') {
		try {
			returnData = (await db.multi(pgp.helpers.concat(queries)))
				.map((result, i) => {
					return this.helpers.constructExecutionMetaData(wrapData(result as IDataObject[]), {
						itemData: { item: i },
					});
				})
				.flat();
			returnData = returnData.length ? returnData : [{ json: { success: true } }];
		} catch (err) {
			const error = parsePostgresError.call(this, err);
			if (!this.continueOnFail()) throw error;

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

					const executionData = this.helpers.constructExecutionMetaData(
						wrapData(transactionResult.length ? transactionResult : [{ success: true }]),
						{ itemData: { item: i } },
					);

					result.push(...executionData);
				} catch (err) {
					const error = parsePostgresError.call(this, err, i);
					if (!this.continueOnFail()) throw error;
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
					const transactionResult: IDataObject[] = await t.any(queries[i].query, queries[i].values);

					const executionData = this.helpers.constructExecutionMetaData(
						wrapData(transactionResult.length ? transactionResult : [{ success: true }]),
						{ itemData: { item: i } },
					);

					result.push(...executionData);
				} catch (err) {
					const error = parsePostgresError.call(this, err, i);
					if (!this.continueOnFail()) throw error;
					result.push(prepareErrorItem(items, error, i));
				}
			}
			return result;
		});
	}

	return returnData;
}

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
		acc[column as string] = value === '' ? null : value;
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
	this: IExecuteFunctions,
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
			throw new NodeOperationError(
				this.getNode(),
				`Column '${key}' does not exist in selected table`,
				{ itemIndex: index },
			);
		}
		if (item[key] === null && !(schema[key] as IDataObject)?.nullable) {
			throw new NodeOperationError(this.getNode(), `Column '${key}' is not nullable`, {
				itemIndex: index,
			});
		}
	}

	return item;
}
