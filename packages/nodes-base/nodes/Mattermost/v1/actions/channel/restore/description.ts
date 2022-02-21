import {
	ChannelProperties,
} from '../../Interfaces';

export const channelRestoreDescription: ChannelProperties = [
	{
		displayName: 'Channel ID',
		name: 'channelId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'restore',
				],
				resource: [
					'channel',
				],
			},
		},
		description: 'The ID of the channel to restore.',
	},
];
