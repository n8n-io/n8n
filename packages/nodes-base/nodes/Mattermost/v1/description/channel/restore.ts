import {
	INodeProperties,
} from 'n8n-workflow';

const channelRestoreDescription: INodeProperties[] = [
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

export { channelRestoreDescription };