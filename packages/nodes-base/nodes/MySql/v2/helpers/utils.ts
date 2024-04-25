import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	IPairedItemData,
	NodeExecutionWithMetadata,
} from 'n8n-workflow';

import { NodeOperationError } from 'n8n-workflow';

import { generatePairedItemData } from '../../../../utils/utilities';
import type {
	Mysql2Pool,
	QueryMode,
	QueryValues,
	QueryWithValues,
	SortRule,
	WhereClause,
} from './interfaces';

import { BATCH_MODE } from './interfaces';

export function escapeSqlIdentifier(identifier: string): string {
	const parts = identifier.match(/(`[^`]*`|[^.`]+)/g) ?? [];

	return parts
		.map((part) => {
			const trimmedPart = part.trim();

			if (trimmedPart.startsWith('`') && trimmedPart.endsWith('`')) {
				return trimmedPart;
			}

			return `\`${trimmedPart}\``;
		})
		.join('.');
}

export const prepareQueryAndReplacements = (rawQuery: string, replacements?: QueryValues) => {
	if (replacements === undefined) {
		return { query: rawQuery, values: [] };
	}
	// in UI for replacements we use syntax identical to Postgres Query Replacement, but we need to convert it to mysql2 replacement syntax
	let query: string = rawQuery;
	const values: QueryValues = [];

	const regex = /\$(\d+)(?::name)?/g;
	const matches = rawQuery.match(regex) || [];

	for (const match of matches) {
		if (match.includes(':name')) {
			const matchIndex = Number(match.replace('$', '').replace(':name', '')) - 1;
			query = query.replace(match, escapeSqlIdentifier(replacements[matchIndex].toString()));
		} else {
			const matchIndex = Number(match.replace('$', '')) - 1;
			query = query.replace(match, '?');
			values.push(replacements[matchIndex]);
		}
	}

	return { query, values };
};

export function prepareErrorItem(
	item: IDataObject,
	error: IDataObject | NodeOperationError | Error,
	index: number,
) {
	return {
		json: { message: error.message, item: { ...item }, itemIndex: index, error: { ...error } },
		pairedItem: { item: index },
	} as INodeExecutionData;
}

export function parseMySqlError(
	this: IExecuteFunctions,
	error: any,
	itemIndex = 0,
	queries?: string[],
) {
	let message: string = error.message;
	const description = `sql: ${error.sql}, code: ${error.code}`;

	if (
		queries?.length &&
		(message || '').toLowerCase().includes('you have an error in your sql syntax')
	) {
		let queryIndex = itemIndex;
		const failedStatement = ((message.split("near '")[1] || '').split("' at")[0] || '').split(
			';',
		)[0];

		if (failedStatement) {
			if (queryIndex === 0 && queries.length > 1) {
				const failedQueryIndex = queries.findIndex((query) => query.includes(failedStatement));
				if (failedQueryIndex !== -1) {
					queryIndex = failedQueryIndex;
				}
			}
			const lines = queries[queryIndex].split('\n');

			const failedLine = lines.findIndex((line) => line.includes(failedStatement));
			if (failedLine !== -1) {
				message = `You have an error in your SQL syntax on line ${
					failedLine + 1
				} near '${failedStatement}'`;
			}
		}
	}

	if ((error?.message as string).includes('ECONNREFUSED')) {
		message = 'Connection refused';
	}

	return new NodeOperationError(this.getNode(), error as Error, {
		message,
		description,
		itemIndex,
	});
}

export function wrapData(data: IDataObject | IDataObject[]): INodeExecutionData[] {
	if (!Array.isArray(data)) {
		return [{ json: data }];
	}
	return data.map((item) => ({
		json: item,
	}));
}

export function prepareOutput(
	response: IDataObject[],
	options: IDataObject,
	statements: string[],
	constructExecutionHelper: (
		inputData: INodeExecutionData[],
		options: {
			itemData: IPairedItemData | IPairedItemData[];
		},
	) => NodeExecutionWithMetadata[],
	itemData: IPairedItemData | IPairedItemData[],
) {
	const returnData: INodeExecutionData[] = [];

	if (options.detailedOutput) {
		response.forEach((entry, index) => {
			const item = {
				sql: statements[index],
				data: entry,
			};

			const executionData = constructExecutionHelper(wrapData(item), {
				itemData,
			});

			returnData.push(...executionData);
		});
	} else {
		response
			.filter((entry) => Array.isArray(entry))
			.forEach((entry, index) => {
				const executionData = constructExecutionHelper(wrapData(entry), {
					itemData: Array.isArray(itemData) ? itemData[index] : itemData,
				});

				returnData.push(...executionData);
			});
	}

	if (!returnData.length) {
		if ((options?.nodeVersion as number) < 2.2) {
			returnData.push({ json: { success: true }, pairedItem: itemData });
		} else {
			const isSelectQuery = statements
				.filter((statement) => !statement.startsWith('--'))
				.every((statement) =>
					statement
						.replace(/\/\*.*?\*\//g, '') // remove multiline comments
						.replace(/\n/g, '')
						.toLowerCase()
						.startsWith('select'),
				);

			if (!isSelectQuery) {
				returnData.push({ json: { success: true }, pairedItem: itemData });
			}
		}
	}

	return returnData;
}
const END_OF_STATEMENT = /;(?=(?:[^'\\]|'[^']*?'|\\[\s\S])*?$)/g;
export const splitQueryToStatements = (query: string, filterOutEmpty = true) => {
	const statements = query
		.replace(/\n/g, '')
		.split(END_OF_STATEMENT)
		.map((statement) => statement.trim());
	return filterOutEmpty ? statements.filter((statement) => statement !== '') : statements;
};

export function configureQueryRunner(
	this: IExecuteFunctions,
	options: IDataObject,
	pool: Mysql2Pool,
) {
	return async (queries: QueryWithValues[]) => {
		if (queries.length === 0) {
			return [];
		}

		const returnData: INodeExecutionData[] = [];
		const mode = (options.queryBatching as QueryMode) || BATCH_MODE.SINGLE;

		const connection = await pool.getConnection();

		if (mode === BATCH_MODE.SINGLE) {
			const formatedQueries = queries.map(({ query, values }) => connection.format(query, values));
			try {
				//releasing connection after formating queries, otherwise pool.query() will fail with timeout
				connection.release();

				let singleQuery = '';
				if (formatedQueries.length > 1) {
					singleQuery = formatedQueries.map((query) => query.trim().replace(/;$/, '')).join(';');
				} else {
					singleQuery = formatedQueries[0];
				}

				let response: IDataObject | IDataObject[] = (
					await pool.query(singleQuery)
				)[0] as unknown as IDataObject;

				if (!response) return [];

				let statements;
				if ((options?.nodeVersion as number) <= 2.3) {
					statements = singleQuery
						.replace(/\n/g, '')
						.split(';')
						.filter((statement) => statement !== '');
				} else {
					statements = splitQueryToStatements(singleQuery);
				}

				if (Array.isArray(response)) {
					if (statements.length === 1) response = [response];
				} else {
					response = [response];
				}

				//because single query is used in this mode mapping itemIndex not posible, setting all items as paired
				const pairedItem = generatePairedItemData(queries.length);

				returnData.push(
					...prepareOutput(
						response,
						options,
						statements,
						this.helpers.constructExecutionMetaData,
						pairedItem,
					),
				);
			} catch (err) {
				const error = parseMySqlError.call(this, err, 0, formatedQueries);

				if (!this.continueOnFail()) throw error;
				returnData.push({ json: { message: error.message, error: { ...error } } });
			}
		} else {
			if (mode === BATCH_MODE.INDEPENDENTLY) {
				let formatedQuery = '';
				for (const [index, queryWithValues] of queries.entries()) {
					try {
						const { query, values } = queryWithValues;
						formatedQuery = connection.format(query, values);

						let statements;
						if ((options?.nodeVersion as number) <= 2.3) {
							statements = formatedQuery.split(';').map((q) => q.trim());
						} else {
							statements = splitQueryToStatements(formatedQuery, false);
						}

						const responses: IDataObject[] = [];
						for (const statement of statements) {
							if (statement === '') continue;
							const response = (await connection.query(statement))[0] as unknown as IDataObject;

							responses.push(response);
						}

						returnData.push(
							...prepareOutput(
								responses,
								options,
								statements,
								this.helpers.constructExecutionMetaData,
								{ item: index },
							),
						);
					} catch (err) {
						const error = parseMySqlError.call(this, err, index, [formatedQuery]);

						if (!this.continueOnFail()) {
							connection.release();
							throw error;
						}
						returnData.push(prepareErrorItem(queries[index], error as Error, index));
					}
				}
			}

			if (mode === BATCH_MODE.TRANSACTION) {
				await connection.beginTransaction();

				let formatedQuery = '';
				for (const [index, queryWithValues] of queries.entries()) {
					try {
						const { query, values } = queryWithValues;
						formatedQuery = connection.format(query, values);

						let statements;
						if ((options?.nodeVersion as number) <= 2.3) {
							statements = formatedQuery.split(';').map((q) => q.trim());
						} else {
							statements = splitQueryToStatements(formatedQuery, false);
						}

						const responses: IDataObject[] = [];
						for (const statement of statements) {
							if (statement === '') continue;
							const response = (await connection.query(statement))[0] as unknown as IDataObject;

							responses.push(response);
						}

						returnData.push(
							...prepareOutput(
								responses,
								options,
								statements,
								this.helpers.constructExecutionMetaData,
								{ item: index },
							),
						);
					} catch (err) {
						const error = parseMySqlError.call(this, err, index, [formatedQuery]);

						if (connection) {
							await connection.rollback();
							connection.release();
						}

						if (!this.continueOnFail()) throw error;
						returnData.push(prepareErrorItem(queries[index], error as Error, index));

						// Return here because we already rolled back the transaction
						return returnData;
					}
				}

				await connection.commit();
			}

			connection.release();
		}

		return returnData;
	};
}

export function addWhereClauses(
	node: INode,
	itemIndex: number,
	query: string,
	clauses: WhereClause[],
	replacements: QueryValues,
	combineConditions?: string,
): [string, QueryValues] {
	if (clauses.length === 0) return [query, replacements];

	let combineWith = 'AND';

	if (combineConditions === 'OR') {
		combineWith = 'OR';
	}

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

		let valueReplacement = ' ';
		if (clause.condition !== 'IS NULL') {
			valueReplacement = ' ?';
			values.push(clause.value);
		}

		const operator = index === clauses.length - 1 ? '' : ` ${combineWith}`;

		whereQuery += ` ${escapeSqlIdentifier(clause.column)} ${
			clause.condition
		}${valueReplacement}${operator}`;
	});

	return [`${query}${whereQuery}`, replacements.concat(...values)];
}

export function addSortRules(
	query: string,
	rules: SortRule[],
	replacements: QueryValues,
): [string, QueryValues] {
	if (rules.length === 0) return [query, replacements];

	let orderByQuery = ' ORDER BY';
	const values: string[] = [];

	rules.forEach((rule, index) => {
		const endWith = index === rules.length - 1 ? '' : ',';

		orderByQuery += ` ${escapeSqlIdentifier(rule.column)} ${rule.direction}${endWith}`;
	});

	return [`${query}${orderByQuery}`, replacements.concat(...values)];
}

export function replaceEmptyStringsByNulls(
	items: INodeExecutionData[],
	replace?: boolean,
): INodeExecutionData[] {
	if (!replace) return [...items];

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
