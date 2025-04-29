import type { INodeProperties } from 'n8n-workflow';

export const chatOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['chat'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new chat session',
				action: 'Create a new chat session',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a chat session',
				action: 'Delete a chat session',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get chat session details',
				action: 'Get chat session details',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all chat sessions',
				action: 'List all chat sessions',
			},
			{
				name: 'Send',
				value: 'send',
				description: 'Send a message in a chat session',
				action: 'Send a message in a chat session',
			},
		],
		default: 'list',
	},
];

export const chatFields: INodeProperties[] = [
	{
		displayName: 'Chat ID',
		name: 'chatId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete', 'get', 'send'],
				resource: ['chat'],
			},
		},
		default: '',
		description: 'The unique identifier of the chat session',
	},
	{
		displayName: 'Agent ID',
		name: 'agentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['chat'],
			},
		},
		default: '',
		description: 'The ID of the agent to chat with',
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		displayOptions: {
			show: {
				operation: ['send'],
				resource: ['chat'],
			},
		},
		default: '',
		description: 'The message to send in the chat',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['list'],
				resource: ['chat'],
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
				operation: ['list'],
				resource: ['chat'],
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
];
