import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, updateDisplayOptions } from 'n8n-workflow';

import { apiRequest, apiRequestAllItems } from '../../transport';

export const description: INodeProperties[] = updateDisplayOptions(
	{
		show: {
			operation: ['list'],
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
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			displayOptions: {
				show: {
					returnAll: [false],
				},
			},
			typeOptions: {
				minValue: 1,
				maxValue: 100,
			},
			default: 50,
			description: 'Max number of results to return',
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			default: {},
			placeholder: 'Add option',
			options: [
				{
					displayName: 'Fields',
					name: 'fields',
					type: 'fixedCollection',
					description: 'The select fields of the returned rows',
					typeOptions: {
						multipleValues: true,
					},
					default: [],
					placeholder: 'Add field',
					options: [
						{
							name: 'items',
							displayName: 'Items',
							values: [
								{
									displayName: 'Field Name or ID',
									name: 'field',
									type: 'resourceLocator',
									description: 'Name of the field to select on',
									default: { mode: 'list', value: '' },
									typeOptions: {
										loadOptionsDependsOn: ['linkFieldName.value'],
									},
									modes: [
										{
											displayName: 'From List',
											name: 'list',
											type: 'list',
											typeOptions: {
												searchListMethod: 'getRelatedTableFields',
												searchable: true,
											},
										},
										{
											displayName: 'ID',
											name: 'id',
											type: 'string',
											placeholder: 'c9xxmrtn2wfe39l',
										},
									],
								},
							],
						},
					],
				},
				{
					displayName: 'Sort',
					name: 'sort',
					placeholder: 'Add Sort Rule',
					description: 'The sorting rules for the returned rows',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
					},
					default: {},
					options: [
						{
							name: 'property',
							displayName: 'Property',
							values: [
								{
									displayName: 'Field Name or ID',
									name: 'field',
									type: 'resourceLocator',
									description: 'Name of the field to select on',
									default: { mode: 'list', value: '' },
									typeOptions: {
										loadOptionsDependsOn: ['linkFieldName.value'],
									},
									modes: [
										{
											displayName: 'From List',
											name: 'list',
											type: 'list',
											typeOptions: {
												searchListMethod: 'getRelatedTableFields',
												searchable: true,
											},
										},
										{
											displayName: 'ID',
											name: 'id',
											type: 'string',
											placeholder: 'c9xxmrtn2wfe39l',
										},
									],
								},
								{
									displayName: 'Direction',
									name: 'direction',
									type: 'options',
									options: [
										{
											name: 'ASC',
											value: 'asc',
											description: 'Sort in ascending order (small -> large)',
										},
										{
											name: 'DESC',
											value: 'desc',
											description: 'Sort in descending order (large -> small)',
										},
									],
									default: 'asc',
									description: 'The sort direction',
								},
							],
						},
					],
				},
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
			requestMethod = 'GET';
			endPoint = `/api/v3/data/${baseId}/${table}/links/${linkFieldName}/${id}`;

			const returnAll = this.getNodeParameter('returnAll', i);
			qs = this.getNodeParameter('options', i, {});

			if (qs.sort) {
				const properties = (qs.sort as IDataObject).property as Array<{
					field: {
						value: string;
					};
					direction: string;
				}>;
				qs.sort = JSON.stringify(
					properties.map((prop) => {
						return {
							field: prop.field.value,
							direction: prop.direction,
						};
					}),
				);
			}
			if (qs.fields) {
				qs.fields = ((qs.fields as IDataObject).items as IDataObject[])
					.map((field: IDataObject) => (field.field as IDataObject).value)
					.join(',');
			}

			if (returnAll) {
				responseData = await apiRequestAllItems.call(this, requestMethod, endPoint, {}, qs);
			} else {
				qs.limit = this.getNodeParameter('limit', 0);
				responseData = await apiRequest.call(this, requestMethod, endPoint, {}, qs);
				responseData = responseData.records;
			}
			returnData.push.apply(returnData, responseData as IDataObject[]);
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
