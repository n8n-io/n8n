import type { INodeProperties } from 'n8n-workflow';

export const fileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a file',
				action: 'Create a file',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete file',
				action: 'Delete a file',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a file content',
				action: 'Get a file content',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many files',
				action: 'Get many files',
			},
		],
		default: 'get',
	},
];

export const fileFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                file:*                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Form Name or ID',
		name: 'formId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'loadForms',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
		description:
			'Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                file:delete                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['delete', 'get'],
			},
		},
		description: 'Uid of the file (should start with "af" e.g. "afQoJxA4kmKEXVpkH6SYbhb"',
	},
	{
		displayName: 'Property Name',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['get'],
			},
		},
		description: 'Name of the binary property to write the file into',
	},
	{
		displayName: 'Download File Content',
		name: 'download',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['get'],
			},
		},
		description: 'Whether to download the file content into a binary property',
	},
	{
		displayName: 'File Upload Mode',
		name: 'fileMode',
		type: 'options',
		required: true,
		default: 'binary',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Binary File',
				value: 'binary',
			},
			{
				name: 'URL',
				value: 'url',
			},
		],
	},
	{
		displayName: 'Property Name',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['create'],
				fileMode: ['binary'],
			},
		},
		description:
			'Name of the binary property containing the file to upload. Supported types: image, audio, video, csv, xml, zip.',
	},
	{
		displayName: 'File URL',
		name: 'fileUrl',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['create'],
				fileMode: ['url'],
			},
		},
		description: 'HTTP(s) link to the file to upload',
	},
];
