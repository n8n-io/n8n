import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import { createConnection } from '../transport';
import type { QueryMode, QueryWithValues } from './interfaces';

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

export const prepareQueryAndReplacements = (query: string, replacements?: IDataObject[]) => {
	if (replacements === undefined) {
		return { newQuery: query, newValues: [] };
	}
	// in UI for replacements we use syntax identical to Postgres Query Replacement, but we need to convert it to mysql2 replacement syntax
	let newQuery: string = query;
	const newValues: IDataObject[] = [];

	const regex = /\$(\d+)(?::name)?/g;
	const matches = query.match(regex) || [];

	for (const match of matches) {
		if (match.includes(':name')) {
			const matchIndex = Number(match.replace('$', '').replace(':name', '')) - 1;
			newQuery = newQuery.replace(match, `\`${replacements[matchIndex]}\``);
		} else {
			const matchIndex = Number(match.replace('$', '')) - 1;
			newQuery = newQuery.replace(match, '?');
			newValues.push(replacements[matchIndex]);
		}
	}

	return { newQuery, newValues };
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
	const returnData: INodeExecutionData[] = [];
	const mode = options.queryBatching as QueryMode;

	const credentials = await this.getCredentials('mySql');
	const connection = await createConnection(credentials, options);

	if (mode === 'multiple') {
		try {
			const { query, values } = queries[0];
			const formatedQuery = connection.format(query, values);
			const response = (await connection.query(formatedQuery))[0] as unknown as IDataObject;

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(response),
				{ itemData: { item: 0 } },
			);

			returnData.push(...executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message } });
			} else {
				await connection.end();
				throw error;
			}
		}
	}

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

	return returnData;
}
