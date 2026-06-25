import type { INodeProperties } from 'n8n-workflow';

export const senderIdOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['senderId'],
			},
		},
		options: [
			{
				name: 'Validate for Voice',
				value: 'validateForVoice',
				description: 'Validate a phone number for use as a voice sender identity',
				action: 'Validate a number for voice',
			},
		],
		default: 'validateForVoice',
	},
];

export const senderIdFields: INodeProperties[] = [
	{
		displayName: 'Number',
		name: 'number',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['senderId'],
				operation: ['validateForVoice'],
			},
		},
	},
	{
		displayName: 'Callback URL',
		name: 'callback',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['senderId'],
				operation: ['validateForVoice'],
			},
		},
		description: 'URL to receive notification upon successful validation',
	},
];
