import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { copyInputItems } from '../../helpers/utils';
import { createConnection } from '../../transport';

import { optionsCollection, tableRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	tableRLC,
	{
		displayName: 'Update Key',
		name: 'updateKey',
		type: 'string',
		default: 'id',
		required: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
		description:
			'Name of the property which decides which rows in the database should be updated. Normally that would be "id".',
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'string',
		requiresDataPath: 'multiple',
		default: '',
		placeholder: 'name,description',
		description:
			'Comma-separated list of the properties which should used as columns for rows to update',
	},
	optionsCollection,
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	let returnData: INodeExecutionData[] = [];
	const items = this.getInputData();

	const credentials = await this.getCredentials('mySql');
	const connection = await createConnection(credentials);

	try {
		const table = this.getNodeParameter('table', 0, '', { extractValue: true }) as string;
		const updateKey = this.getNodeParameter('updateKey', 0) as string;
		const columnString = this.getNodeParameter('columns', 0) as string;
		const columns = columnString.split(',').map((column) => column.trim());

		if (!columns.includes(updateKey)) {
			columns.unshift(updateKey);
		}

		const updateItems = copyInputItems(items, columns);
		const updateSQL = `UPDATE ${table} SET ${columns
			.map((column) => `${column} = ?`)
			.join(',')} WHERE ${updateKey} = ?;`;
		const queryQueue = updateItems.map(async (item) =>
			connection.query(updateSQL, Object.values(item).concat(item[updateKey])),
		);
		const queryResult = await Promise.all(queryQueue);
		returnData = this.helpers.returnJsonArray(
			queryResult.map((result) => result[0]) as unknown as IDataObject[],
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
