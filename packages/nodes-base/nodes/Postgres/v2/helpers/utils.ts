import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodePropertyOptions,
	NodeParameterValueType,
} from 'n8n-workflow';
import { NodeOperationError, jsonParse } from 'n8n-workflow';

import type {
	ColumnInfo,
	EnumInfo,
	PgpClient,
	PgpDatabase,
	QueryMode,
	QueryValues,
	QueryWithValues,
	SortRule,
	WhereClause,
} from './interfaces';
import { generatePairedItemData } from '../../../../utils/utilities';

export function isJSON(str: string) {
	try {
		JSON.parse(str.trim());
		return true;
	} catch {
		return false;
	}
}

export function evaluateExpression(expression: NodeParameterValueType) {
	if (expression === undefined) {
		return '';
	} else if (expression === null) {
		return 'null';
	} else {
		return typeof expression === 'object' ? JSON.stringify(expression) : expression.toString();
	}
}

export function stringToArray(str: NodeParameterValueType | undefined) {
	if (str === undefined) return [];
	return String(str)
		.split(',')
		.filter((entry) => entry)
		.map((entry) => entry.trim());
}

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
		if (clause.condition !== 'IS NULL' && clause.condition !== 'IS NOT NULL') {
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

const isSelectQuery = (query: string) => {
	return query
		.replace(/\/\*.*?\*\//g, '') // remove multiline comments
		.replace(/\n/g, '')
		.split(';')
		.filter((statement) => statement && !statement.startsWith('--')) // remove comments and empty statements
		.every((statement) => statement.trim().toLowerCase().startsWith('select'));
};

export function configureQueryRunner(
	this: IExecuteFunctions,
	node: INode,
	continueOnFail: boolean,
	pgp: PgpClient,
	db: PgpDatabase,
) {
	return async (queries: QueryWithValues[], items: INodeExecutionData[], options: IDataObject) => {
		let returnData: INodeExecutionData[] = [];
		const emptyReturnData: INodeExecutionData[] =
			options.operation === 'select' ? [] : [{ json: { success: true } }];

		const queryBatching = (options.queryBatching as QueryMode) || 'single';

		if (queryBatching === 'single') {
			try {
				returnData = (await db.multi(pgp.helpers.concat(queries)))
					.map((result, i) => {
						return this.helpers.constructExecutionMetaData(wrapData(result as IDataObject[]), {
							itemData: { item: i },
						});
					})
					.flat();

				if (!returnData.length) {
					const pairedItem = generatePairedItemData(queries.length);

					if ((options?.nodeVersion as number) < 2.3) {
						if (emptyReturnData.length) {
							emptyReturnData[0].pairedItem = pairedItem;
						}
						returnData = emptyReturnData;
					} else {
						returnData = queries.every((query) => isSelectQuery(query.query))
							? []
							: [{ json: { success: true }, pairedItem }];
					}
				}
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
						const query = queries[i].query;
						const values = queries[i].values;

						let transactionResults;
						if ((options?.nodeVersion as number) < 2.3) {
							transactionResults = await transaction.any(query, values);
						} else {
							transactionResults = (await transaction.multi(query, values)).flat();
						}

						if (!transactionResults.length) {
							if ((options?.nodeVersion as number) < 2.3) {
								transactionResults = emptyReturnData;
							} else {
								transactionResults = isSelectQuery(query) ? [] : [{ success: true }];
							}
						}

						const executionData = this.helpers.constructExecutionMetaData(
							wrapData(transactionResults),
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
			returnData = await db.task(async (task) => {
				const result: INodeExecutionData[] = [];
				for (let i = 0; i < queries.length; i++) {
					try {
						const query = queries[i].query;
						const values = queries[i].values;

						let transactionResults;
						if ((options?.nodeVersion as number) < 2.3) {
							transactionResults = await task.any(query, values);
						} else {
							transactionResults = (await task.multi(query, values)).flat();
						}

						if (!transactionResults.length) {
							if ((options?.nodeVersion as number) < 2.3) {
								transactionResults = emptyReturnData;
							} else {
								transactionResults = isSelectQuery(query) ? [] : [{ success: true }];
							}
						}

						const executionData = this.helpers.constructExecutionMetaData(
							wrapData(transactionResults),
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
		acc[column as string] = value;
		return acc;
	}, {} as IDataObject);

	return item;
}

export function hasJsonDataTypeInSchema(schema: ColumnInfo[]) {
	return schema.some(({ data_type }) => data_type === 'json');
}

export function convertValuesToJsonWithPgp(
	pgp: PgpClient,
	schema: ColumnInfo[],
	values: IDataObject,
) {
	schema
		.filter(
			({ data_type, column_name }) =>
				data_type === 'json' && values[column_name] !== null && values[column_name] !== undefined,
		)
		.forEach(({ column_name }) => {
			values[column_name] = pgp.as.json(values[column_name], true);
		});

	return values;
}

export async function columnFeatureSupport(
	db: PgpDatabase,
): Promise<{ identity_generation: boolean; is_generated: boolean }> {
	const result = await db.any(
		`SELECT EXISTS (
			SELECT 1 FROM information_schema.columns WHERE table_name = 'columns' AND table_schema = 'information_schema' AND column_name = 'is_generated'
		) as is_generated,
		EXISTS (
			SELECT 1 FROM information_schema.columns WHERE table_name = 'columns' AND table_schema = 'information_schema' AND column_name = 'identity_generation'
		) as identity_generation;`,
	);

	return result[0];
}

export async function getTableSchema(
	db: PgpDatabase,
	schema: string,
	table: string,
	options?: { getColumnsForResourceMapper?: boolean },
): Promise<ColumnInfo[]> {
	const select = ['column_name', 'data_type', 'is_nullable', 'udt_name', 'column_default'];

	if (options?.getColumnsForResourceMapper) {
		// Check if columns exist before querying (identity_generation was added in v10, is_generated in v12)
		const supported = await columnFeatureSupport(db);

		if (supported.identity_generation) {
			select.push('identity_generation');
		}

		if (supported.is_generated) {
			select.push('is_generated');
		}
	}

	const selectString = select.join(', ');
	const columns = await db.any(
		`SELECT ${selectString} FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2`,
		[schema, table],
	);

	return columns;
}

export async function uniqueColumns(db: PgpDatabase, table: string, schema = 'public') {
	// Using the modified query from https://wiki.postgresql.org/wiki/Retrieve_primary_key_columns
	// `quote_ident` - properly quote and escape an identifier
	// `::regclass` - cast a string to a regclass (internal type for object names)
	const unique = await db.any(
		`
		SELECT DISTINCT a.attname
			FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
		WHERE i.indrelid = (quote_ident($1) || '.' || quote_ident($2))::regclass
			AND (i.indisprimary OR i.indisunique);
		`,
		[schema, table],
	);
	return unique as IDataObject[];
}

export async function getEnums(db: PgpDatabase): Promise<EnumInfo[]> {
	const enumsData = await db.any(
		'SELECT pg_type.typname, pg_enum.enumlabel FROM pg_type JOIN pg_enum ON pg_enum.enumtypid = pg_type.oid;',
	);
	return enumsData as EnumInfo[];
}

export function getEnumValues(enumInfo: EnumInfo[], enumName: string): INodePropertyOptions[] {
	return enumInfo.reduce((acc, current) => {
		if (current.typname === enumName) {
			acc.push({ name: current.enumlabel, value: current.enumlabel });
		}
		return acc;
	}, [] as INodePropertyOptions[]);
}

export async function doesRowExist(
	db: PgpDatabase,
	schema: string,
	table: string,
	values: string[],
): Promise<boolean> {
	const where = [];
	for (let i = 3; i < 3 + values.length; i += 2) {
		where.push(`$${i}:name=$${i + 1}`);
	}
	const exists = await db.any(
		`SELECT EXISTS(SELECT 1 FROM $1:name.$2:name WHERE ${where.join(' AND ')})`,
		[schema, table, ...values],
	);
	return exists[0].exists;
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

export const configureTableSchemaUpdater = (initialSchema: string, initialTable: string) => {
	let currentSchema = initialSchema;
	let currentTable = initialTable;
	return async (db: PgpDatabase, tableSchema: ColumnInfo[], schema: string, table: string) => {
		if (currentSchema !== schema || currentTable !== table) {
			currentSchema = schema;
			currentTable = table;
			tableSchema = await getTableSchema(db, schema, table);
		}
		return tableSchema;
	};
};

/**
 * If postgress column type is array we need to convert it to fornmat that postgres understands, original object data would be modified
 * @param data the object with keys representing column names and values
 * @param schema table schema
 * @param node INode
 * @param itemIndex the index of the current item
 */
export const convertArraysToPostgresFormat = (
	data: IDataObject,
	schema: ColumnInfo[],
	node: INode,
	itemIndex = 0,
) => {
	for (const columnInfo of schema) {
		//in case column type is array we need to convert it to fornmat that postgres understands
		if (columnInfo.data_type.toUpperCase() === 'ARRAY') {
			let columnValue = data[columnInfo.column_name];

			if (typeof columnValue === 'string') {
				columnValue = jsonParse(columnValue);
			}

			if (Array.isArray(columnValue)) {
				const arrayEntries = columnValue.map((entry) => {
					if (typeof entry === 'number') {
						return entry;
					}

					if (typeof entry === 'boolean') {
						entry = String(entry);
					}

					if (typeof entry === 'object') {
						entry = JSON.stringify(entry);
					}

					if (typeof entry === 'string') {
						return `"${entry.replace(/"/g, '\\"')}"`; //escape double quotes
					}

					return entry;
				});

				//wrap in {} instead of [] as postgres does and join with ,
				data[columnInfo.column_name] = `{${arrayEntries.join(',')}}`;
			} else {
				if (columnInfo.is_nullable === 'NO') {
					throw new NodeOperationError(
						node,
						`Column '${columnInfo.column_name}' has to be an array`,
						{
							itemIndex,
						},
					);
				}
			}
		}
	}
};

export function addExecutionHints(
	context: IExecuteFunctions,
	items: INodeExecutionData[],
	operation: string,
	executeOnce: boolean | undefined,
) {
	if (operation === 'select' && items.length > 1 && !executeOnce) {
		context.addExecutionHints({
			message: `This node ran ${items.length} times, once for each input item. To run for the first item only, enable 'execute once' in the node settings`,
			location: 'outputPane',
		});
	}

	if (
		operation === 'executeQuery' &&
		items.length > 1 &&
		(context.getNodeParameter('options.queryBatching', 0, 'single') as string) === 'single' &&
		(context.getNodeParameter('query', 0, '') as string).toLowerCase().startsWith('insert')
	) {
		context.addExecutionHints({
			message:
				"Inserts were batched for performance. If you need to preserve item matching, consider changing 'Query batching' to 'Independent' in the options.",
			location: 'outputPane',
		});
	}
}
