import {
	INodeProperties,
} from 'n8n-workflow';

export const smsOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'sms',
				],
			},
		},
		options: [
			{
				name: 'Send SMS',
				value: 'send sms',
				description: 'Send SMS message',
			},
		],
		default: 'send sms',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const smsFields = [
	/* -------------------------------------------------------------------------- */
	/*                                 sms: Send SMS                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'From',
		name: 'from',
		type: 'string',
		default: '',
		placeholder: '+14156667777',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'send sms',
				],
				resource: [
					'sms',
				],
			},
		},
		description: 'The Plivo Number from which you wish to send the message',
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		default: '',
		placeholder: '+14156667778',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'send sms',
				],
				resource: [
					'sms',
				],
			},
		},
		description: 'The phone number to which you wish to send the message',
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'send sms',
				],
				resource: [
					'sms',
				],
			},
		},
		description: 'The message to send',
	},
] as INodeProperties[];