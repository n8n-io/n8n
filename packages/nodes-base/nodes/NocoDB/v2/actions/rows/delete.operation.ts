import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, updateDisplayOptions } from 'n8n-workflow';

import { apiRequest } from '../../transport';

export const description: INodeProperties[] = updateDisplayOptions(
	{
		show: {
			operation: ['delete'],
		},
	},
	[
		{
			displayName: 'Primary Key Type',
			name: 'primaryKey',
			type: 'options',
			default: 'id',
			displayOptions: {
				show: {
					version: [3],
				},
			},
			options: [
				{
					name: 'Default',
					value: 'id',
					description:
						'Default, added when table was created from UI by those options: Create new table / Import from Excel / Import from CSV',
				},
				{
					name: 'Imported From Airtable',
					value: 'ncRecordId',
					description: 'Select if table was imported from Airtable',
				},
				{
					name: 'Custom',
					value: 'custom',
					description:
						'When connecting to existing external database as existing primary key field is retained as is, enter the name of the primary key field below',
				},
			],
		},
		{
			displayName: 'Field Name',
			name: 'customPrimaryKey',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					primaryKey: ['custom'],
					version: [3],
				},
			},
		},
		{
			displayName: 'Row ID Value',
			name: 'id',
			type: 'string',
			default: '',
			required: true,
			description: 'The value of the ID field',
		},
	],
);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: IDataObject[] = [];

	let requestMethod: IHttpRequestMethods;
	let endPoint = '';
	const qs: IDataObject = {};

	const baseId = this.getNodeParameter('projectId', 0, undefined, {
		extractValue: true,
	}) as string;
	const table = this.getNodeParameter('table', 0, undefined, {
		extractValue: true,
	}) as string;
	let body: IDataObject | IDataObject[] = {};

	for (let i = 0; i < items.length; i++) {
		try {
			requestMethod = 'DELETE';
			endPoint = `/api/v3/data/${baseId}/${table}/records`;

			const id = this.getNodeParameter('id', i, undefined, {
				extractValue: true,
			}) as string;
			body = [{ id }];

			const responseData = await apiRequest.call(this, requestMethod, endPoint, body, qs);
			returnData.push.apply(returnData, responseData.records as IDataObject[]);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ error: error.toString() });
			} else {
				throw new NodeApiError(this.getNode(), error as JsonObject);
			}
		}
	}

	return [this.helpers.returnJsonArray(returnData)];
}
