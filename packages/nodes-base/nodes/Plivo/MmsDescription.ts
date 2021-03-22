import {
	INodeProperties,
} from 'n8n-workflow';

export const mmsOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'mms',
				],
			},
		},
		options: [
			{
				name: 'Send MMS',
				value: 'send mms',
				description: 'Send MMS message',
			},
		],
		default: 'send mms',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const mmsFields = [
	/* -------------------------------------------------------------------------- */
	/*                                 mms: Send MMS                          */
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
					'send mms',
				],
				resource: [
					'mms',
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
					'send mms',
				],
				resource: [
					'mms',
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
		required: false,
		displayOptions: {
			show: {
				operation: [
					'send mms',
				],
				resource: [
					'mms',
				],
			},
		},
		description: 'The message to send',
    },
    {
		displayName: 'Media URLs',
		name: 'media_urls',
		type: 'string',
		default: '',
		required: false,
		displayOptions: {
			show: {
				operation: [
					'send mms',
				],
				resource: [
					'mms',
				],
			},
		},
		description: 'The media URL(s) of the files from your file server',
	},
] as INodeProperties[];