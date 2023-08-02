import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { microsoftApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Type',
		name: 'folderType',
		type: 'options',
		options: [
			{
				name: 'Folder',
				value: 'folder',
				description: 'Stores messages selected manually by the user or through rules',
			},
			{
				name: 'Search Folder',
				value: 'searchFolder',
				description: 'Virtually aggregates messages based on specific search criteria',
			},
		],
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['create'],
			},
		},
		default: 'folder',
	},
	{
		displayName: 'Name',
		name: 'displayName',
		description: 'Name of the folder',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. My Folder',
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Include Nested Folders',
		name: 'includeNestedFolders',
		description: 'Whether to include child folders in the search',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['create'],
				folderType: ['searchFolder'],
			},
		},
	},
	{
		displayName: 'Source Folder IDs',
		name: 'sourceFolderIds',
		description: 'The mailbox folders that should be mined',
		type: 'string',
		typeOptions: {
			multipleValues: true,
		},
		default: [],
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['create'],
				folderType: ['searchFolder'],
			},
		},
	},
	{
		displayName: 'Filter Query',
		name: 'filterQuery',
		hint: 'Search query to filter messages. <a href="https://learn.microsoft.com/en-us/graph/filter-query-parameter">More info</a>.',
		type: 'string',
		default: '',
		placeholder: "e.g. from/emailAddress/address eq 'john@example.com'",
		required: true,
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['create'],
				folderType: ['searchFolder'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const displayName = this.getNodeParameter('displayName', index) as string;
	const folderType = this.getNodeParameter('folderType', index) as string;
	const body: IDataObject = {
		displayName,
	};

	let endpoint = '/mailFolders';

	if (folderType === 'searchFolder') {
		endpoint = '/mailFolders/searchfolders/childFolders';
		const includeNestedFolders = this.getNodeParameter('includeNestedFolders', index);
		const sourceFolderIds = this.getNodeParameter('sourceFolderIds', index);
		const filterQuery = this.getNodeParameter('filterQuery', index);
		Object.assign(body, {
			'@odata.type': 'microsoft.graph.mailSearchFolder',
			includeNestedFolders,
			sourceFolderIds,
			filterQuery,
		});
	}

	const responseData = await microsoftApiRequest.call(this, 'POST', endpoint, body);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject[]),
		{ itemData: { item: index } },
	);

	return executionData;
}
