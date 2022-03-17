import { INodeProperties } from 'n8n-workflow';

export const fileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'file',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a file info',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get & filters team files.',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Create or upload an existing file.',
			},
		],
		default: 'upload',
		description: 'The operation to perform.',
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
				operation: [
					'upload',
				],
				resource: [
					'file',
				],
			},
		},
		description: 'If the data to upload should be taken from binary field.',
	},
	{
		displayName: 'File Content',
		name: 'fileContent',
		type: 'string',
		default: '',
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
		placeholder: '',
		description: 'The text content of the file to upload.',
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
		placeholder: '',
		description: 'Name of the binary property which contains the data for the file to be uploaded.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
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
		default: {},
		description: 'Other options to set',
		placeholder: 'Add options',
		options: [
			{
				displayName: 'Channels',
				name: 'channelIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getChannels',
				},
				default: [],
				description: 'The channels to send the file to.',
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				description: 'Filename of file.',
			},
			{
				displayName: 'Initial Comment',
				name: 'initialComment',
				type: 'string',
				default: '',
				description: 'The message text introducing the file in specified channels.',
			},
			{
				displayName: 'Thread TS',
				name: 'threadTs',
				type: 'string',
				default: '',
				description: `Provide another message's ts value to upload this file as a reply. Never use a reply's ts value; use its parent instead.`,
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title of file.',
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
				resource: [
					'file',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'file',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
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
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Channel',
				name: 'channelId',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getChannels',
				},
				description: 'Channel containing the file to be listed.',
			},
			{
				displayName: 'Show Files Hidden By Limit',
				name: 'showFilesHidden',
				type: 'boolean',
				default: false,
				description: 'Show truncated file info for files hidden due to being too old, and the team who owns the file being over the file limit.',
			},
			{
				displayName: 'Timestamp From',
				name: 'tsFrom',
				type: 'string',
				default: '',
				description: 'Filter files created after this timestamp (inclusive).',
			},
			{
				displayName: 'Timestamp To',
				name: 'tsTo',
				type: 'string',
				default: '',
				description: 'Filter files created before this timestamp (inclusive).',
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
						name: 'Snippets',
						value: 'snippets',
					},
					{
						name: 'Spaces',
						value: 'spaces',
					},
					{
						name: 'pdfs',
						value: 'pdfs',
					},
					{
						name: 'Zips',
						value: 'zips',
					},
				],
				default: ['all'],
				description: 'Filter files by type',
			},
			{
				displayName: 'User',
				name: 'userId',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				description: 'Filter files created by a single user.',
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
				resource: [
					'file',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
	},
];
