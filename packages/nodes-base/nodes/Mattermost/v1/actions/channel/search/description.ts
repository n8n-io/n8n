import {
	ChannelProperties,
} from '../../Interfaces';

export const channelCreateDescription: ChannelProperties = [
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
];
