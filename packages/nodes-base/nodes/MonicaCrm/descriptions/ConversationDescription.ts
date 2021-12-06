import {
	INodeProperties,
} from 'n8n-workflow';

export const conversationOperations: INodeProperties[] = [
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
		],
		default: 'create',
	},
];

export const conversationFields: INodeProperties[] = [
	// ----------------------------------------
	//           conversation: create
	// ----------------------------------------
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
];
