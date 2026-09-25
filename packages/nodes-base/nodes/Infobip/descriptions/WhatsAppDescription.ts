import type { INodeProperties } from 'n8n-workflow';

export const whatsAppOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['whatsApp'],
			},
		},
		options: [
			{
				name: 'Send Template',
				value: 'sendTemplate',
				description: 'Send a pre-approved template message',
				action: 'Send a WhatsApp template message',
				routing: {
					request: {
						method: 'POST',
						url: '/whatsapp/1/message/template',
						body: {
							messages: [
								{
									from: '={{ $parameter["from"] }}',
									to: '={{ $parameter["to"] }}',
									content: {
										templateName: '={{ $parameter["templateName"] }}',
										language: '={{ $parameter["language"] }}',
										templateData: {
											body: {
												placeholders:
													'={{ ($parameter["placeholders"]["values"] ?? []).map((p) => p.value) }}',
											},
										},
									},
								},
							],
						},
					},
				},
			},
			{
				name: 'Send Text',
				value: 'sendText',
				description:
					'Send a free-form text message. Only allowed within 24 hours of the last message from the user.',
				action: 'Send a WhatsApp text message',
				routing: {
					request: {
						method: 'POST',
						url: '/whatsapp/1/message/text',
						body: {
							from: '={{ $parameter["from"] }}',
							to: '={{ $parameter["to"] }}',
							content: {
								text: '={{ $parameter["text"] }}',
								previewUrl: '={{ $parameter["options"]["previewUrl"] }}',
							},
						},
					},
				},
			},
		],
		default: 'sendTemplate',
	},
];

export const whatsAppFields: INodeProperties[] = [
	{
		displayName: 'From',
		name: 'from',
		type: 'string',
		required: true,
		default: '',
		placeholder: '441134960000',
		description: 'The WhatsApp sender number that is registered in your account',
		displayOptions: {
			show: {
				resource: ['whatsApp'],
			},
		},
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		required: true,
		default: '',
		placeholder: '441134960001',
		description: 'The phone number of the recipient, in international format',
		displayOptions: {
			show: {
				resource: ['whatsApp'],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                           whatsApp:sendTemplate                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Template Name',
		name: 'templateName',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of an approved template in your account',
		displayOptions: {
			show: {
				resource: ['whatsApp'],
				operation: ['sendTemplate'],
			},
		},
	},
	{
		displayName: 'Language',
		name: 'language',
		type: 'string',
		required: true,
		default: 'en',
		description: 'The language code of the template, for example "en" or "en_GB"',
		displayOptions: {
			show: {
				resource: ['whatsApp'],
				operation: ['sendTemplate'],
			},
		},
	},
	{
		displayName: 'Placeholders',
		name: 'placeholders',
		type: 'fixedCollection',
		placeholder: 'Add placeholder',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		description: 'The values for the placeholders in the template body, in order',
		displayOptions: {
			show: {
				resource: ['whatsApp'],
				operation: ['sendTemplate'],
			},
		},
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                             whatsApp:sendText                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Message',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		typeOptions: {
			rows: 3,
		},
		displayOptions: {
			show: {
				resource: ['whatsApp'],
				operation: ['sendText'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['whatsApp'],
				operation: ['sendText'],
			},
		},
		options: [
			{
				displayName: 'Preview URL',
				name: 'previewUrl',
				type: 'boolean',
				default: false,
				description: 'Whether to show a preview of the first URL in the message',
			},
		],
	},
];
