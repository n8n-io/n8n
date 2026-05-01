import type { INodeProperties } from 'n8n-workflow';

export const smsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['sms'],
			},
		},
		options: [
			{
				name: 'Send',
				value: 'send',
				description: 'Send an SMS',
				action: 'Send an SMS',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a scheduled SMS before it has been sent',
				action: 'Delete a scheduled SMS',
			},
		],
		default: 'send',
	},
];

export const smsFields: INodeProperties[] = [
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		default: '',
		placeholder: '+49170123456789, MyGroup',
		required: true,
		displayOptions: {
			show: {
				resource: ['sms'],
				operation: ['send'],
			},
		},
		description:
			'Recipient phone number(s) in E.164 format, separated by commas. Also accepts contact or group names.',
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
				resource: ['sms'],
				operation: ['send'],
			},
		},
		description: 'Message content. Max. 1520 characters.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['sms'],
				operation: ['send'],
			},
		},
		options: [
			{
				displayName: 'Delay',
				name: 'delay',
				type: 'dateTime',
				default: '',
				description: 'Schedule send time (Unix timestamp or YYYY-MM-DD hh:mm:ss)',
			},
			{
				displayName: 'Flash',
				name: 'flash',
				type: 'boolean',
				default: false,
				description: 'Whether to send as flash SMS displayed directly on receiver screen',
			},
			{
				displayName: 'Foreign ID',
				name: 'foreign_id',
				type: 'string',
				default: '',
				description: 'Custom message identifier returned in DLR callbacks (max 64 characters)',
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'string',
				default: '',
				placeholder: 'seven',
				description: 'Sender ID (max 11 alphanumeric or 16 numeric characters)',
			},
			{
				displayName: 'Get Replies',
				name: 'get_replies',
				type: 'boolean',
				default: false,
				description: 'Whether to enable 48-hour reply functionality',
			},
			{
				displayName: 'Is Binary',
				name: 'is_binary',
				type: 'boolean',
				default: false,
				description: 'Whether to send as binary data',
			},
			{
				displayName: 'Label',
				name: 'label',
				type: 'string',
				default: '',
				description: 'Custom label for grouping analytics (max 100 characters)',
			},
			{
				displayName: 'Performance Tracking',
				name: 'performance_tracking',
				type: 'boolean',
				default: false,
				description: 'Whether to enable URL shortening and click tracking',
			},
			{
				displayName: 'TTL',
				name: 'ttl',
				type: 'number',
				default: 2880,
				typeOptions: {
					minValue: 1,
				},
				description: 'Validity period in minutes (default 2880 = 48h)',
			},
			{
				displayName: 'UDH',
				name: 'udh',
				type: 'string',
				default: '',
				description: 'Custom User Data Header for binary SMS',
			},
		],
	},
	{
		displayName: 'Message IDs',
		name: 'ids',
		type: 'string',
		default: '',
		required: true,
		placeholder: '1234567,8901234',
		displayOptions: {
			show: {
				resource: ['sms'],
				operation: ['delete'],
			},
		},
		description: 'Comma-separated list of message IDs to delete (only works for scheduled SMS)',
	},
];
