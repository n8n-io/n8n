import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import type { Mysql2OkPacket } from '../../helpers/interfaces';
import { createConnection } from '../../transport';

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
	const connection = await createConnection(credentials);

	try {
		const queryQueue = items.map(async (_item, index) => {
			const rawQuery = this.getNodeParameter('query', index) as string;

			return connection.query(rawQuery);
		});

		returnData = ((await Promise.all(queryQueue)) as Mysql2OkPacket[][]).reduce(
			(collection, result, index) => {
				const [rows] = result;

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(rows as unknown as IDataObject[]),
					{ itemData: { item: index } },
				);

				collection.push(...executionData);

				return collection;
			},
			[] as INodeExecutionData[],
		);
	} catch (error) {
		if (this.continueOnFail()) {
			returnData = this.helpers.returnJsonArray({ error: error.message });
		} else {
			await connection.end();
			throw error;
		}
	}

	await connection.end();

	return returnData;
}
