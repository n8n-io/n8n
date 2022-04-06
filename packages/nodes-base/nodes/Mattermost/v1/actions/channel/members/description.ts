import {
	ChannelProperties,
} from '../../Interfaces';

export const channelMembersDescription: ChannelProperties = [
	{
		displayName: 'Team ID',
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
					'members',
				],
				resource: [
					'channel',
				],
			},
		},
		description: 'The Mattermost Team.',
	},
	{
		displayName: 'Channel ID',
		name: 'channelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannelsInTeam',
			loadOptionsDependsOn: [
				'teamId',
			],
		},
		options: [],
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'members',
				],
				resource: [
					'channel',
				],
			},
		},
		description: 'The Mattermost Team.',
	},
	{
		displayName: 'Resolve Data',
		name: 'resolveData',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'channel',
				],
				operation: [
					'members',
				],
			},
		},
		default: true,
		description: 'By default the response only contain the ID of the user. If this option gets activated, it will resolve the user automatically.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'members',
				],
				resource: [
					'channel',
				],
			},
		},
		default: true,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'members',
				],
				resource: [
					'channel',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'How many results to return.',
	},
];

