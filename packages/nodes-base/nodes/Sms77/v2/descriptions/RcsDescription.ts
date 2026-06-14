import type { INodeProperties } from 'n8n-workflow';

export const rcsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['rcs'],
			},
		},
		options: [
			{
				name: 'Send',
				value: 'send',
				description: 'Send an RCS message',
				action: 'Send an RCS message',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Revoke an undelivered RCS message',
				action: 'Revoke an RCS message',
			},
			{
				name: 'Send Event',
				value: 'sendEvent',
				description: 'Send a typing or read event',
				action: 'Send an RCS event',
			},
		],
		default: 'send',
	},
];

export const rcsFields: INodeProperties[] = [
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['rcs'],
				operation: ['send', 'sendEvent'],
			},
		},
		description: 'Recipient number, contact, or group name',
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
				resource: ['rcs'],
				operation: ['send'],
			},
		},
		description:
			'Plain text content. For rich content, send a JSON object via Additional Fields > Content.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['rcs'],
				operation: ['send'],
			},
		},
		options: [
			{
				displayName: 'From (Agent ID)',
				name: 'from',
				type: 'string',
				default: '',
				description: 'Agent unique ID. Defaults to first RCS-capable sender.',
			},
			{
				displayName: 'Delay',
				name: 'delay',
				type: 'dateTime',
				default: '',
				description: 'Scheduled delivery time',
			},
			{
				displayName: 'Fallback (JSON)',
				name: 'fallback',
				type: 'string',
				default: '',
				placeholder: 'sms',
				description:
					'Fallback channel ("sms", "webview") or custom JSON object for delivery failures',
			},
			{
				displayName: 'Foreign ID',
				name: 'foreign_id',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Label',
				name: 'label',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Performance Tracking',
				name: 'performance_tracking',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Rich Content (JSON)',
				name: 'richContent',
				type: 'json',
				default: '',
				description: 'RCS rich content object. If set, replaces the plain Text parameter.',
			},
			{
				displayName: 'TTL',
				name: 'ttl',
				type: 'number',
				default: 2880,
				typeOptions: { minValue: 1 },
				description: 'Validity period in minutes (default 2880)',
			},
		],
	},
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['rcs'],
				operation: ['delete'],
			},
		},
		description: 'ID of the RCS message to revoke',
	},
	{
		displayName: 'Event',
		name: 'event',
		type: 'options',
		options: [
			{ name: 'Is Typing', value: 'IS_TYPING' },
			{ name: 'Read', value: 'READ' },
		],
		default: 'IS_TYPING',
		required: true,
		displayOptions: {
			show: {
				resource: ['rcs'],
				operation: ['sendEvent'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['rcs'],
				operation: ['sendEvent'],
			},
		},
		options: [
			{
				displayName: 'Message ID',
				name: 'msg_id',
				type: 'string',
				default: '',
				description: 'RCS message ID. Defaults to last received message.',
			},
		],
	},
];
