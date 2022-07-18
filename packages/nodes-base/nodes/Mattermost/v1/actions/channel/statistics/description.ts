import {
	ChannelProperties,
} from '../../Interfaces';

export const channelStatisticsDescription: ChannelProperties = [
	{
		displayName: 'Channel Name or ID',
		name: 'channelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		options: [],
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'statistics',
				],
				resource: [
					'channel',
				],
			},
		},
		description: 'The ID of the channel to get the statistics from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
];

