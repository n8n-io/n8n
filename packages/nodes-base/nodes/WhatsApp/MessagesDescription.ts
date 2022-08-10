import { INodeProperties } from 'n8n-workflow';
import { componentsRequest, mediaUploadFromItem, templateInfo } from './MessageFunctions';

export const mediaTypes = ['image', 'video', 'audio', 'sticker', 'document'];

let currencies = require('currency-codes/data');
currencies = currencies.map(({ code, currency }: { code: string; currency: string }) => ({
	name: `${code} - ${currency}`,
	value: code,
}));

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
				action: 'Send audio',
			},
			{
				name: 'Send Document',
				value: 'document',
				action: 'Send document',
			},
			{
				name: 'Send Image',
				value: 'image',
				action: 'Send image',
			},
			{
				name: 'Send Location',
				value: 'location',
				action: 'Send location',
			},
			{
				name: 'Send Template',
				value: 'template',
				action: 'Send template',
			},
			{
				name: 'Send Text',
				value: 'text',
				action: 'Send text',
			},
			{
				name: 'Send Video',
				value: 'video',
				action: 'Send video',
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
				resource: ['message'],
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
				resource: ['message'],
			},
		},
	},
	{
		displayName: 'Phone Number or ID',
		name: 'phoneNumberId',
		type: 'options',
		typeOptions: {
			loadOptions: {
				routing: {
					request: {
						url: '={{$credentials.businessAccountId}}/phone_numbers',
						method: 'GET',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{$responseItem.display_phone_number}} - {{$responseItem.verified_name}}',
									value: '={{$responseItem.id}}',
								},
							},
							{
								type: 'sort',
								properties: {
									key: 'name',
								},
							},
						],
					},
				},
			},
		},
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
				resource: ['message'],
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
				resource: ['message'],
			},
		},
	},
];

export const messageTypeFields: INodeProperties[] = [
		// ----------------------------------
	//         type: location
	// ----------------------------------
	{
		displayName: 'Longitude',
		name: 'longitude',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: ['location'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'location.longitude',
			},
		},
	},
	{
		displayName: 'Latitude',
		name: 'latitude',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: ['location'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'location.latitude',
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
				resource: [
					'message',
				],
				operation: [
					'location',
				],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'location.address',
					},
				},
				hint: 'Only displayed if name is present',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'location.name',
					},
				},
			},
		],
	},
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
				resource: [
					'message',
				],
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
		displayName: 'Take Audio From',
		name: 'mediaPath',
		type: 'options',
		default: 'useMediaLink',
		description: 'Use a link, an ID, or n8n to upload an audio file',
		options: [
			{
				name: 'Link',
				value: 'useMediaLink',
				description:
					'When using a link, WhatsApp will download the audio, saving you the step of uploading audio yourself',
			},
			{
				name: 'WhatsApp Media',
				value: 'useMediaId',
				description: 'You can use an ID if you have already uploaded the audio to WhatsApp',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				name: 'n8n',
				value: 'useMedian8n',
				description: 'Upload a binary file on the item being processed in n8n',
			},
		],
		displayOptions: {
			show: {
				operation: ['audio'],
			},
		},
	},
	{
		displayName: 'Take Document From',
		name: 'mediaPath',
		type: 'options',
		default: 'useMediaLink',
		description: 'Use a link, an ID, or n8n to upload a document',
		options: [
			{
				name: 'Link',
				value: 'useMediaLink',
				description:
					'When using a link, WhatsApp will download the document, saving you the step of uploading document yourself',
			},
			{
				name: 'WhatsApp Media',
				value: 'useMediaId',
				description: 'You can use an ID if you have already uploaded the document to WhatsApp',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				name: 'n8n',
				value: 'useMedian8n',
				description: 'Upload a binary file on the item being processed in n8n',
			},
		],
		displayOptions: {
			show: {
				operation: ['document'],
			},
		},
	},
	{
		displayName: 'Take Image From',
		name: 'mediaPath',
		type: 'options',
		default: 'useMediaLink',
		description: 'Use a link, an ID, or n8n to upload an image',
		options: [
			{
				name: 'Link',
				value: 'useMediaLink',
				description:
					'When using a link, WhatsApp will download the image, saving you the step of uploading image yourself',
			},
			{
				name: 'WhatsApp Media',
				value: 'useMediaId',
				description: 'You can use an ID if you have already uploaded the image to WhatsApp',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				name: 'n8n',
				value: 'useMedian8n',
				description: 'Upload a binary file on the item being processed in n8n',
			},
		],
		displayOptions: {
			show: {
				operation: ['image'],
			},
		},
	},
	{
		displayName: 'Take Video From',
		name: 'mediaPath',
		type: 'options',
		default: 'useMediaLink',
		description: 'Use a link, an ID, or n8n to upload a video',
		options: [
			{
				name: 'Link',
				value: 'useMediaLink',
				description:
					'When using a link, WhatsApp will download the video, saving you the step of uploading video yourself',
			},
			{
				name: 'WhatsApp Media',
				value: 'useMediaId',
				description: 'You can use an ID if you have already uploaded the video to WhatsApp',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				name: 'n8n',
				value: 'useMedian8n',
				description: 'Upload a binary file on the item being processed in n8n',
			},
		],
		displayOptions: {
			show: {
				operation: ['video'],
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
		displayName: 'Input Data Field Name',
		name: 'mediaPropertyName',
		type: 'string',
		default: 'data',
		description: 'The name of the input field containing the binary file data to be uploaded',
		required: true,
		displayOptions: {
			show: {
				operation: mediaTypes,
				mediaPath: ['useMedian8n'],
			},
		},
		routing: {
			send: {
				preSend: [mediaUploadFromItem],
			},
		},
	},
	{
		displayName: 'Filename',
		name: 'mediaFilename',
		type: 'string',
		default: '',
		description: 'The name of the file (required when using a file ID)',
		required: true,
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['message'],
				operation: mediaTypes,
			},
		},
		options: [
			{
				displayName: 'Filename',
				name: 'mediaFilename',
				type: 'string',
				default: '',
				description: 'The name of the file',
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
				routing: {
					send: {
						type: 'body',
						property: '={{$parameter["operation"]}}.caption',
					},
				},
			},
		],
	},

	// ----------------------------------
	//         type: template
	// ----------------------------------
	{
		displayName: 'Template',
		name: 'template',
		default: '',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['template'],
				resource: ['message'],
			},
		},
		typeOptions: {
			loadOptions: {
				routing: {
					request: {
						url: '={{$credentials.businessAccountId}}/message_templates',
						method: 'GET',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{$responseItem.name}} - {{$responseItem.language}}',
									value: '={{$responseItem.name}}|{{$responseItem.language}}',
								},
							},
							{
								type: 'sort',
								properties: {
									key: 'name',
								},
							},
						],
					},
				},
			},
		},
		required: true,
		description: 'Name of the template',
		routing: {
			send: {
				type: 'body',
				// property: 'template.name',
				preSend: [templateInfo],
			},
		},
	},
	//{
	//	// Search for ISO6391.getCode(language) in the Twitter node. Pehaps, we can use the same library?
	//	//TODO: would be nice to change this to a searchable dropdown with all the possible language codes
	//	displayName: 'Language Code',
	//	name: 'templateLanguageCode',
	//	type: 'string',
	//	default: 'en_US',
	//	displayOptions: {
	//		show: {
	//			operation: ['template'],
	//			resource: ['message'],
	//		},
	//	},
	//	description:
	//		'The code of the language or locale to use. Accepts both language and language_locale formats (e.g., en and en_US).',
	//	routing: {
	//		send: {
	//			type: 'body',
	//			property: 'template.language.code',
	//		},
	//	},
	//},
	{
		displayName: 'Components',
		name: 'components',
		type: 'fixedCollection',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Component',
		displayOptions: {
			show: {
				operation: ['template'],
				resource: ['message'],
			},
		},
		routing: {
			send: {
				preSend: [componentsRequest],
			},
		},
		options: [
			{
				name: 'component',
				displayName: 'Component',
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
						name: 'bodyParameters',
						type: 'fixedCollection',
						typeOptions: {
							sortable: true,
							multipleValues: true,
						},
						displayOptions: {
							show: {
								type: ['body'],
							},
						},
						placeholder: 'Add Parameter',
						default: {},
						options: [
							{
								displayName: 'Parameter',
								name: 'parameter',
								values: [
									{
										displayName: 'Type',
										name: 'type',
										type: 'options',
										options: [
											{
												name: 'Text',
												value: 'text',
											},
											{
												name: 'Currency',
												value: 'currency',
											},
											{
												name: 'Date Time',
												value: 'date_time',
											},
										],
										default: 'text',
									},
									{
										displayName: 'Text',
										name: 'text',
										type: 'string',
										displayOptions: {
											show: {
												type: ['text'],
											},
										},
										default: '',
									},
									{
										displayName: 'Currency Code',
										name: 'code',
										type: 'options',
										options: currencies,
										displayOptions: {
											show: {
												type: ['currency'],
											},
										},
										default: '',
										placeholder: 'USD',
									},
									{
										displayName: 'Amount',
										name: 'amount_1000',
										type: 'number',
										displayOptions: {
											show: {
												type: ['currency'],
											},
										},
										default: '',
										placeholder: '',
									},
									{
										displayName: 'Date Time',
										name: 'date_time',
										type: 'dateTime',
										displayOptions: {
											show: {
												type: ['date_time'],
											},
										},
										default: '',
										placeholder: '',
									},
									{
										displayName: 'Fallback Value',
										name: 'fallback_value',
										type: 'string',
										displayOptions: {
											show: {
												type: ['currency'],
											},
										},
										default: '',
									},
								],
							},
						],
					},
					{
						displayName: 'Sub Type',
						name: 'sub_type',
						type: 'options',
						displayOptions: {
							show: {
								type: ['button'],
							},
						},
						options: [
							{
								name: 'Quick Reply',
								value: 'quick_reply',
								description: 'Allows your customer to call a phone number and visit a website',
							},
							{
								name: 'URL',
								value: 'url',
							},
						],
						default: 'quick_reply',
					},
					{
						displayName: 'Index',
						name: 'index',
						type: 'number',
						typeOptions: {
							maxValue: 2,
							minValue: 0,
						},
						displayOptions: {
							show: {
								type: ['button'],
							},
						},
						default: 0,
					},
					{
						displayName: 'Parameters',
						name: 'buttonParameters',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: false,
						},
						displayOptions: {
							show: {
								type: ['button'],
							},
						},
						placeholder: 'Add Parameter',
						default: {},
						options: [
							{
								displayName: 'Parameter',
								name: 'parameter',
								values: [
									{
										displayName: 'Type',
										name: 'type',
										type: 'options',
										options: [
											{
												name: 'Payload',
												value: 'payload',
											},
											{
												name: 'Text',
												value: 'text',
											},
										],
										default: 'payload',
									},
									{
										displayName: 'Payload',
										name: 'payload',
										type: 'string',
										displayOptions: {
											show: {
												type: ['payload'],
											},
										},
										default: '',
									},
									{
										displayName: 'Text',
										name: 'text',
										type: 'string',
										displayOptions: {
											show: {
												type: ['text'],
											},
										},
										default: '',
									},
								],
							},
						],
					},
					{
						displayName: 'Parameters',
						name: 'headerParameters',
						type: 'fixedCollection',
						typeOptions: {
							sortable: true,
							multipleValues: true,
						},
						displayOptions: {
							show: {
								type: ['header'],
							},
						},
						placeholder: 'Add Parameter',
						default: {},
						options: [
							{
								displayName: 'Parameter',
								name: 'parameter',
								values: [
									{
										displayName: 'Type',
										name: 'type',
										type: 'options',
										options: [
											{
												name: 'Text',
												value: 'text',
											},
											{
												name: 'Currency',
												value: 'currency',
											},
											{
												name: 'Date Time',
												value: 'date_time',
											},
											{
												name: 'Image',
												value: 'image',
											},
										],
										default: 'text',
									},
									{
										displayName: 'Text',
										name: 'text',
										type: 'string',
										displayOptions: {
											show: {
												type: ['text'],
											},
										},
										default: '',
									},
									{
										displayName: 'Currency Code',
										name: 'code',
										type: 'options',
										options: currencies,
										displayOptions: {
											show: {
												type: ['currency'],
											},
										},
										default: '',
										placeholder: 'USD',
									},
									{
										displayName: 'Amount',
										name: 'amount_1000',
										type: 'number',
										displayOptions: {
											show: {
												type: ['currency'],
											},
										},
										default: '',
										placeholder: '',
									},
									{
										displayName: 'Date Time',
										name: 'date_time',
										type: 'dateTime',
										displayOptions: {
											show: {
												type: ['date_time'],
											},
										},
										default: '',
										placeholder: '',
									},
									{
										displayName: 'Image Link',
										name: 'imageLink',
										type: 'string',
										displayOptions: {
											show: {
												type: ['image'],
											},
										},
										default: '',
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
				resource: ['message'],
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
