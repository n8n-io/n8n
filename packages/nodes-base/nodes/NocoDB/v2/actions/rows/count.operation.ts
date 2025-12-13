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
			operation: ['count'],
		},
	},
	[
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			default: {},
			placeholder: 'Add option',
			displayOptions: {
				show: {
					version: [4],
				},
			},
			options: [
				{
					displayName: 'Filter By Formula',
					name: 'where',
					type: 'string',
					default: '',
					placeholder: '(name,like,example%)~or(name,eq,test)',
					description: 'A formula used to filter rows',
				},
			],
		},
	],
);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: IDataObject[] = [];
	let responseData;

	let requestMethod: IHttpRequestMethods;
	let endPoint = '';
	let qs: IDataObject = {};

	const baseId = this.getNodeParameter('projectId', 0, undefined, {
		extractValue: true,
	}) as string;

	for (let i = 0; i < items.length; i++) {
		try {
			const table = this.getNodeParameter('table', i, undefined, {
				extractValue: true,
			}) as string;

			endPoint = `/api/v3/data/${baseId}/${table}/count`;
			requestMethod = 'GET';
			qs = this.getNodeParameter('options', i, {});

			responseData = await apiRequest.call(this, requestMethod, endPoint, {}, qs);
			returnData.push(responseData as IDataObject);
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
