import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
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
				displayName: 'Display Name',
				name: 'displayName',
				description: 'Name of the folder',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Filter Query',
				name: 'filterQuery',
				description: 'The OData query to filter the messages. Only for search folders.',
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
	let responseData;

	const folderId = this.getNodeParameter('folderId', index) as string;
	const updateFields = this.getNodeParameter('updateFields', index) as IDataObject;

	const body: IDataObject = {
		...updateFields,
	};

	responseData = await microsoftApiRequest.call(this, 'PATCH', `/mailFolders/${folderId}`, body);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: index } },
	);

	return executionData;
}
