import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
// import type { Mysql2OkPacket } from '../../helpers/interfaces';
import { prepareQueryAndReplacements } from '../../helpers/utils';
import { createConnection, createPool } from '../../transport';
import { optionsCollection } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		placeholder: 'SELECT id, name FROM product WHERE id < 40',
		required: true,
		description: 'The SQL query to execute',
	},
	{
		displayName: `
		To use query parameters in your SQL query, reference them as $1, $2, $3, etc in the corresponding order. <a href="https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/#use-query-parameters">More info</a>.
		`,
		name: 'notice',
		type: 'notice',
		default: '',
	},
	optionsCollection,
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['executeQuery'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	let returnData: INodeExecutionData[] = [];
	const items = this.getInputData();

	const credentials = await this.getCredentials('mySql');

	const nodeOptions = this.getNodeParameter('options', 0);
	const queryBatching = (nodeOptions.queryBatching as string) || 'multiple';

	if (queryBatching === 'multiple') {
		const pool = await createPool(credentials, nodeOptions);
		const connection = await pool.getConnection();

		try {
			const queries = items.map((_item, index) => {
				//Trim the query and remove the semicolon at the end, overwise the query will fail when joined by the semicolon
				const rawQuery = (this.getNodeParameter('query', index) as string).trim().replace(/;$/, '');
				const options = this.getNodeParameter('options', index, {});

				let values = (options.queryReplacement as IDataObject)?.values as IDataObject[];

				if (values) {
					values = values.map((entry) => entry.value as IDataObject);
				}

				const { newQuery, newValues } = prepareQueryAndReplacements(rawQuery, values);

				const formattedQuery = connection.format(newQuery, newValues);

				return formattedQuery;
			});

			const response = (await pool.query(queries.join(';')))[0] as unknown as IDataObject[][];

			if (response) {
				response.forEach((entry) => {
					returnData.push(...this.helpers.returnJsonArray(entry));
				});
			}
		} catch (error) {
			if (this.continueOnFail()) {
				returnData = this.helpers.returnJsonArray([{ json: { error: error.message } }]);
			} else {
				connection.release();
				await pool.end();
				throw error;
			}
		}

		connection.release();
		await pool.end();
	}

	if (queryBatching === 'independently') {
		const connection = await createConnection(credentials, nodeOptions);

		for (let i = 0; i < items.length; i++) {
			try {
				const rawQuery = this.getNodeParameter('query', i) as string;

				const options = this.getNodeParameter('options', i, {});

				let values = (options.queryReplacement as IDataObject)?.values as IDataObject[];

				if (values) {
					values = values.map((entry) => entry.value as IDataObject);
				}

				const { newQuery, newValues } = prepareQueryAndReplacements(rawQuery, values);

				const formattedQuery = connection.format(newQuery, newValues);

				const response = (
					await connection.query(formattedQuery, values)
				)[0] as unknown as IDataObject;

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(response),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
					});
				} else {
					await connection.end();
					throw error;
				}
			}
		}

		await connection.end();
	}

	if (queryBatching === 'transaction') {
		const connection = await createConnection(credentials, nodeOptions);
		await connection.beginTransaction();

		for (let i = 0; i < items.length; i++) {
			try {
				const rawQuery = this.getNodeParameter('query', i) as string;

				const options = this.getNodeParameter('options', i, {});

				let values = (options.queryReplacement as IDataObject)?.values as IDataObject[];

				if (values) {
					values = values.map((entry) => entry.value as IDataObject);
				}

				const { newQuery, newValues } = prepareQueryAndReplacements(rawQuery, values);

				const formattedQuery = connection.format(newQuery, newValues);

				const response = (
					await connection.query(formattedQuery, values)
				)[0] as unknown as IDataObject;

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(response),
					{ itemData: { item: i } },
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
		await connection.end();
	}

	return returnData;
}
