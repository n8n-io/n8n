import type { INodeProperties } from 'n8n-workflow';

export const voiceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['voice'],
			},
		},
		options: [
			{
				name: 'Send',
				value: 'send',
				description: 'Make a text-to-speech call',
				action: 'Make a text-to-speech call',
			},
			{
				name: 'Hang Up',
				value: 'hangup',
				description: 'Terminate an active call',
				action: 'Terminate an active call',
			},
		],
		default: 'send',
	},
];

export const voiceFields: INodeProperties[] = [
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		default: '',
		required: true,
		placeholder: '+49170123456789',
		displayOptions: {
			show: {
				resource: ['voice'],
				operation: ['send'],
			},
		},
		description: 'Recipient phone number in E.164 format, contact, or group name',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['voice'],
				operation: ['send'],
			},
		},
		description: 'Message text. Optionally formatted as SSML.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['voice'],
				operation: ['send'],
			},
		},
		options: [
			{
				displayName: 'From',
				name: 'from',
				type: 'string',
				default: '',
				description: 'Verified caller ID or booked number',
			},
			{
				displayName: 'Foreign ID',
				name: 'foreign_id',
				type: 'string',
				default: '',
				description: 'Unique identifier for webhook tracking',
			},
			{
				displayName: 'Ring Time',
				name: 'ringtime',
				type: 'number',
				typeOptions: {
					minValue: 5,
					maxValue: 60,
				},
				default: 30,
				description: 'Ring duration in seconds (5-60)',
			},
		],
	},
	{
		displayName: 'Call ID',
		name: 'callId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['voice'],
				operation: ['hangup'],
			},
		},
		description: 'Identifier of the call to terminate',
	},
];
