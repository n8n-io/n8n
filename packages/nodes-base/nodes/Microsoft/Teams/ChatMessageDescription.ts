import {
	INodeProperties,
} from 'n8n-workflow';

export const chatMessageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'chatMessage',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a message',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a message',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all messages',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const chatMessageFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                 chatMessage:create                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Chat ID',
		name: 'chatId',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChats',
		},
		displayOptions: {
			show: {
				operation: [
					'create',
					'get',
				],
				resource: [
					'chatMessage',
				],
			},
		},
		default: '',
		description: 'Chat ID',
	},
	{
		displayName: 'Message Type',
		name: 'messageType',
		required: true,
		type: 'options',
		options: [
			{
				name: 'Text',
				value: 'text',
			},
			{
				name: 'HTML',
				value: 'html',
			},
		],
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'chatMessage',
				],
			},
		},
		default: '',
		description: 'The type of the content',
	},
	{
		displayName: 'Message',
		name: 'message',
		required: true,
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'chatMessage',
				],
			},
		},
		default: '',
		description: 'The content of the item.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 chatMessage:get                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Message ID',
		name: 'messageId',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'chatMessage',
				],
			},
		},
		default: '',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 chatMessage:getAll                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Chat ID',
		name: 'chatId',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChats',
		},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'chatMessage',
				],
			},
		},
		default: '',
		description: 'Chat ID',
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
					'chatMessage',
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
					'chatMessage',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
];
