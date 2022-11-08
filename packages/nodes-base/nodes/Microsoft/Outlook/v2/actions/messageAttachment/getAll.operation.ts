import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { microsoftApiRequest, microsoftApiRequestAllItems } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['messageAttachment'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['messageAttachment'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['messageAttachment'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'multiOptions',
				default: [],
				options: [
					{
						name: 'contentType',
						value: 'contentType',
					},
					{
						name: 'isInline',
						value: 'isInline',
					},
					{
						name: 'lastModifiedDateTime',
						value: 'lastModifiedDateTime',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'name',
						value: 'name',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'size',
						value: 'size',
					},
				],
				description: 'Fields the response will contain',
			},
			{
				displayName: 'Filter',
				name: 'filter',
				type: 'string',
				default: '',
				hint: 'Information about the syntax can be found <a href="https://learn.microsoft.com/en-us/graph/filter-query-parameter">here</a>',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	let responseData;
	const qs = {} as IDataObject;

	const messageId = this.getNodeParameter('messageId', index) as string;
	const returnAll = this.getNodeParameter('returnAll', index) as boolean;
	const options = this.getNodeParameter('options', index) as IDataObject;

	// Have sane defaults so we don't fetch attachment data in this operation
	qs['$select'] = 'id,lastModifiedDateTime,name,contentType,size,isInline';

	if (options.fields && (options.fields as string[]).length) {
		qs['$select'] = (options.fields as string[]).map((field) => field.trim()).join(',');
	}

	if (options.filter) {
		qs['$filter'] = options.filter;
	}

	const endpoint = `/messages/${messageId}/attachments`;
	if (returnAll === true) {
		responseData = await microsoftApiRequestAllItems.call(
			this,
			'value',
			'GET',
			endpoint,
			undefined,
			qs,
		);
	} else {
		qs['$top'] = this.getNodeParameter('limit', index) as number;
		responseData = await microsoftApiRequest.call(this, 'GET', endpoint, undefined, qs);
		responseData = responseData.value;
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: index } },
	);

	return executionData;
}
