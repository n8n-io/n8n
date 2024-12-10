import type { INodeProperties } from 'n8n-workflow';

export const knowledgeBaseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['knowledgeBase'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a knowledge base',
				routing: {
					request: {
						method: 'POST',
						url: '/create-knowledge-base',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a knowledge base',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/delete-knowledge-base/{{$parameter.knowledgeBaseId}}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a knowledge base',
				routing: {
					request: {
						method: 'GET',
						url: '=/get-knowledge-base/{{$parameter.knowledgeBaseId}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many knowledge bases',
				routing: {
					request: {
						method: 'GET',
						url: '/list-knowledge-bases',
					},
				},
			},
		],
		default: 'create',
	},
];

export const knowledgeBaseFields: INodeProperties[] = [
	// Create operation fields
	{
		displayName: 'Name',
		name: 'knowledgeBaseName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['knowledgeBase'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Name of the knowledge base (max 40 characters)',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				resource: ['knowledgeBase'],
				operation: ['create'],
			},
		},
		description: 'Name of the binary property containing the file data to upload',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['knowledgeBase'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Knowledge Base Texts',
				name: 'knowledgeBaseTexts',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'textValue',
						displayName: 'Text',
						values: [
							{
								displayName: 'Text',
								name: 'text',
								type: 'string',
								default: '',
								typeOptions: {
									rows: 4,
								},
							},
							{
								displayName: 'Title',
								name: 'title',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Knowledge Base URLs',
				name: 'knowledgeBaseUrls',
				type: 'string',
				default: '',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'https://example.com',
				description: 'URLs to be scraped and added to the knowledge base',
			},
			{
				displayName: 'Enable Auto Refresh',
				name: 'enableAutoRefresh',
				type: 'boolean',
				default: false,
				description: 'Whether to enable auto refresh for the knowledge base URLs (every 12 hours)',
			},
		],
	},
	// Get operation fields
	{
		displayName: 'Knowledge Base ID',
		name: 'knowledgeBaseId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['knowledgeBase'],
				operation: ['get', 'delete'],
			},
		},
		default: '',
		description: 'The ID of the knowledge base',
	},
];