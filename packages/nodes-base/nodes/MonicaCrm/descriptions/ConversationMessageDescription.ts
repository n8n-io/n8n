import type { INodeProperties } from 'n8n-workflow';

export const conversationMessageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['conversationMessage'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a message to a conversation',
				action: 'Add a message to a conversation',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a message in a conversation',
				action: 'Update a message in a conversation',
			},
		],
		default: 'add',
	},
];

export const conversationMessageFields: INodeProperties[] = [
	// ----------------------------------------
	//         conversationMessage: add
	// ----------------------------------------
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		description: 'ID of the contact whose conversation',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['conversationMessage'],
				operation: ['add'],
			},
		},
	},
	{
		displayName: 'Content',
		name: 'content',
		description: 'Content of the message',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['conversationMessage'],
				operation: ['add'],
			},
		},
	},
	{
		displayName: 'Written At',
		name: 'writtenAt',
		description: 'Date when the message was written',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['conversationMessage'],
				operation: ['add'],
			},
		},
	},
	{
		displayName: 'Written By',
		name: 'writtenByMe',
		description: 'Author of the message',
		type: 'options',
		required: true,
		default: true,
		options: [
			{
				name: 'User',
				value: true,
			},
			{
				name: 'Contact',
				value: false,
			},
		],
		displayOptions: {
			show: {
				resource: ['conversationMessage'],
				operation: ['add'],
			},
		},
	},

	// ----------------------------------------
	//       conversationMessage: update
	// ----------------------------------------
	{
		displayName: 'Message ID',
		name: 'messageId',
		description: 'ID of the message to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['conversationMessage'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		description: 'ID of the conversation whose message to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['conversationMessage'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['conversationMessage'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Contact ID',
				name: 'contact_id',
				description: 'ID of the contact to associate the conversationMessage with',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Content',
				name: 'content',
				description: 'Content of the message',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Written At',
				name: 'written_at',
				description: 'Date when the message was written',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Written By',
				name: 'written_by_me',
				description: 'Author of the message',
				type: 'options',
				default: true,
				options: [
					{
						name: 'User',
						value: true,
					},
					{
						name: 'Contact',
						value: false,
					},
				],
			},
		],
	},
];
