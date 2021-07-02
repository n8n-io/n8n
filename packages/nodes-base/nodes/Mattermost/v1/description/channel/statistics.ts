import {
	ChannelProperties,
} from '../../actions/Interfaces';

export const channelStatisticsDescription: ChannelProperties = [
	{
		displayName: 'Channel ID',
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
		description: 'The ID of the channel to get the statistics from.',
	},
];

