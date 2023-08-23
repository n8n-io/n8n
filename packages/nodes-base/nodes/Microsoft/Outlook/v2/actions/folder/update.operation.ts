import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { microsoftApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		description: 'Fields to update',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'displayName',
				description: 'Name of the folder',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Filter Query',
				name: 'filterQuery',
				hint: 'Search query to filter messages. <a href="https://learn.microsoft.com/en-us/graph/filter-query-parameter">More info</a>.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Include Nested Folders',
				name: 'includeNestedFolders',
				description: 'Whether to include child folders in the search. Only for search folders.',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Source Folder IDs',
				name: 'sourceFolderIds',
				description: 'The mailbox folders that should be mined. Only for search folders.',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const folderId = this.getNodeParameter('folderId', index) as string;
	const updateFields = this.getNodeParameter('updateFields', index);

	const body: IDataObject = {
		...updateFields,
	};

	const responseData = await microsoftApiRequest.call(
		this,
		'PATCH',
		`/mailFolders/${folderId}`,
		body,
	);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject),
		{ itemData: { item: index } },
	);

	return executionData;
}
