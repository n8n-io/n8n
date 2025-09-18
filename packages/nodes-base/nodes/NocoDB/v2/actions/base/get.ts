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
			operation: ['get'],
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
		{
			displayName: 'Base Name or ID',
			name: 'projectId',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			required: true,
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			typeOptions: {
				loadOptionsDependsOn: ['workspaceId.value'],
			},
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					typeOptions: {
						searchListMethod: 'getBases',
						searchable: true,
					},
				},
				{
					displayName: 'ID',
					name: 'id',
					type: 'string',
					placeholder: 'p979g1063032uw4',
				},
			],
		},
	],
);

async function getTables(
	this: IExecuteFunctions,
	{
		baseId,
		tables,
	}: {
		baseId: string;
		tables: Array<{
			id: string;
		}>;
	},
) {
	return await Promise.all(
		tables.map(async (table) => {
			const endpoint = `/api/v3/meta/bases/${baseId}/tables/${table.id}`;
			return await apiRequest.call(this, 'GET', endpoint, {}, {});
		}),
	);
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: IDataObject[] = [];
	let responseData;

	let requestMethod: IHttpRequestMethods;
	let endPoint = '';
	const qs: IDataObject = {};

	for (let i = 0; i < items.length; i++) {
		try {
			requestMethod = 'GET';
			const baseId = this.getNodeParameter('projectId', i, undefined, {
				extractValue: true,
			}) as string;
			endPoint = `/api/v3/meta/bases/${baseId}`;

			responseData = await apiRequest.call(this, requestMethod, endPoint, {}, qs);
			const tableResponse = await apiRequest.call(
				this,
				requestMethod,
				`${endPoint}/tables`,
				{},
				{},
			);
			responseData.tables = await getTables.call(this, { baseId, tables: tableResponse.list });
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
