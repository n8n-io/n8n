import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError, deepCopy } from 'n8n-workflow';

import type {
	Mysql2Pool,
	QueryMode,
	QueryValues,
	QueryWithValues,
	SortRule,
	WhereClause,
} from './interfaces';

export function copyInputItems(items: INodeExecutionData[], properties: string[]): IDataObject[] {
	// Prepare the data to insert and copy it to be returned
	let newItem: IDataObject;
	return items.map((item) => {
		newItem = {};
		for (const property of properties) {
			if (item.json[property] === undefined) {
				newItem[property] = null;
			} else {
				newItem[property] = deepCopy(item.json[property]);
			}
		}
		return newItem;
	});
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
			query = query.replace(match, `\`${replacements[matchIndex]}\``);
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

export function parseMySqlError(this: IExecuteFunctions, error: any, itemIndex?: number) {
	let message = error.message;
	const description = `sql: ${error.sql}, code: ${error.code}`;

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

export async function runQueries(
	this: IExecuteFunctions,
	queries: QueryWithValues[],
	options: IDataObject,
	pool: Mysql2Pool,
) {
	if (queries.length === 0) {
		return [];
	}

	const returnData: INodeExecutionData[] = [];
	const mode = (options.queryBatching as QueryMode) || 'multiple';

	const connection = await pool.getConnection();

	if (mode === 'multiple') {
		try {
			const formatedQueries = queries.map(({ query, values }) => connection.format(query, values));

			let singleQuery = '';

			if (formatedQueries.length > 1) {
				singleQuery = formatedQueries.map((query) => query.trim().replace(/;$/, '')).join(';');
			} else {
				singleQuery = formatedQueries[0];
			}

			const response = (await pool.query(singleQuery))[0] as unknown as IDataObject[][];

			if (response && Array.isArray(response)) {
				response.forEach((entry, index) => {
					const executionData = this.helpers.constructExecutionMetaData(wrapData(entry), {
						itemData: { item: index },
					});

					returnData.push(...executionData);
				});
			} else {
				const executionData = this.helpers.constructExecutionMetaData(wrapData(response), {
					itemData: { item: 0 },
				});

				returnData.push(...executionData);
			}
		} catch (err) {
			const error = parseMySqlError.call(this, err);

			if (!this.continueOnFail()) throw error;
			returnData.push({ json: { message: error.message, error: { ...error } } });
		} finally {
			connection.release();
		}
	} else {
		if (mode === 'independently') {
			for (const [index, queryWithValues] of queries.entries()) {
				try {
					const { query, values } = queryWithValues;
					const formatedQuery = connection.format(query, values);
					const statements = formatedQuery.split(';').map((q) => q.trim());

					for (const statement of statements) {
						if (statement === '') continue;
						const response = (await connection.query(statement))[0] as unknown as IDataObject;

						const executionData = this.helpers.constructExecutionMetaData(wrapData(response), {
							itemData: { item: index },
						});

						returnData.push(...executionData);
					}
				} catch (err) {
					const error = parseMySqlError.call(this, err, index);

					if (!this.continueOnFail()) {
						connection.release();
						throw error;
					}
					returnData.push(prepareErrorItem(queries[index], error as Error, index));
				}
			}
		}

		if (mode === 'transaction') {
			await connection.beginTransaction();

			for (const [index, queryWithValues] of queries.entries()) {
				try {
					const { query, values } = queryWithValues;
					const formatedQuery = connection.format(query, values);
					const statements = formatedQuery.split(';').map((q) => q.trim());

					for (const statement of statements) {
						if (statement === '') continue;
						const response = (await connection.query(statement))[0] as unknown as IDataObject;

						const executionData = this.helpers.constructExecutionMetaData(wrapData(response), {
							itemData: { item: index },
						});

						returnData.push(...executionData);
					}
				} catch (err) {
					const error = parseMySqlError.call(this, err, index);

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
}

export function addWhereClauses(
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
	const values: string[] = [];

	clauses.forEach((clause, index) => {
		if (clause.condition === 'equal') {
			clause.condition = '=';
		}

		let valueReplacement = ' ';
		if (clause.condition !== 'IS NULL') {
			valueReplacement = ' ?';
			values.push(clause.value);
		}

		const operator = index === clauses.length - 1 ? '' : ` ${combineWith}`;

		whereQuery += ` \`${clause.column}\` ${clause.condition}${valueReplacement}${operator}`;
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

		orderByQuery += ` \`${rule.column}\` ${rule.direction}${endWith}`;
	});

	return [`${query}${orderByQuery}`, replacements.concat(...values)];
}
