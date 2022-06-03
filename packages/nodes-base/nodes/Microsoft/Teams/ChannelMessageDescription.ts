import {
	INodeProperties,
} from 'n8n-workflow';

export const channelMessageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'channelMessage',
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
				name: 'Get All',
				value: 'getAll',
				description: 'Get all messages',
			},
		],
		default: 'create',
	},
];

export const channelMessageFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                 channelMessage:create                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team Name or ID',
		name: 'teamId',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'channelMessage',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Channel Name or ID',
		name: 'channelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
			loadOptionsDependsOn: [
				'teamId',
			],
		},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'channelMessage',
				],
			},
		},
		default: '',
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
					'channelMessage',
				],
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
				operation: [
					'create',
				],
				resource: [
					'channelMessage',
				],
			},
		},
		default: '',
		description: 'The content of the item',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'channelMessage',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Make Reply',
				name: 'makeReply',
				type: 'string',
				default: '',
				description: 'An optional ID of the message you want to reply to',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 channelMessage:getAll                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team Name or ID',
		name: 'teamId',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'channelMessage',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Channel Name or ID',
		name: 'channelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
			loadOptionsDependsOn: [
				'teamId',
			],
		},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'channelMessage',
				],
			},
		},
		default: '',
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
					'channelMessage',
				],
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
				operation: [
					'getAll',
				],
				resource: [
					'channelMessage',
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
		default: 50,
		description: 'Max number of results to return',
	},
];
