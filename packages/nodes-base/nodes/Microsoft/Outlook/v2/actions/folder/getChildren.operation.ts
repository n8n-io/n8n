import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { getSubfolders, microsoftApiRequest, microsoftApiRequestAllItems } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['getChildren'],
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
				resource: ['folder'],
				operation: ['getChildren'],
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
				resource: ['folder'],
				operation: ['getChildren'],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields the response will contain. Multiple can be added separated by ,.',
			},
			{
				displayName: 'Filter',
				name: 'filter',
				type: 'string',
				default: '',
				description:
					'Microsoft Graph API OData $filter query. Information about the syntax can be found <a href="https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter">here</a>.',
			},
			{
				displayName: 'Include Child Folders',
				name: 'includeChildFolders',
				type: 'boolean',
				default: false,
				description: 'Whether to include child folders in the response',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	let responseData;
	const qs: IDataObject = {};

	const folderId = this.getNodeParameter('folderId', index) as string;
	const returnAll = this.getNodeParameter('returnAll', index) as boolean;
	const options = this.getNodeParameter('options', index) as IDataObject;

	if (options.fields) {
		qs['$select'] = options.fields;
	}

	if (options.filter) {
		qs['$filter'] = options.filter;
	}

	if (returnAll) {
		responseData = await microsoftApiRequestAllItems.call(
			this,
			'value',
			'GET',
			`/mailFolders/${folderId}/childFolders`,
			qs,
		);
	} else {
		qs['$top'] = this.getNodeParameter('limit', index) as number;
		responseData = await microsoftApiRequest.call(
			this,
			'GET',
			`/mailFolders/${folderId}/childFolders`,
			undefined,
			qs,
		);
		responseData = responseData.value;
	}

	if (options.includeChildFolders) {
		responseData = await getSubfolders.call(this, responseData);
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: index } },
	);

	return executionData;
}
