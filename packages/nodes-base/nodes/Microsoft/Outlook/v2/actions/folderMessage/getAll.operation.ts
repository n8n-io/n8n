import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { microsoftApiRequest, microsoftApiRequestAllItems } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Folders Name or ID',
		name: 'folderId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getFolders',
		},
		default: [],
		description:
			'The folder to get the messages from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['folderMessage'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['folderMessage'],
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
				resource: ['folderMessage'],
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['folderMessage'],
				operation: ['getAll'],
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
	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;

	if (additionalFields.fields) {
		qs['$select'] = additionalFields.fields;
	}

	if (additionalFields.filter) {
		qs['$filter'] = additionalFields.filter;
	}

	const endpoint = `/mailFolders/${folderId}/messages`;
	if (returnAll) {
		responseData = await microsoftApiRequestAllItems.call(this, 'value', 'GET', endpoint, qs);
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
