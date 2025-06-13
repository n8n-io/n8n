import countryCodes from 'currency-codes';
import { SEND_AND_WAIT_OPERATION, type INodeProperties } from 'n8n-workflow';

import {
	cleanPhoneNumber,
	componentsRequest,
	mediaUploadFromItem,
	sendErrorPostReceive,
	setType,
	templateInfo,
} from './MessageFunctions';

export const mediaTypes = ['image', 'video', 'audio', 'sticker', 'document'];

const currencies = countryCodes.data.map(
	({ code, currency }: { code: string; currency: string }) => ({
		name: `${code} - ${currency}`,
		value: code,
	}),
);

export const messageFields: INodeProperties[] = [
	{
		displayName: 'Operation',
		noDataExpression: true,
		name: 'operation',
		type: 'options',
		placeholder: '',
		options: [
			{
				name: 'Send',
				value: 'send',
				action: 'Send message',
			},
			{
				name: 'Send and Wait for Response',
				value: SEND_AND_WAIT_OPERATION,
				action: 'Send message and wait for response',
			},
			{
				name: 'Send Template',
				value: 'sendTemplate',
				action: 'Send template',
			},
		],
		default: 'sendTemplate',
		routing: {
			request: {
				ignoreHttpStatusErrors: true,
			},
			send: {
				preSend: [setType],
			},
			output: { postReceive: [sendErrorPostReceive] },
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
		displayName: 'Sender Phone Number (or ID)',
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
		required: true,
		description: 'Phone number of the recipient of the message',
		hint: 'When entering a phone number, make sure to include the country code',
		routing: {
			send: {
				type: 'body',
				preSend: [cleanPhoneNumber],
			},
		},
		displayOptions: {
			show: {
				resource: ['message'],
			},
		},
	},
	{
		displayName: 'MessageType',
		noDataExpression: true,
		name: 'messageType',
		type: 'options',
		placeholder: '',
		options: [
			{
				name: 'Audio',
				value: 'audio',
			},
			{
				name: 'Contacts',
				value: 'contacts',
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
				name: 'Location',
				value: 'location',
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
		default: 'text',
		description: 'The type of the message',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['send'],
			},
		},
	},
];

export const messageTypeFields: INodeProperties[] = [
	// ----------------------------------
	//         type: contact
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: false,
		},
		displayOptions: {
			show: {
				operation: ['send'],
				messageType: ['contacts'],
			},
		},
		placeholder: 'Add Parameter',
		default: {},
		options: [
			{
				displayName: 'Name',
				name: 'data',
				values: [
					{
						displayName: 'Formatted Name',
						name: 'formatted_name',
						type: 'string',
						required: true,
						default: '',
						routing: {
							send: {
								type: 'body',
								property: 'contacts[0].name.formatted_name',
							},
						},
					},
					{
						displayName: 'First Name',
						name: 'first_name',
						type: 'string',
						default: '',
						routing: {
							send: {
								type: 'body',
								property: 'contacts[0].name.first_name',
							},
						},
					},
					{
						displayName: 'Last Name',
						name: 'last_name',
						type: 'string',
						default: '',
						routing: {
							send: {
								type: 'body',
								property: 'contacts[0].name.last_name',
							},
						},
					},
					{
						displayName: 'Middle Name',
						name: 'middle_name',
						type: 'string',
						default: '',
						routing: {
							send: {
								type: 'body',
								property: 'contacts[0].name.middle_name',
							},
						},
					},
					{
						displayName: 'Suffix',
						name: 'suffix',
						type: 'string',
						default: '',
						routing: {
							send: {
								type: 'body',
								property: 'contacts[0].name.suffix',
							},
						},
					},
					{
						displayName: 'Prefix',
						name: 'prefix',
						type: 'string',
						default: '',
						routing: {
							send: {
								type: 'body',
								property: 'contacts[0].name.prefix',
							},
						},
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
				operation: ['send'],
				messageType: ['contacts'],
			},
		},
		options: [
			{
				displayName: 'Addresses',
				name: 'addresses',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Parameter',
				default: {},
				options: [
					{
						displayName: 'Address',
						name: 'address',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Home',
										value: 'HOME',
									},
									{
										name: 'Work',
										value: 'WORK',
									},
								],
								default: 'HOME',
								routing: {
									send: {
										property: '=contacts[0].addresses[{{$index}}].type',
										type: 'body',
									},
								},
							},
							{
								displayName: 'Street',
								name: 'street',
								type: 'string',
								default: '',
								routing: {
									send: {
										property: '=contacts[0].addresses[{{$index}}].street',
										type: 'body',
									},
								},
							},
							{
								displayName: 'City',
								name: 'city',
								type: 'string',
								default: '',
								routing: {
									send: {
										property: '=contacts[0].addresses[{{$index}}].city',
										type: 'body',
									},
								},
							},
							{
								displayName: 'State',
								name: 'state',
								type: 'string',
								default: '',
								routing: {
									send: {
										property: '=contacts[0].addresses[{{$index}}].state',
										type: 'body',
									},
								},
							},
							{
								displayName: 'Zip',
								name: 'zip',
								type: 'string',
								default: '',
								routing: {
									send: {
										property: '=contacts[0].addresses[{{$index}}].zip',
										type: 'body',
									},
								},
							},
							{
								displayName: 'Country',
								name: 'country',
								type: 'string',
								default: '',
								routing: {
									send: {
										property: '=contacts[0].addresses[{{$index}}].country',
										type: 'body',
									},
								},
							},
							{
								displayName: 'Country Code',
								name: 'country_code',
								type: 'string',
								default: '',
								routing: {
									send: {
										property: '=contacts[0].addresses[{{$index}}].country_code',
										type: 'body',
									},
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Birthday',
				name: 'birthday',
				type: 'string',
				default: '',
				routing: {
					send: {
						property: 'contacts[0].birthday',
						type: 'body',
					},
				},
				placeholder: 'YYYY-MM-DD',
			},
			{
				displayName: 'Emails',
				name: 'emails',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Parameter',
				default: {},
				options: [
					{
						displayName: 'Email',
						name: 'data',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Home',
										value: 'HOME',
									},
									{
										name: 'Work',
										value: 'WORK',
									},
								],
								default: 'HOME',
								routing: {
									send: {
										property: '=contacts[0].emails[{{$index}}].type',
										type: 'body',
									},
								},
							},
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								placeholder: 'name@email.com',
								default: '',
								routing: {
									send: {
										property: '=contacts[0].emails[{{$index}}].email',
										type: 'body',
									},
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Organization',
				name: 'organization',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: false,
				},
				placeholder: 'Add Parameter',
				default: {},
				options: [
					{
						displayName: 'Organization',
						name: 'data',
						values: [
							{
								displayName: 'Company',
								name: 'company',
								type: 'string',
								default: '',
								routing: {
									send: {
										type: 'body',
										property: 'contacts[0].org.company',
									},
								},
							},
							{
								displayName: 'Department',
								name: 'department',
								type: 'string',
								default: '',
								routing: {
									send: {
										type: 'body',
										property: 'contacts[0].org.department',
									},
								},
							},
							{
								displayName: 'Title',
								name: 'title',
								type: 'string',
								default: '',
								routing: {
									send: {
										type: 'body',
										property: 'contacts[0].org.title',
									},
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Phones',
				name: 'phones',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Parameter',
				default: {},
				options: [
					{
						displayName: 'Phone',
						name: 'data',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Cell',
										value: 'CELL',
									},
									{
										name: 'Home',
										value: 'HOME',
									},
									{
										name: 'Iphone',
										value: 'IPHONE',
									},
									{
										name: 'Main',
										value: 'MAIN',
									},
									{
										name: 'WhatsApp ID',
										value: 'wa_id',
									},
									{
										name: 'Work',
										value: 'WORK',
									},
								],
								default: 'CELL',
								routing: {
									send: {
										property: '=contacts[0].phones[{{$index}}].type',
										type: 'body',
									},
								},
							},
							{
								displayName: 'Phone',
								name: 'phone',
								type: 'string',
								default: '',
								routing: {
									send: {
										property: '=contacts[0].phones[{{$index}}].phone',
										type: 'body',
									},
								},
							},
						],
					},
				],
			},
			{
				displayName: 'URLs',
				name: 'urls',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Parameter',
				default: {},
				options: [
					{
						displayName: 'URL',
						name: 'url',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Home',
										value: 'HOME',
									},
									{
										name: 'Work',
										value: 'WORK',
									},
								],
								default: 'HOME',
								routing: {
									send: {
										property: '=contacts[0].urls[{{$index}}].type',
										type: 'body',
									},
								},
							},
							{
								displayName: 'URL',
								name: 'url',
								type: 'string',
								default: '',
								routing: {
									send: {
										property: '=contacts[0].urls[{{$index}}].url',
										type: 'body',
									},
								},
							},
						],
					},
				],
			},
		],
	},
	// ----------------------------------
	//         type: location
	// ----------------------------------
	{
		displayName: 'Longitude',
		name: 'longitude',
		type: 'number',
		required: true,
		default: '',
		typeOptions: {
			minValue: -180,
			maxValue: 180,
		},
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['send'],
				messageType: ['location'],
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
		type: 'number',
		default: '',
		required: true,
		typeOptions: {
			minValue: -90,
			maxValue: 90,
		},
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['send'],
				messageType: ['location'],
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
		type: 'fixedCollection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['send'],
				messageType: ['location'],
			},
		},
		options: [
			{
				displayName: 'Name and Address',
				name: 'nameAndAddress',
				values: [
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
					},
				],
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
		required: true,
		default: '',
		description: 'The body of the message (max 4096 characters)',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['send'],
				messageType: ['text'],
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
					'WhatsApp will download the audio, saving you the step of uploading audio yourself',
			},
			{
				name: 'WhatsApp Media',
				value: 'useMediaId',
				description: 'If you have already uploaded the audio to WhatsApp',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				name: 'n8n',
				value: 'useMedian8n',
				description: 'Use binary data passed into this node',
			},
		],
		displayOptions: {
			show: {
				operation: ['send'],
				messageType: ['audio'],
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
				operation: ['send'],
				messageType: ['document'],
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
				operation: ['send'],
				messageType: ['image'],
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
				operation: ['send'],
				messageType: ['video'],
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
				operation: ['send'],
				messageType: mediaTypes,
				mediaPath: ['useMediaLink'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: '={{$parameter["messageType"]}}.link',
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
				operation: ['send'],
				messageType: mediaTypes,
				mediaPath: ['useMediaId'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: '={{$parameter["messageType"]}}.id',
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
				operation: ['send'],
				messageType: mediaTypes,
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
				operation: ['send'],
				messageType: ['document'],
				mediaPath: ['useMediaId'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: '={{$parameter["messageType"]}}.filename',
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
				operation: ['send'],
				messageType: mediaTypes,
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
						property: '={{$parameter["messageType"]}}.filename',
					},
				},
				displayOptions: {
					show: {
						'/messageType': ['document'],
					},
				},
			},
			{
				displayName: 'Caption',
				name: 'mediaCaption',
				type: 'string',
				default: '',
				description: 'The caption of the media',
				routing: {
					send: {
						type: 'body',
						property: '={{$parameter["messageType"]}}.caption',
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
				operation: ['sendTemplate'],
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
	//	// Search for ISO6391.getCode(language) in the Twitter node. Perhaps, we can use the same library?
	//	//TODO: would be nice to change this to a searchable dropdown with all the possible language codes
	//	displayName: 'Language Code',
	//	name: 'templateLanguageCode',
	//	type: 'string',
	//	default: 'en_US',
	//	displayOptions: {
	//		show: {
	//			operation: ['sendTemplate'],
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
				operation: ['sendTemplate'],
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
				operation: ['send'],
				messageType: ['text'],
			},
		},
		options: [
			{
				displayName: 'Show URL Previews',
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
