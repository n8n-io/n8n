import type {
	JsonObject,
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeApiError, updateDisplayOptions } from 'n8n-workflow';

import { apiRequest } from '../../transport';

export const description: INodeProperties[] = updateDisplayOptions(
	{
		show: {
			operation: ['getAll'],
		},
	},
	[
		{
			displayName: 'Workspace Name or ID',
			name: 'workspaceId',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					typeOptions: {
						searchListMethod: 'getWorkspaces',
						searchable: true,
					},
				},
				{
					displayName: 'ID',
					name: 'id',
					type: 'string',
					placeholder: 'wi0qdp7n',
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
	const qs: IDataObject = {};

	for (let i = 0; i < items.length; i++) {
		try {
			const workspaceId = this.getNodeParameter('workspaceId', i, undefined, {
				extractValue: true,
			}) as string;
			requestMethod = 'GET';
			if (workspaceId && workspaceId !== 'none') {
				endPoint = `/api/v3/meta/workspaces/${workspaceId}/bases`; // Endpoint for getting all bases (NocoDB API v3)
			} else {
				endPoint = '/api/v2/meta/bases/'; // Endpoint for getting all bases without workspace (NocoDB API v2)
			}

			responseData = await apiRequest.call(this, requestMethod, endPoint, {}, qs);
			returnData.push.apply(returnData, responseData.list as IDataObject[]);
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
