import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, updateDisplayOptions } from 'n8n-workflow';

import { apiRequest, apiRequestAllItems, downloadRecordAttachments } from '../../transport';

const v3Options: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	default: {},
	placeholder: 'Add option',
	displayOptions: {
		show: {
			version: [3],
		},
	},
	options: [
		{
			displayName: 'View Name or ID',
			name: 'viewId',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			description:
				'The view to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			typeOptions: {
				loadOptionsDependsOn: ['table.value'],
			},
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					typeOptions: {
						searchListMethod: 'getViews',
						searchable: true,
					},
				},
				{
					displayName: 'ID',
					name: 'id',
					type: 'string',
					placeholder: 'vw5t20qcex4d5zpk',
				},
			],
		},
		{
			displayName: 'Fields',
			name: 'fields',
			type: 'string',
			typeOptions: {
				multipleValues: true,
				multipleValueButtonText: 'Add Field',
			},
			default: [],
			placeholder: 'Name',
			description: 'The select fields of the returned rows',
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
							displayName: 'Field',
							name: 'field',
							type: 'string',
							default: '',
							description: 'Name of the field to sort on',
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
};
const v4Options: INodeProperties = {
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
			displayName: 'View Name or ID',
			name: 'viewId',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			description:
				'The view to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			typeOptions: {
				loadOptionsDependsOn: ['table.value'],
			},
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					typeOptions: {
						searchListMethod: 'getViews',
						searchable: true,
					},
				},
				{
					displayName: 'ID',
					name: 'id',
					type: 'string',
					placeholder: 'vw5t20qcex4d5zpk',
				},
			],
		},
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
							displayName: 'Field',
							name: 'field',
							type: 'resourceLocator',
							description: 'Name of the field to select on',
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
										searchListMethod: 'getFields',
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
							displayName: 'Field',
							name: 'field',
							type: 'string',
							default: '',
							description: 'Name of the field to sort on',
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
};

export const description: INodeProperties[] = updateDisplayOptions(
	{
		show: {
			operation: ['getAll'],
		},
	},
	[
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
				// TODO: deprecated, searching for alternative
				// maxValue: 100,
			},
			default: 50,
			description: 'Max number of results to return',
		},
		{
			displayName: 'Download Attachments',
			name: 'downloadAttachments',
			type: 'boolean',
			default: false,
			description: "Whether the attachment fields defined in 'Download Fields' will be downloaded",
		},
		{
			displayName: 'Download Field Name or ID',
			name: 'downloadFieldNames',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getDownloadFields',
			},
			required: true,
			displayOptions: {
				show: {
					downloadAttachments: [true],
				},
			},
			default: '',
			description:
				'Name of the fields of type \'attachment\' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		},
		v3Options,
		v4Options,
	],
);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const version = this.getNodeParameter('version', 0) as number;
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
			requestMethod = 'GET';
			const table = this.getNodeParameter('table', i, undefined, {
				extractValue: true,
			}) as string;
			const returnAll = this.getNodeParameter('returnAll', i);
			qs = this.getNodeParameter('options', i, {});

			endPoint = `/api/v3/data/${baseId}/${table}/records`;

			if (qs.sort) {
				const properties = (qs.sort as IDataObject).property as Array<{
					field: string;
					direction: string;
				}>;
				qs.sort = properties
					.map((prop) => `${prop.direction === 'asc' ? '' : '-'}${prop.field}`)
					.join(',');
			}
			if (qs.fields) {
				if (version === 3) {
					qs.fields = (qs.fields as IDataObject[]).join(',');
				} else {
					qs.fields = ((qs.fields as IDataObject).items as IDataObject[])
						.map((field: IDataObject) => (field.field as IDataObject).value)
						.join(',');
				}
			}
			if (qs.viewId && (qs.viewId as IDataObject).value) {
				qs.viewId = (qs.viewId as IDataObject).value;
			}

			if (returnAll) {
				responseData = await apiRequestAllItems.call(this, requestMethod, endPoint, {}, qs);
			} else {
				qs.limit = this.getNodeParameter('limit', 0);
				responseData = await apiRequest.call(this, requestMethod, endPoint, {}, qs);
				responseData = responseData.records;
			}

			const downloadAttachments = this.getNodeParameter('downloadAttachments', i) as boolean;

			if (downloadAttachments) {
				const downloadFieldNames = (this.getNodeParameter('downloadFieldNames', i) as string).split(
					',',
				);
				const response = await downloadRecordAttachments.call(
					this,
					responseData as IDataObject[],
					downloadFieldNames,
					[{ item: i }],
				);
				returnData.push.apply(returnData, response);
			} else {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			}
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
