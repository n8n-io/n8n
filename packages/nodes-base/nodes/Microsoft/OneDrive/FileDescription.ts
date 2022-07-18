import {
	INodeProperties,
} from 'n8n-workflow';

export const fileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'file',
				],
			},
		},
		options: [
			{
				name: 'Copy',
				value: 'copy',
				description: 'Copy a file',
				action: 'Copy a file',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a file',
				action: 'Delete a file',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download a file',
				action: 'Download a file',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a file',
				action: 'Get a file',
			},
			{
				name: 'Rename',
				value: 'rename',
				description: 'Rename a file',
				action: 'Rename a file',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search a file',
				action: 'Search a file',
			},
			{
				name: 'Share',
				value: 'share',
				description: 'Share a file',
				action: 'Share a file',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a file up to 4MB in size',
				action: 'Upload a file',
			},
		],
		default: 'upload',
	},
];

export const fileFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                 file:copy                                  */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'copy',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'copy',
				],
				resource: [
					'file',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The new name for the copy. If this isn\'t provided, the same name will be used as the original.',
			},
		],
	},
	{
		displayName: 'Parent Reference',
		name: 'parentReference',
		type: 'collection',
		placeholder: 'Add Parent Reference',
		description: 'Reference to the parent item the copy will be created in <a href="https://docs.microsoft.com/en-us/onedrive/developer/rest-api/resources/itemreference?view=odsp-graph-online"> Details </a>',
		displayOptions: {
			show: {
				operation: [
					'copy',
				],
				resource: [
					'file',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Drive ID',
				name: 'driveId',
				type: 'string',
				default: '',
				description: 'Identifier of the drive instance that contains the item',
			},
			{
				displayName: 'Drive Type',
				name: 'driveType',
				type: 'string',
				default: '',
				description: 'Identifies the type of drive',
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				description: 'Identifier of the item in the drive',
			},
			{
				displayName: 'List ID',
				name: 'listId',
				type: 'string',
				default: '',
				description: 'Identifier of the list',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the item being referenced',
			},
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '',
				description: 'Path that can be used to navigate to the item',
			},
			{
				displayName: 'Share ID',
				name: 'shareId',
				type: 'string',
				default: '',
				description: 'Identifier for a shared resource that can be accessed via the Shares API',
			},
			{
				displayName: 'Site ID',
				name: 'siteId',
				type: 'string',
				default: '',
				description: 'Identifier of the site',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 file:delete                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'Field ID',
	},
/* -------------------------------------------------------------------------- */
/*                                 file:download                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'download',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: {
			show: {
				operation: [
					'download',
				],
				resource: [
					'file',
				],
			},
		},
		description: 'Name of the binary property to which to write the data of the read file',
	},
/* -------------------------------------------------------------------------- */
/*                                 file:get                                   */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'Field ID',
	},
/* -------------------------------------------------------------------------- */
/*                                 file:rename                                */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Item ID',
	name: 'itemId',
	type: 'string',
	displayOptions: {
		show: {
			operation: [
				'rename',
			],
			resource: [
				'file',
			],
		},
	},
	default: '',
	description: 'ID of the file',
},
{
	displayName: 'New Name',
	name: 'newName',
	type: 'string',
	displayOptions: {
		show: {
			operation: [
				'rename',
			],
			resource: [
				'file',
			],
		},
	},
	default: '',
	description: 'New name for file',
},
/* -------------------------------------------------------------------------- */
/*                                 file:search                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'The query text used to search for items. Values may be matched across several fields including filename, metadata, and file content.',
	},
/* -------------------------------------------------------------------------- */
/*                                 file:share                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'share',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
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
				operation: [
					'share',
				],
				resource: [
					'file',
				],
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
				operation: [
					'share',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'The type of sharing link to create',
	},
/* -------------------------------------------------------------------------- */
/*                                 file:upload                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'The name the file should be saved as',
	},
	{
		displayName: 'Parent ID',
		name: 'parentId',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
			},
		},
		default: '',
		description: 'ID of the parent folder that will contain the file',
	},
	{
		displayName: 'Binary Data',
		name: 'binaryData',
		type: 'boolean',
		default: false,
		required: true,
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
			},
		},
		description: 'Whether the data to upload should be taken from binary field',
	},
	{
		displayName: 'File Content',
		name: 'fileContent',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				binaryData: [
					false,
				],
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
			},

		},
		placeholder: '',
		description: 'The text content of the file',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				binaryData: [
					true,
				],
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
			},

		},
		placeholder: '',
		description: 'Name of the binary property which contains the data for the file',
	},
];
