import { INodeProperties } from 'n8n-workflow';

export const threadOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'thread',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new chat thread',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all chat threads',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const threadFields: INodeProperties[] = [
/* -------------------------------------------------------------------------- */
/*                                thread:create                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'thread',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'conversation ID',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'thread',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				name: 'Chat',
				value: 'chat',
			},
			{
				name: 'Customer',
				value: 'customer',
			},
			{
				name: 'Note',
				value: 'note',
			},
			{
				name: 'Phone',
				value: 'phone',
			},
			{
				name: 'Reply',
				value: 'reply',
			},
		],
		default: '',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		default: '',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'thread',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The chat text',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'thread',
				],
			},
		},
		options: [
			{
				displayName: 'Created At',
				name: 'createdAt',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Customer Email',
				name: 'customerEmail',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Draft',
				name: 'draft',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						'/type': [
							'note',
						],
					},
				},
				description: 'If set to true, a draft reply is created',
			},
			{
				displayName: 'Imported',
				name: 'imported',
				type: 'boolean',
				default: false,
				description: 'When imported is set to true, no outgoing emails or notifications will be generated.',
			},
		],
	},
	{
		displayName: 'Attachments',
		name: 'attachmentsUi',
		placeholder: 'Add Attachments',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'thread',
				],
			},
		},
		options: [
			{
				name: 'attachmentsValues',
				displayName: 'Attachments Values',
				values: [
					{
						displayName: 'FileName',
						name: 'fileName',
						type: 'string',
						default: '',
						description: 'Attachment’s file name',
					},
					{
						displayName: 'Mime Type',
						name: 'mimeType',
						type: 'string',
						default: '',
						description: 'Attachment’s mime type',
					},
					{
						displayName: 'Data',
						name: 'data',
						type: 'string',
						default: '',
						placeholder: 'ZXhhbXBsZSBmaWxl',
						description: 'Base64-encoded stream of data.',
					},
				],
			},
			{
				name: 'attachmentsBinary',
				displayName: 'Attachments Binary',
				values: [
					{
						displayName: 'Property',
						name: 'property',
						type: 'string',
						default: 'data',
						description: 'Name of the binary properties which contain data which should be added to email as attachment',
					},
				],
			},
		],
		default: '',
		description: 'Array of supported attachments to add to the message.',
	},
/* -------------------------------------------------------------------------- */
/*                                thread:getAll                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'thread',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'conversation ID',
	},
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
					'thread',
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
				operation: [
					'getAll',
				],
				resource: [
					'thread',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'How many results to return.',
	},
];
