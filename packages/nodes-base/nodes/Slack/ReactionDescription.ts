import { INodeProperties } from 'n8n-workflow';

export const reactionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get the reactions of a message',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a reaction of a message',
			},
		],
		default: 'add',
		description: 'The operation to perform.',
	},
];

export const reactionFields: INodeProperties[] = [
	{
		displayName: 'Channel',
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
		description: 'Channel containing the message.',
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
		description: 'Name of emoji.',
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
		description: `Timestamp of the message.`,
	},
];
