import { IDataObject, INodeProperties } from 'n8n-workflow';
import { addTemplateComponents } from './MessageFunctions';

export const mediaTypes = ['image', 'video', 'audio', 'sticker', 'document'];

export const messageFields: INodeProperties[] = [
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
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		placeholder: '',
		options: [
			{
				name: 'Audio',
				value: 'audio',
			},
			{
				name: 'Document',
				value: 'document',
			},
			{
				name: 'Image',
				value: 'image',
			},
			{
				name: 'Template',
				value: 'template',
			},
			{
				name: 'Text',
				value: 'text',
			},
			{
				name: 'Video',
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
				type: ['text'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'text.body',
			},
		},
	},
	{
		displayName: 'Preview URL',
		name: 'previewUrl',
		type: 'boolean',
		default: false,
		description: 'Whether to display URL previews in text messages',
		displayOptions: {
			show: {
				type: ['text'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'text.preview_url',
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
				type: mediaTypes,
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
				type: mediaTypes,
				mediaPath: ['useMediaLink'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: '={{$parameter["type"]}}.link',
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
				type: mediaTypes,
				mediaPath: ['useMediaId'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: '={{$parameter["type"]}}.id',
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
				type: ['document'],
				mediaPath: ['useMediaId'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: '={{$parameter["type"]}}.filename',
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
				type: ['image', 'video', 'document'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: '={{$parameter["type"]}}.caption',
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
				type: ['template'],
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
				type: ['template'],
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
			show: { type: ['template'] },
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
];
