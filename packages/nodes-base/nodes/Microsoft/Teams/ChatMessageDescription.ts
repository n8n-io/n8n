import { INodeProperties } from 'n8n-workflow';

export const chatMessageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['chatMessage'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a message',
				action: 'Create a chat message',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a message',
				action: 'Get a chat message',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many messages',
				action: 'Get many chat messages',
			},
		],
		default: 'create',
	},
];

export const chatMessageFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 chatMessage:create                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Chat',
		name: 'chatId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'Chat',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Chat...',
				typeOptions: {
					searchListMethod: 'getChats',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: '19:7e2f1174-e8ee-4859-b8b1-a8d1cc63d276_0c5cfdbb-596f-4d39-b557-5d9516c94107@unq.gbl.spaces',
				// validation missing because no documentation found how these unique chat ids look like.
				url: '=https://teams.microsoft.com/l/chat/{{encodeURIComponent($value)}}',
			},
		],
		displayOptions: {
			show: {
				operation: ['create', 'get'],
				resource: ['chatMessage'],
			},
		},
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
				operation: ['create'],
				resource: ['chatMessage'],
			},
		},
		default: 'text',
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
				operation: ['create'],
				resource: ['chatMessage'],
			},
		},
		default: '',
		description: 'The content of the item',
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
				operation: ['get'],
				resource: ['chatMessage'],
			},
		},
		default: '',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 chatMessage:getAll                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Chat',
		name: 'chatId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'Chat',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Chat...',
				typeOptions: {
					searchListMethod: 'getChats',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: '19:7e2f1174-e8ee-4859-b8b1-a8d1cc63d276_0c5cfdbb-596f-4d39-b557-5d9516c94107@unq.gbl.spaces',
				// validation missing because no documentation found how these unique chat ids look like.
				url: '=https://teams.microsoft.com/l/chat/{{encodeURIComponent($value)}}',
			},
		],
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['chatMessage'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['chatMessage'],
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
				operation: ['getAll'],
				resource: ['chatMessage'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 50,
		description: 'Max number of results to return',
	},
];
