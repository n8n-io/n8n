import { INodeProperties } from 'n8n-workflow';

export const reactionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'reaction',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Adds a reaction to a message',
				action: 'Add a reaction',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get the reactions of a message',
				action: 'Get a reaction',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a reaction of a message',
				action: 'Remove a reaction',
			},
		],
		default: 'add',
	},
];

export const reactionFields: INodeProperties[] = [
	{
		displayName: 'Channel Name or ID',
		name: 'channelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'reaction',
				],
				operation: [
					'add',
					'get',
					'remove',
				],
			},
		},
		description: 'Channel containing the message. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
	},
	{
		displayName: 'Emoji',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'reaction',
				],
				operation: [
					'add',
					'remove',
				],
			},
		},
		description: 'Name of emoji',
		placeholder: '+1',
	},
	{
		displayName: 'Timestamp',
		name: 'timestamp',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'reaction',
				],
				operation: [
					'add',
					'get',
					'remove',
				],
			},
		},
		description: 'Timestamp of the message',
	},
];
