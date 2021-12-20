import {
	INodeProperties,
} from 'n8n-workflow';

export const mmsOperations: INodeProperties[] = [
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
				name: 'Send',
				value: 'send',
				description: 'Send an MMS message (US/Canada only)',
			},
		],
		default: 'send',
		description: 'Operation to perform.',
	},
];

export const mmsFields: INodeProperties[] = [
	// ----------------------------------
	//           mms: send
	// ----------------------------------
	{
		displayName: 'From',
		name: 'from',
		type: 'string',
		default: '',
		description: 'Plivo Number to send the MMS from.',
		placeholder: '+14156667777',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'mms',
				],
				operation: [
					'send',
				],
			},
		},
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		default: '',
		description: 'Phone number to send the MMS to.',
		placeholder: '+14156667778',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'send',
				],
				resource: [
					'mms',
				],
			},
		},
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		default: '',
		description: 'Message to send.',
		required: false,
		displayOptions: {
			show: {
				resource: [
					'mms',
				],
				operation: [
					'send',
				],
			},
		},
	},
	{
		displayName: 'Media URLs',
		name: 'media_urls',
		type: 'string',
		default: '',
		required: false,
		displayOptions: {
			show: {
				resource: [
					'mms',
				],
				operation: [
					'send',
				],
			},
		},
		description: 'Comma-separated list of media URLs of the files from your file server.',
	},
];
