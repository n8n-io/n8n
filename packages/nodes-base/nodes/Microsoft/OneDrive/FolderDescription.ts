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
				description: 'Create a folder',
				action: 'Create a folder',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a folder',
				action: 'Delete a folder',
			},
			{
				name: 'Get Children',
				value: 'getChildren',
				description: 'Get items inside a folder',
				action: 'Get items in a folder',
			},
			{
				name: 'Move',
				value: 'move',
				description: 'Move a folder',
				action: 'Move a folder',
			},
			{
				name: 'Rename',
				value: 'rename',
				description: 'Rename a folder',
				action: 'Rename a folder',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search a folder',
				action: 'Search a folder',
			},
			{
				name: 'Share',
				value: 'share',
				description: 'Share a folder',
				action: 'Share a folder',
			},
		],
		default: 'getChildren',
	},
];

export const folderFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 folder:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		required: true,
		type: 'string',
		placeholder: '/Pictures/2021',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['folder'],
			},
		},
		default: '',
		description: 'The name or path of the folder',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['folder'],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Parent Folder ID',
				name: 'parentFolderId',
				type: 'string',
				default: '',
				description: 'ID of the folder you want to crate the new folder in',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 folder:getChildren/delete                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Folder ID',
		name: 'folderId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete', 'getChildren'],
				resource: ['folder'],
			},
		},
		default: '',
		description: 'The ID of the folder. Use `root` for the top-level folder.',
		hint: 'Use `root` for the top-level folder of the drive',
	},
	/* -------------------------------------------------------------------------- */
	/*                               folder:move                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Folder ID',
		name: 'folderId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['move'],
				resource: ['folder'],
			},
		},
		default: '',
		description: 'ID of the folder to move',
	},
	{
		displayName: 'Destination Folder ID',
		name: 'destinationFolderId',
		type: 'string',
		default: '',
		placeholder: 'root',
		displayOptions: {
			show: {
				operation: ['move'],
				resource: ['folder'],
			},
		},
		description:
			"ID of the destination folder to move the item into. Use `root` for the drive's top-level folder.",
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['move'],
				resource: ['folder'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'New Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'A new name for the folder. If omitted, the existing name is kept.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                               folder:rename                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Item ID',
		name: 'itemId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['rename'],
				resource: ['folder'],
			},
		},
		default: '',
		description: 'ID of the folder',
	},
	{
		displayName: 'New Name',
		name: 'newName',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['rename'],
				resource: ['folder'],
			},
		},
		default: '',
		description: 'New name for folder',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 folder:search                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName:
			'Search is not available with the Service Principal credential. App-only Microsoft Graph cannot search a drive — use Folder: Get Children, or switch to an OAuth2 credential.',
		name: 'searchUnsupportedNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['search'],
				resource: ['folder'],
				authentication: ['microsoftEntraServicePrincipalApi'],
			},
		},
	},
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['search'],
				resource: ['folder'],
			},
			hide: {
				authentication: ['microsoftEntraServicePrincipalApi'],
			},
		},
		default: '',
		description:
			'The query text used to search for items. Values may be matched across several fields including filename, metadata, and file content.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 folder:share                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName:
			'With the Service Principal credential, creating a sharing link uses application permissions and may require additional tenant or admin configuration to succeed.',
		name: 'shareServicePrincipalNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['share'],
				resource: ['folder'],
				authentication: ['microsoftEntraServicePrincipalApi'],
			},
		},
	},
	{
		displayName: 'Folder ID',
		name: 'folderId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['share'],
				resource: ['folder'],
			},
		},
		default: '',
		description: 'File ID',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: [
			{
				name: 'View',
				value: 'view',
			},
			{
				name: 'Edit',
				value: 'edit',
			},
			{
				name: 'Embed',
				value: 'embed',
			},
		],
		displayOptions: {
			show: {
				operation: ['share'],
				resource: ['folder'],
			},
		},
		default: '',
		description: 'The type of sharing link to create',
	},
	{
		displayName: 'Scope',
		name: 'scope',
		type: 'options',
		options: [
			{
				name: 'Anonymous',
				value: 'anonymous',
			},
			{
				name: 'Organization',
				value: 'organization',
			},
		],
		displayOptions: {
			show: {
				operation: ['share'],
				resource: ['folder'],
			},
		},
		default: '',
		description: 'The type of sharing link to create',
	},
];
