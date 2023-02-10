import type { INodeProperties } from 'n8n-workflow';

export const reactionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['reaction'],
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
		displayName: 'Channel',
		name: 'channelId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		placeholder: 'Select a channel...',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a channel...',
				typeOptions: {
					searchListMethod: 'getChannels',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[a-zA-Z0-9]{2,}',
							errorMessage: 'Not a valid Slack Channel ID',
						},
					},
				],
				placeholder: 'C0122KQ70S7E',
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'https://app.slack.com/client/TS9594PZK/B0556F47Z3A',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'http(s)?://app.slack.com/client/.*/([a-zA-Z0-9]{2,})',
							errorMessage: 'Not a valid Slack Channel URL',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: 'https://app.slack.com/client/.*/([a-zA-Z0-9]{2,})',
				},
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['reaction'],
				operation: ['add', 'get', 'remove'],
			},
		},
		description: 'The Slack channel to get the reactions from',
	},
	{
		displayName: 'Message Timestamp',
		name: 'timestamp',
		required: true,
		type: 'number',
		default: undefined,
		displayOptions: {
			show: {
				resource: ['reaction'],
				operation: ['add', 'get', 'remove'],
			},
		},
		description: 'Timestamp of the message to add, get or remove',
		placeholder: '1663233118.856619',
	},
	{
		displayName: 'Emoji Code',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['reaction'],
				operation: ['add', 'remove'],
			},
		},
		description:
			'Emoji code to use for the message reaction. Use emoji codes like +1, not an actual emoji like 👍. <a target="_blank" href=" https://www.webfx.com/tools/emoji-cheat-sheet/">List of common emoji codes</a>',
		placeholder: '+1',
	},
];
