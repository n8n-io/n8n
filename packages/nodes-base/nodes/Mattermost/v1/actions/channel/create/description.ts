import {
	ChannelProperties,
} from '../../Interfaces';

export const channelCreateDescription: ChannelProperties = [
	{
		displayName: 'Team Name or ID',
		name: 'teamId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		options: [],
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'channel',
				],
			},
		},
		description: 'The Mattermost Team. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Display Name',
		name: 'displayName',
		type: 'string',
		default: '',
		placeholder: 'Announcements',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'channel',
				],
			},
		},
		required: true,
		description: 'The non-unique UI name for the channel',
	},
	{
		displayName: 'Name',
		name: 'channel',
		type: 'string',
		default: '',
		placeholder: 'announcements',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'channel',
				],
			},
		},
		required: true,
		description: 'The unique handle for the channel, will be present in the channel URL',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'channel',
				],
			},
		},
		options: [
			{
				name: 'Private',
				value: 'private',
			},
			{
				name: 'Public',
				value: 'public',
			},
		],
		default: 'public',
		description: 'The type of channel to create',
	},
];
