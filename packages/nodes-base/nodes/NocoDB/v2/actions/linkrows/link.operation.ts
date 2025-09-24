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
			operation: ['link'],
		},
	},
	[
		{
			displayName: 'Row ID Value',
			name: 'id',
			type: 'string',
			default: '',
			required: true,
			description: 'The ID of record in table',
		},
		{
			displayName: 'Link Field Name or ID',
			name: 'linkFieldName',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			typeOptions: {
				loadOptionsDependsOn: ['table.value'],
			},
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					typeOptions: {
						searchListMethod: 'getLinkFieldsId',
						searchable: true,
					},
				},
				{
					displayName: 'ID',
					name: 'id',
					type: 'string',
					placeholder: 'c4gzwl1scxmj2i5',
				},
			],
			required: true,
			description:
				'Name of the fields of type \'link\' that will be uploaded. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		},
		{
			displayName: 'Linked Row ID Value',
			name: 'linkId',
			type: 'string',
			typeOptions: {
				multipleValues: true,
			},
			default: [],
			required: true,
			description: 'The ID of record in table',
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

	const baseId = this.getNodeParameter('projectId', 0, undefined, {
		extractValue: true,
	}) as string;
	let body: IDataObject | IDataObject[] = {};

	for (let i = 0; i < items.length; i++) {
		const table = this.getNodeParameter('table', i, undefined, {
			extractValue: true,
		}) as string;
		const linkFieldName = this.getNodeParameter('linkFieldName', i, undefined, {
			extractValue: true,
		}) as string;
		const id = this.getNodeParameter('id', i, undefined, {
			extractValue: true,
		}) as string;

		try {
			const linkIds = this.getNodeParameter('linkId', i, undefined, {
				extractValue: true,
			}) as IDataObject[];
			body = [];
			for (const linkId of linkIds) {
				// if it comes from expression (input)
				if (Array.isArray(linkId)) {
					body.push.apply(
						body,
						linkId.map((id: string | number | Record<any, any>) => {
							if (['string', 'number'].includes(typeof id)) {
								return { id } as IDataObject;
							} else {
								return id as IDataObject;
							}
						}),
					);
				} else {
					if (['string', 'number'].includes(typeof linkId)) {
						body.push({ id: linkId });
					} else {
						body.push(linkId);
					}
				}
			}
			if (!linkIds?.length) {
				throw new Error('Linked Row ID Value cannot be empty');
			}

			requestMethod = 'POST';
			endPoint = `/api/v3/data/${baseId}/${table}/links/${linkFieldName}/${id}`;

			responseData = await apiRequest.call(this, requestMethod, endPoint, body, qs);
			returnData.push.apply(returnData, [responseData] as IDataObject[]);
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
