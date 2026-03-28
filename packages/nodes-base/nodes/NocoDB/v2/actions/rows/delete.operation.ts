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
	const returnData: INodeExecutionData[] = [];

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
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData.records as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push.apply(returnData, executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: error.toString() }),
					{ itemData: { item: i } },
				);
				returnData.push.apply(returnData, executionData);
			} else {
				throw new NodeApiError(this.getNode(), error as JsonObject);
			}
		}
	}

	return [returnData];
}
