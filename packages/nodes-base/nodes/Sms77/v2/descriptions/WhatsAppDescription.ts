import type { INodeProperties } from 'n8n-workflow';

export const whatsappOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['whatsapp'],
			},
		},
		options: [
			{
				name: 'Send',
				value: 'send',
				description: 'Send a WhatsApp message',
				action: 'Send a WhatsApp message',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a scheduled WhatsApp message',
				action: 'Delete a scheduled message',
			},
			{
				name: 'Send Event',
				value: 'sendEvent',
				description: 'Send a read, typing, or reaction event',
				action: 'Send a WhatsApp event',
			},
		],
		default: 'send',
	},
];

export const whatsappFields: INodeProperties[] = [
	{
		displayName: 'From',
		name: 'from',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['send', 'sendEvent'],
			},
		},
		description: 'Registered WhatsApp Business sender number in international format',
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['send'],
			},
		},
		description: 'Recipient phone number in international format',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: [
			{ name: 'Audio', value: 'audio' },
			{ name: 'Contacts', value: 'contacts' },
			{ name: 'Document', value: 'document' },
			{ name: 'Image', value: 'image' },
			{ name: 'Interactive', value: 'interactive' },
			{ name: 'Location', value: 'location' },
			{ name: 'Sticker', value: 'sticker' },
			{ name: 'Template', value: 'template' },
			{ name: 'Text', value: 'text' },
			{ name: 'Video', value: 'video' },
		],
		default: 'text',
		required: true,
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['send'],
			},
		},
	},
	// text
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['send'],
				type: ['text'],
			},
		},
		description: 'Free text message (24-hour conversation window required)',
	},
	// template
	{
		displayName: 'Template Name',
		name: 'template',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['send'],
				type: ['template'],
			},
		},
		description: 'Approved template name',
	},
	{
		displayName: 'Language',
		name: 'language',
		type: 'string',
		default: 'en',
		required: true,
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['send'],
				type: ['template'],
			},
		},
		description: 'Language code (e.g. de, en)',
	},
	{
		displayName: 'Components (JSON)',
		name: 'components',
		type: 'json',
		default: '',
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['send'],
				type: ['template'],
			},
		},
		description: 'Template parameter values with optional header, body, buttons',
	},
	// media
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['send'],
				type: ['image', 'video', 'audio', 'document', 'sticker'],
			},
		},
	},
	{
		displayName: 'Caption',
		name: 'caption',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['send'],
				type: ['image', 'video', 'document'],
			},
		},
	},
	{
		displayName: 'Filename',
		name: 'filename',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['send'],
				type: ['document'],
			},
		},
	},
	// location
	{
		displayName: 'Latitude',
		name: 'latitude',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['send'],
				type: ['location'],
			},
		},
	},
	{
		displayName: 'Longitude',
		name: 'longitude',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['send'],
				type: ['location'],
			},
		},
	},
	{
		displayName: 'Location Name',
		name: 'locationName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['send'],
				type: ['location'],
			},
		},
	},
	{
		displayName: 'Address',
		name: 'address',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['send'],
				type: ['location'],
			},
		},
	},
	// contacts
	{
		displayName: 'Contacts (JSON)',
		name: 'contacts',
		type: 'json',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['send'],
				type: ['contacts'],
			},
		},
		description: 'Array of contact objects with name and phones',
	},
	// interactive
	{
		displayName: 'Interactive Payload (JSON)',
		name: 'interactive',
		type: 'json',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['send'],
				type: ['interactive'],
			},
		},
		description:
			'Full interactive payload (button or list, body, buttons/sections, optional header/footer)',
	},
	// generic options
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['send'],
			},
		},
		options: [
			{
				displayName: 'Delay',
				name: 'delay',
				type: 'dateTime',
				default: '',
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
				displayName: 'TTL',
				name: 'ttl',
				type: 'number',
				default: 2880,
				typeOptions: { minValue: 1 },
			},
		],
	},
	// delete
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['delete'],
			},
		},
	},
	// sendEvent
	{
		displayName: 'Event',
		name: 'event',
		type: 'options',
		options: [
			{ name: 'Read', value: 'read' },
			{ name: 'Is Typing', value: 'is_typing' },
			{ name: 'Reaction', value: 'reaction' },
		],
		default: 'read',
		required: true,
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['sendEvent'],
			},
		},
	},
	{
		displayName: 'To',
		name: 'eventTo',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['sendEvent'],
				event: ['read', 'is_typing'],
			},
		},
		description: 'Recipient number. At least one of To or Message ID is required.',
	},
	{
		displayName: 'Message ID',
		name: 'eventMsgId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['sendEvent'],
			},
		},
	},
	{
		displayName: 'Emoji',
		name: 'emoji',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['whatsapp'],
				operation: ['sendEvent'],
				event: ['reaction'],
			},
		},
		description: 'Reaction emoji. Empty string removes the reaction.',
	},
];
