import {
	ChannelProperties,
} from '../../Interfaces';

export const channelSearchDescription: ChannelProperties = [
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
					'search',
				],
				resource: [
					'channel',
				],
			},
		},
		description: 'The Mattermost Team.',
	},
	{
		displayName: 'Search Term',
		name: 'term',
		type: 'string',
		default: '',
		placeholder: 'General',
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'channel',
				],
			},
		},
		required: true,
		description: 'The search term for Channels in a Team',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results',
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'channel',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 100,
		description: 'The number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'channel',
				],
				returnAll: [
					false,
				],
			},
		},
	},
];
