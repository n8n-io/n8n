import {
	INodeProperties,
} from 'n8n-workflow';

const channelDeleteDescription: INodeProperties[] = [
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

export { channelDeleteDescription };