import type { INodeProperties } from 'n8n-workflow';

export const documentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['document'],
			},
		},
		options: [
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a document',
				action: 'Upload a document',
			},
		],
		default: 'upload',
	},
];

export const documentFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                document:upload                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['upload'],
			},
		},
		description: 'Name of the file',
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['upload'],
			},
		},
		placeholder: '',
		hint: 'The name of the input binary field containing the file to be uploaded',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['upload'],
			},
		},
		options: [
			{
				displayName: 'File Extension',
				name: 'fileExtension',
				type: 'string',
				default: '',
				placeholder: 'pdf',
				description:
					'File extension to use. If none is set, the value from the binary data will be used.',
			},
			{
				displayName: 'Link To Object ID',
				name: 'linkToObjectId',
				type: 'string',
				default: '',
				description: 'ID of the object you want to link this document to',
			},
			{
				displayName: 'Owner',
				name: 'ownerId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a user...',
						typeOptions: {
							searchListMethod: 'searchUsers',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: '0051700000ABCDE',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '^(?:[a-zA-Z0-9]{15}|[a-zA-Z0-9]{18})$',
									errorMessage: 'User ID must be 15 or 18 alphanumeric characters',
								},
							},
						],
					},
				],
				description: 'The user who owns this document',
			},
		],
	},
];
