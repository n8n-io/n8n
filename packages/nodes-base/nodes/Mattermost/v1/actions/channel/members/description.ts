import type { ChannelProperties } from '../../Interfaces';

export const channelMembersDescription: ChannelProperties = [
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
				operation: ['members'],
				resource: ['channel'],
			},
		},
		description:
			'The Mattermost Team. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Channel Name or ID',
		name: 'channelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannelsInTeam',
			loadOptionsDependsOn: ['teamId'],
		},
		options: [],
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['members'],
				resource: ['channel'],
			},
		},
		description:
			'The Mattermost Team. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Resolve Data',
		name: 'resolveData',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['members'],
			},
		},
		default: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
		description:
			'By default the response only contain the ID of the user. If this option gets activated, it will resolve the user automatically.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['members'],
				resource: ['channel'],
			},
		},
		default: true,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['members'],
				resource: ['channel'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Max number of results to return',
	},
];
