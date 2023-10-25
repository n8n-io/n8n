import type { INodeProperties } from 'n8n-workflow';

export const folderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['folder'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: "Create a new mail folder in the root folder of the user's mailbox",
				action: 'Create a folder',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a folder',
				action: 'Delete a folder',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single folder details',
				action: 'Get a folder',
			},
			{
				name: 'Get Children',
				value: 'getChildren',
				description: 'Lists all child folders under the folder',
				action: 'Get items in a folder',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many folders under the root folder of the signed-in user',
				action: 'Get many folders',
			},
		],
		default: 'create',
	},
];

export const folderFields: INodeProperties[] = [
	{
		displayName: 'Folder ID',
		name: 'folderId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['delete', 'get', 'getChildren', 'update'],
			},
		},
	},
	// folder:list, getChildren, listMessages
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['getAll', 'getChildren'],
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
				operation: ['getAll', 'getChildren'],
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
	// folder:create
	{
		displayName: 'Type',
		name: 'folderType',
		description: 'Folder Type',
		type: 'options',
		options: [
			{
				name: 'Folder',
				value: 'folder',
			},
			{
				name: 'Search Folder',
				value: 'searchFolder',
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
		displayName: 'Display Name',
		name: 'displayName',
		description: 'Name of the folder',
		type: 'string',
		required: true,
		default: '',
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
		description: 'The OData query to filter the messages',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['create'],
				folderType: ['searchFolder'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['folder'],
				operation: ['get', 'getAll', 'getChildren'],
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

	// folder:update
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
