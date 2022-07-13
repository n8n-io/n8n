import { IDataObject, INodeProperties } from 'n8n-workflow';
import { addTemplateComponents } from './MessageFunctions';

export const mediaTypes = ['image', 'video', 'audio', 'sticker', 'document'];

export const messageFields: INodeProperties[] = [
	{
		displayName: 'Operation',
		noDataExpression: true,
		name: 'operation',
		type: 'options',
		placeholder: '',
		options: [
			{
				name: 'Send Audio',
				value: 'audio',
			},
			{
				name: 'Send Document',
				value: 'document',
			},
			{
				name: 'Send Image',
				value: 'image',
			},
			{
				name: 'Send Template',
				value: 'template',
			},
			{
				name: 'Send Text',
				value: 'text',
			},
			{
				name: 'Send Video',
				value: 'video',
			},
		],
		default: 'template',
		description: 'The type of the message',
		routing: {
			send: {
				type: 'body',
				property: 'type',
			},
		},
		displayOptions: {
			show: {
				resource: ['messages'],
			},
		},
	},

	{
		displayName: 'Messaging Product',
		name: 'messagingProduct',
		default: 'whatsapp',
		type: 'hidden',
		routing: {
			send: {
				type: 'body',
				property: 'messaging_product',
			},
		},
		displayOptions: {
			show: {
				resource: ['messages'],
			},
		},
	},
	{
		displayName: 'Phone Number ID',
		name: 'phoneNumberId',
		type: 'string',
		default: '',
		placeholder: '',
		required: true,
		description:
			"The ID of the business account's phone number from which the message will be sent from",
		routing: {
			request: {
				method: 'POST',
				url: '={{$value}}/messages',
			},
		},
		displayOptions: {
			show: {
				resource: ['messages'],
			},
		},
	},
	{
		displayName: "Recipient's Phone Number",
		name: 'recipientPhoneNumber',
		type: 'string',
		default: '',
		description:
			'Phone number of the recipient of the message, starting with the country code without the leading +',
		routing: {
			send: {
				type: 'body',
				property: 'to',
			},
		},
		displayOptions: {
			show: {
				resource: ['messages'],
			},
		},
	},
];

export const messageTypeFields: INodeProperties[] = [
	// ----------------------------------
	//         type: text
	// ----------------------------------
	{
		displayName: 'Text Body',
		name: 'textBody',
		type: 'string',
		default: '',
		description: 'The body of the message (max 4096 characters)',
		displayOptions: {
			show: {
				operation: ['text'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'text.body',
			},
		},
	},
	// ----------------------------------
	//         type: media
	// ----------------------------------
	{
		displayName: 'Link or ID',
		name: 'mediaPath',
		type: 'options',
		default: 'useMediaLink',
		description: 'Use a link or an ID to upload a media file',
		options: [
			{
				name: 'Link',
				value: 'useMediaLink',
				description:
					'When using a link, WhatsApp will download the media, saving you the step of uploading media yourself',
			},
			{
				name: 'ID',
				value: 'useMediaId',
				description: 'You can use an ID if you have already uploaded the media to WhatsApp',
			},
		],
		displayOptions: {
			show: {
				operation: mediaTypes,
			},
		},
	},
	{
		displayName: 'Link',
		name: 'mediaLink',
		type: 'string',
		default: '',
		description: 'Link of the media to be sent',
		displayOptions: {
			show: {
				operation: mediaTypes,
				mediaPath: ['useMediaLink'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: '={{$parameter["operation"]}}.link',
			},
		},
	},
	{
		displayName: 'ID',
		name: 'mediaId',
		type: 'string',
		default: '',
		description: 'ID of the media to be sent',
		displayOptions: {
			show: {
				operation: mediaTypes,
				mediaPath: ['useMediaId'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: '={{$parameter["operation"]}}.id',
			},
		},
	},
	{
		displayName: 'Filename',
		name: 'mediaFilename',
		type: 'string',
		default: '',
		description: 'The name of the file (required when using a file ID)',
		displayOptions: {
			show: {
				operation: ['document'],
				mediaPath: ['useMediaId'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: '={{$parameter["operation"]}}.filename',
			},
		},
	},
	{
		displayName: 'Media Caption',
		name: 'mediaCaption',
		type: 'string',
		default: '',
		description: 'The caption of the media',
		displayOptions: {
			show: {
				operation: ['image', 'video', 'document'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: '={{$parameter["operation"]}}.caption',
			},
		},
	},

	// ----------------------------------
	//         type: template
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'templateName',
		default: '',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['template'],
				resource: ['messages'],
			},
		},
		required: true,
		description: 'Name of the template',
		routing: {
			send: {
				type: 'body',
				property: 'template.name',
			},
		},
	},
	{
		//TODO: would be nice to change this to a searchable dropdown with all the possible language codes
		displayName: 'Language Code',
		name: 'templateLanguageCode',
		type: 'string',
		default: 'en_US',
		displayOptions: {
			show: {
				operation: ['template'],
				resource: ['messages'],
			},
		},
		description:
			'The code of the language or locale to use. Accepts both language and language_locale formats (e.g., en and en_US).',
		routing: {
			send: {
				type: 'body',
				property: 'template.language.code',
			},
		},
	},
	{
		displayName: 'Template Components',
		name: 'templateComponents',
		placeholder: 'Add Component',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: ['template'],
				resource: ['messages'],
			},
		},
		default: {},
		routing: {
			send: {
				preSend: [addTemplateComponents],
			},
		},
		options: [
			{
				displayName: 'Component',
				name: 'component',
				values: [
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'Body',
								value: 'body',
							},
							// TODO: Sort this out
							{
								name: 'Button',
								value: 'button',
							},
							{
								name: 'Header',
								value: 'header',
							},
						],
						default: 'body',
					},
					{
						displayName: 'Parameters',
						name: 'parameters',
						type: 'fixedCollection',
						default: {},
						typeOptions: {
							multipleValues: true,
						},
						placeholder: 'Add Parameter',
						options: [
							{
								displayName: 'Parameter',
								name: 'parameter',
								values: [
									// TODO: Multiple types
									// {
									// 	displayName: 'Type',
									// 	name: 'type',
									// 	type: 'options',
									// 	options: [
									// 		{
									// 			name: 'Text',
									// 			value: 'text',
									// 		},
									// 		{
									// 			name: 'Currency',
									// 			value: 'currency',
									// 		},
									// 	],
									// 	default: 'text',
									// },
									{
										displayName: 'Type',
										type: 'hidden',
										name: 'type',
										default: 'text',
									},
									{
										displayName: 'Text',
										name: 'text',
										default: '',
										type: 'string',
									},
								],
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['messages'],
				operation: ['text'],
			},
		},
		options: [
			{
				displayName: 'Preview URL',
				name: 'previewUrl',
				type: 'boolean',
				default: false,
				description: 'Whether to display URL previews in text messages',
				routing: {
					send: {
						type: 'body',
						property: 'text.preview_url',
					},
				},
			},
		],
	},
];
