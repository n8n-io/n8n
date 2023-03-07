import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import { createConnection, createPool } from '../transport';
import type { QueryMode, QueryValues, QueryWithValues, SortRule, WhereClause } from './interfaces';

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

export const prepareQueryAndReplacements = (rawQuery: string, replacements?: IDataObject[]) => {
	if (replacements === undefined) {
		return { query: rawQuery, values: [] };
	}
	// in UI for replacements we use syntax identical to Postgres Query Replacement, but we need to convert it to mysql2 replacement syntax
	let query: string = rawQuery;
	const values: IDataObject[] = [];

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

// export function addReturning(
// 	query: string,
// 	outputColumns: string[],
// 	replacements: IDataObject[],
// ): [string, IDataObject[]] {
// 	if (outputColumns.includes('*')) return [`${query} RETURNING *`, replacements];

// 	const escapedColumns = outputColumns.map((column) => `\`${column}\``).join(', ');

// 	return [
// 		`${query} RETURNING ${escapedColumns}`,
// 		[...replacements, ...(outputColumns as unknown as IDataObject[])],
// 	];
// }

export async function runQueries(
	this: IExecuteFunctions,
	queries: QueryWithValues[],
	options: IDataObject,
) {
	if (queries.length === 0) {
		return [];
	}

	const returnData: INodeExecutionData[] = [];
	const mode = (options.queryBatching as QueryMode) || 'multiple';

	const credentials = await this.getCredentials('mySql');

	if (mode === 'multiple') {
		const pool = await createPool(credentials, options);
		const poolConnection = await pool.getConnection();

		try {
			const formatedQueries = queries.map(({ query, values }) =>
				poolConnection.format(query, values),
			);

			let singleQuery = '';

			if (formatedQueries.length > 1) {
				singleQuery = formatedQueries
					.join(';')
					.split(';')
					.map((query) => query.trim())
					.filter((q) => q !== '')
					.join(';');
			} else {
				singleQuery = formatedQueries[0];
			}

			const response = (await pool.query(singleQuery))[0] as unknown as IDataObject[][];

			if (response && Array.isArray(response)) {
				response.forEach((entry, index) => {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(entry),
						{ itemData: { item: index } },
					);

					returnData.push(...executionData);
				});
			} else {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(response),
					{ itemData: { item: 0 } },
				);

				returnData.push(...executionData);
			}
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message } });
			} else {
				throw error;
			}
		} finally {
			poolConnection.release();
			await pool.end();
		}
	} else {
		const connection = await createConnection(credentials, options);

		if (mode === 'independently') {
			for (const [index, queryWithValues] of queries.entries()) {
				try {
					const { query, values } = queryWithValues;
					const formatedQuery = connection.format(query, values);
					const response = (await connection.query(formatedQuery))[0] as unknown as IDataObject;

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(response),
						{ itemData: { item: index } },
					);

					returnData.push(...executionData);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ json: { error: error.message } });
						continue;
					} else {
						await connection.end();
						throw error;
					}
				}
			}
		}

		if (mode === 'transaction') {
			await connection.beginTransaction();

			for (const [index, queryWithValues] of queries.entries()) {
				try {
					const { query, values } = queryWithValues;
					const formatedQuery = connection.format(query, values);
					const response = (await connection.query(formatedQuery))[0] as unknown as IDataObject;

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(response),
						{ itemData: { item: index } },
					);

					returnData.push(...executionData);
				} catch (error) {
					if (connection) {
						await connection.rollback();
						await connection.end();
					}

					if (this.continueOnFail()) {
						returnData.push({ json: { error: error.message } });
						return returnData;
					} else {
						throw error;
					}
				}
			}

			await connection.commit();
		}

		await connection.end();
	}

	return returnData;
}

export function addWhereClauses(
	query: string,
	clauses: WhereClause[],
	replacements: QueryValues,
): [string, QueryValues] {
	if (clauses.length === 0) return [query, replacements];

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

		const operator = index === clauses.length - 1 ? '' : ' AND';

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
		const endWith = index === rules.length - 1 ? '' : ', ';

		orderByQuery += ` \`${rule.column}\` ${rule.direction}${endWith}`;
	});

	return [`${query}${orderByQuery}`, replacements.concat(...values)];
}
