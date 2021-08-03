import {
	INodeProperties,
} from 'n8n-workflow';

export const conversationOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'conversation',
				],
			},
		},
		options: [
			{
				name: 'Add Message',
				value: 'addMessage',
				description: 'Add a message to a conversation',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a conversation',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a conversation',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a conversation',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a conversation',
			},
			{
				name: 'Update Message',
				value: 'updateMessage',
				description: 'Update a message in a conversation',
			},
		],
		default: 'create',
	},
] as INodeProperties[];

export const conversationFields = [
	// ----------------------------------------
	//         conversation: addMessage
	// ----------------------------------------
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		description: 'ID of the contact whose conversations to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'conversation',
				],
				operation: [
					'addMessage',
				],
			},
		},
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of the contact to associate the conversation with',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'conversation',
				],
				operation: [
					'addMessage',
				],
			},
		},
	},
	{
		displayName: 'Description',
		name: 'content',
		description: 'Description of the message',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'conversation',
				],
				operation: [
					'addMessage',
				],
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
				resource: [
					'conversation',
				],
				operation: [
					'addMessage',
				],
			},
		},
	},
	{
		displayName: 'Written By',
		name: 'writtenByMe',
		description: 'Author of the message',
		type: 'options',
		required: true,
		default: 'user',
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
				resource: [
					'conversation',
				],
				operation: [
					'addMessage',
				],
			},
		},
	},

	// ----------------------------------------
	//           conversation: create
	// ----------------------------------------
	{
		displayName: 'Contact Field Type',
		name: 'contactFieldTypeId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getContactFieldTypes',
		},
		displayOptions: {
			show: {
				resource: [
					'conversation',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of the contact to associate the conversation with',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'conversation',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Happened At',
		name: 'happenedAt',
		description: 'Date when the conversation happened',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'conversation',
				],
				operation: [
					'create',
				],
			},
		},
	},

	// ----------------------------------------
	//           conversation: delete
	// ----------------------------------------
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		description: 'ID of the conversation to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'conversation',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//            conversation: get
	// ----------------------------------------
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		description: 'ID of the conversation to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'conversation',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//           conversation: update
	// ----------------------------------------
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		description: 'ID of the conversation to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'conversation',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Contact Field Type',
		name: 'contactFieldTypeId',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getContactFieldTypes',
		},
		displayOptions: {
			show: {
				resource: [
					'conversation',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Happened At',
		name: 'happenedAt',
		description: 'Date when the conversation happened',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'conversation',
				],
				operation: [
					'update',
				],
			},
		},
	},

	// ----------------------------------------
	//       conversation: updateMessage
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
				resource: [
					'conversation',
				],
				operation: [
					'updateMessage',
				],
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
				resource: [
					'conversation',
				],
				operation: [
					'updateMessage',
				],
			},
		},
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		description: 'ID of the contact to associate the conversation with',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'conversation',
				],
				operation: [
					'updateMessage',
				],
			},
		},
	},
	{
		displayName: 'Description',
		name: 'content',
		description: 'Description of the message',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'conversation',
				],
				operation: [
					'updateMessage',
				],
			},
		},
	},
	{
		displayName: 'Written By',
		name: 'writtenByMe',
		description: 'Author of the message',
		type: 'options',
		required: true,
		default: 'user',
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
				resource: [
					'conversation',
				],
				operation: [
					'updateMessage',
				],
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
				resource: [
					'conversation',
				],
				operation: [
					'updateMessage',
				],
			},
		},
	},
] as INodeProperties[];
