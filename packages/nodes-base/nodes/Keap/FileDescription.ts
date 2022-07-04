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
				name: 'Delete',
				value: 'delete',
				description: 'Delete a file',
				action: 'Delete a file',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all files',
				action: 'Get all files',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a file',
				action: 'Upload a file',
			},
		],
		default: 'delete',
	},
];

export const fileFields: INodeProperties[] = [
/* -------------------------------------------------------------------------- */
/*                                 file:upload                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Binary Data',
		name: 'binaryData',
		type: 'boolean',
		default: false,
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
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
				binaryData: [
					true,
				],
			},
		},
		description: 'Name of the binary property which contains the data for the file to be uploaded',
	},
	{
		displayName: 'File Association',
		name: 'fileAssociation',
		type: 'options',
		options: [
			{
				name: 'Company',
				value: 'company',
			},
			{
				name: 'Contact',
				value: 'contact',
			},
			{
				name: 'User',
				value: 'user',
			},
		],
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
		default: '',
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
				fileAssociation: [
					'contact',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
				binaryData: [
					false,
				],
			},
		},
		default: '',
		description: 'The filename of the attached file, including extension',
	},
	{
		displayName: 'File Data',
		name: 'fileData',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		required: true,
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
				binaryData: [
					false,
				],
			},
		},
		default: '',
		description: 'The content of the attachment, encoded in Base64',
	},
	{
		displayName: 'Is Public',
		name: 'isPublic',
		type: 'boolean',
		default: false,
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
	},
/* -------------------------------------------------------------------------- */
/*                                 file:delete                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
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
	},
/* -------------------------------------------------------------------------- */
/*                                 file:getAll                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'file',
				],
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
				operation: [
					'getAll',
				],
				resource: [
					'file',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 200,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'file',
				],
			},
		},
		options: [
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'Filter based on Contact ID, if user has permission to see Contact files',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Filter files based on name, with \'*\' preceding or following to indicate LIKE queries',
			},
			{
				displayName: 'Permission',
				name: 'permission',
				type: 'options',
				options: [
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'Company',
						value: 'company',
					},
					{
						name: 'Both',
						value: 'both',
					},
				],
				default: 'both',
				description: 'Filter based on the permission of files',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Application',
						value: 'application',
					},
					{
						name: 'Attachment',
						value: 'attachment',
					},
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Digital Product',
						value: 'digitalProduct',
					},
					{
						name: 'Fax',
						value: 'fax',
					},
					{
						name: 'Funnel',
						value: 'funnel',
					},
					{
						name: 'Hidden',
						value: 'hidden',
					},
					{
						name: 'Image',
						value: 'image',
					},
					{
						name: 'Import',
						value: 'import',
					},
					{
						name: 'Logo Thumnail',
						value: 'logoThumnail',
					},
					{
						name: 'Re Sampled Image',
						value: 'reSampledImage',
					},
					{
						name: 'Style Cart',
						value: 'styleCart',
					},
					{
						name: 'Template Thumnail',
						value: 'templateThumnail',
					},
					{
						name: 'Ticket',
						value: 'ticket',
					},
					{
						name: 'Webform',
						value: 'webform',
					},
				],
				default: '',
				description: 'Filter based on the type of file',
			},
			{
				displayName: 'Viewable',
				name: 'viewable',
				type: 'options',
				options: [
					{
						name: 'Public',
						value: 'public',
					},
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Both',
						value: 'both',
					},
				],
				default: 'both',
				description: 'Include public or private files in response',
			},
		],
	},
];
