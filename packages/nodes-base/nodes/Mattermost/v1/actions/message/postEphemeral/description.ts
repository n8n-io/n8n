import {
	MessageProperties,
} from '../../Interfaces';

export const messagePostEphemeralDescription: MessageProperties = [
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		options: [],
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'postEphemeral',
				],
				resource: [
					'message',
				],
			},
		},
		description: 'ID of the user to send the ephemeral message to.',
	},
	{
		displayName: 'Channel ID',
		name: 'channelId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'postEphemeral',
				],
				resource: [
					'message',
				],
			},
		},
		description: 'ID of the channel to send the ephemeral message in.',
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				operation: [
					'postEphemeral',
				],
				resource: [
					'message',
				],
			},
		},
		description: 'Text to send in the ephemeral message.',
	},
];
