import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import type { Mysql2OkPacket } from '../../helpers/interfaces';
import { prepareQueryAndReplacements } from '../../helpers/utils';
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
	{
		displayName: `
		You can use <strong>Query Values Replacement</strong> to map values in <strong>Query</strong>, to reference first value use $1,to reference second $2 and so on, if value is SQL name or identifier add :name,<br/>
		e.g. SELECT * FROM $1:name WHERE id = $2;`,
		name: 'notice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Query Values Replacement',
		name: 'queryReplacement',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: [],
		placeholder: 'Add Value',
		description:
			'Value has to be of type number, bigint, string, boolean, Date and null, types Array and Object will be converted to string',
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
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

			const values = (
				this.getNodeParameter('queryReplacement.values', index, []) as IDataObject[]
			).map((entry) => entry.value as string);

			const { newQuery, newValues } = prepareQueryAndReplacements(rawQuery, values);

			const formattedQuery = connection.format(newQuery, newValues);

			return connection.query(formattedQuery);
		});

		returnData = ((await Promise.all(queryQueue)) as Mysql2OkPacket[][]).reduce(
			(acc, result, index) => {
				const [rows] = result;

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(rows as unknown as IDataObject[]),
					{ itemData: { item: index } },
				);

				acc.push(...executionData);

				return acc;
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
