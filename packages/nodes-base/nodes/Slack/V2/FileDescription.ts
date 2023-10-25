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
				name: 'Get',
				value: 'get',
				action: 'Get a file',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get & filters team files',
				action: 'Get many files',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Create or upload an existing file',
				action: 'Upload a file',
			},
		],
		default: 'upload',
	},
];

export const fileFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                file:upload                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Binary Data',
		name: 'binaryData',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['file'],
			},
		},
		description: 'Whether the data to upload should be taken from binary field',
	},
	{
		displayName: 'File Content',
		name: 'fileContent',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['file'],
				binaryData: [false],
			},
		},
		placeholder: '',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['file'],
				binaryData: [true],
			},
		},
		placeholder: '',
		description: 'Name of the binary property which contains the data for the file to be uploaded',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['file'],
			},
		},
		default: {},
		description: 'Other options to set',
		placeholder: 'Add options',
		options: [
			{
				displayName: 'Channel Names or IDs',
				name: 'channelIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getChannels',
				},
				default: [],
				description:
					'The channels to send the file to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Initial Comment',
				name: 'initialComment',
				type: 'string',
				default: '',
				description: 'The message text introducing the file in specified channels',
			},
			{
				displayName: 'Thread Timestamp',
				name: 'threadTs',
				type: 'string',
				default: '',
				description:
					"Provide another message's Timestamp value to upload this file as a reply. Never use a reply's Timestamp value; use its parent instead.",
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
			},
		],
	},

	/* ----------------------------------------------------------------------- */
	/*                                 file:getAll                             */
	/* ----------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['file'],
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
				resource: ['file'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['file'],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Channel Name or ID',
				name: 'channelId',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getChannels',
				},
				description:
					'Channel containing the file to be listed. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Show Files Hidden By Limit',
				name: 'showFilesHidden',
				type: 'boolean',
				default: false,
				description:
					'Whether to show truncated file info for files hidden due to being too old, and the team who owns the file being over the file limit',
			},
			{
				displayName: 'Message Timestamp From',
				name: 'tsFrom',
				type: 'string',
				default: '',
				description: 'Filter files created after this timestamp (inclusive)',
			},
			{
				displayName: 'Message Timestamp To',
				name: 'tsTo',
				type: 'string',
				default: '',
				description: 'Filter files created before this timestamp (inclusive)',
			},
			{
				displayName: 'Types',
				name: 'types',
				type: 'multiOptions',
				options: [
					{
						name: 'All',
						value: 'all',
					},
					{
						name: 'Google Docs',
						value: 'gdocs',
					},
					{
						name: 'Images',
						value: 'images',
					},
					{
						name: 'PDFs',
						value: 'pdfs',
					},
					{
						name: 'Snippets',
						value: 'snippets',
					},
					{
						name: 'Spaces',
						value: 'spaces',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'zips',
						value: 'zips',
					},
				],
				default: ['all'],
				description: 'Filter files by type',
			},
			{
				displayName: 'User Name or ID',
				name: 'userId',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				description:
					'Filter files created by a single user. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	},

	/* ----------------------------------------------------------------------- */
	/*                                 file:get                                */
	/* ----------------------------------------------------------------------- */
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['get'],
			},
		},
		default: '',
	},
];
