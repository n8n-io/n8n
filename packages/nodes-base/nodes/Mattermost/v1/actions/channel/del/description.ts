import {
	ChannelProperties,
} from '../../Interfaces';

export const channelDeleteDescription: ChannelProperties = [
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
					'delete',
				],
				resource: [
					'channel',
				],
			},
		},
		description: 'The ID of the channel to soft delete',
	},
];
