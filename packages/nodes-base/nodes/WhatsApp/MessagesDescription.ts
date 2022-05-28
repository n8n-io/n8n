import {
	INodeProperties,
} from 'n8n-workflow';


export const mediaTypes = [
	"image",
	"video",
	"audio",
	"sticker",
	"document",
]

export const messageFields: INodeProperties[] = [
	{
		displayName: 'Phone number ID',
		name: 'phoneNumberId',
		type: 'string',
		default: '',
		placeholder: '',
		required: true,
		description: 'The ID of the business account\'s phone number from which the message will be sent from',
	},
	{
		displayName: 'Recipient\'s phone number',
		name: 'recipientPhoneNumber',
		type: 'string',
		default: '',
		description: 'Phone number of the recipient of the message, starting with the country code without the leading +',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		placeholder: '',
		options: [
			{
				name: 'Text',
				value: 'text',
			},
			{
				name: 'Template',
				value: 'template',
			},
			{
				name: "Image",
				value: "image",
			},
			{
				name: "Document",
				value: "document",
			},
			{
				name: "Audio",
				value: "audio",
			},
			{
				name: "Video",
				value: "video",
			},
		],
		default: "text",
		description: 'The type of the message',
	},
];

export const messageTypeFields: INodeProperties[] = [
	// ----------------------------------
	//         type: text
	// ----------------------------------
	{
		displayName: "Text Body",
		name: "textBody",
		type: "string",
		default: "",
		description: "The body of the message (max 4096 characters)",
		displayOptions: {
			show: {
				type: [
					'text',
				],
			},
		},
	},
	{
		displayName: "Preview URL",
		name: "previewUrl",
		type: "boolean",
		default: false,
		description: 'Allows for URL previews in text messages',
		displayOptions: {
			show: {
				type: [
					'text',
				],
			},
		},
	},
	// ----------------------------------
	//         type: media
	// ----------------------------------
	{
		displayName: "Link or ID",
		name: "mediaPath",
		type: "options",
		default: "useMediaLink",
		description: "Use a link or an ID to upload a media file",
		options: [
			{
				name: "Link",
				value: "useMediaLink",
				description: "When using a ink, WhatsApp will download the media, saving you the step of uploading media yourself"
			},
			{
				name: "ID",
				value: "useMediaId",
				description: "You can use an ID if you have already uploaded the media to WhatsApp"
			}
		],
		displayOptions: {
			show: {
				type: mediaTypes
			},
		},
	},
	{
		displayName: "Link",
		name: "mediaLink",
		type: "string",
		default: "",
		description: 'Link of the media to be sent',
		displayOptions: {
			show: {
				type: mediaTypes,
				mediaPath: [
					"useMediaLink"
				]
			},
		},
	},
	{
		displayName: "ID",
		name: "mediaId",
		type: "string",
		default: "",
		description: 'ID of the media to be sent',
		displayOptions: {
			show: {
				type: mediaTypes,
				mediaPath: [
					"useMediaId"
				]
			},
		},
	},
	{
		displayName: "Filename",
		name: "mediaFilename",
		type: "string",
		default: "",
		description: "The name of the file (required when using a file ID)",
		displayOptions:{
			show: {
				type: [
					"document"
				],
				mediaPath: [
					"useMediaId"
				]
			},
		},
	},
	{
		displayName: "Media Caption",
		name: "mediaCaption",
		type: "string",
		default: "",
		description: "The caption of the media",
		displayOptions:{
			show: {
				type: [
					"image",
					"video",
					"document"
				],
			},
		},
	},

	// ----------------------------------
	//         type: template
	// ----------------------------------
	{
		displayName: "Name",
		name: "templateName",
		default: "",
		type: "string",
		displayOptions: {
			show: {
				type: [
					'template',
				],
			},
		},
		required: true,
		description: 'Name of the template',
	},
	{
		//TODO: would be nice to change this to a searchable dropdown with all the possible language codes
		displayName: "Language code",
		name: "templateLanguageCode",
		type: "string",
		default: "en_US",
		displayOptions: {
			show: {
				type: [
					'template',
				],
			},
		},
		description: 'The code of the language or locale to use. Accepts both language and language_locale formats (e.g., en and en_US).'

	},
	//TODO: dynamic template components
	// {
	// 	displayName: 'Template header',
	// 	name: 'templateHeader',
	// 	placeholder: 'Add Component',
	// 	type: 'fixedCollection',
	// 	typeOptions: {
	// 		multipleValues: true,
	// 	},
	// 	displayOptions: {
	// 		show: {
	// 			type: [
	// 				'template',
	// 			],
	// 		},
	// 	},
	// 	default: {},
	// 	options: [
	// 		{
	// 			name: 'componentParameters',
	// 			displayName: 'Component parameters',
	// 			values: [
	// 			{
	// 				displayName: 'Parameters type',
	// 				name: 'templateParametersType',
	// 				type: 'options',
	// 				options: [
	// 					{
	// 						name: 'Text',
	// 						value: 'text',
	// 					},
	// 					{
	// 						name: 'Image',
	// 						value: 'image',
	// 					},
	// 					{
	// 						name: 'Document',
	// 						value: 'document',
	// 					},
	// 					{
	// 						name: 'Video',
	// 						value: 'video',
	// 					},
	// 				],
	// 				default: 0,
	// 				description: 'The type of the parameter',
	// 			},
	// 				// eslint-disable-next-line n8n-nodes-base/node-param-operation-without-no-data-expression
	// 				{
	// 					displayName: 'Text',
	// 					name: 'componentText',
	// 					type: 'string',
	// 					default: '',
	// 					description: 'Operation to decide where the the data should be mapped to',
	// 				},
	// 				{
	// 					displayName: 'Value 2',
	// 					name: 'value2',
	// 					type: 'string',
	// 					displayOptions: {
	// 						hide: {
	// 							operation: [
	// 								'regex',
	// 								'notRegex',
	// 							],
	// 						},
	// 					},
	// 					default: '',
	// 					description: 'The value to compare with the first one',
	// 				},
	// 				{
	// 					displayName: 'Regex',
	// 					name: 'value2',
	// 					type: 'string',
	// 					displayOptions: {
	// 						show: {
	// 							operation: [
	// 								'regex',
	// 								'notRegex',
	// 							],
	// 						},
	// 					},
	// 					default: '',
	// 					placeholder: '/text/i',
	// 					description: 'The regex which has to match',
	// 				},
	// 				{
	// 					displayName: 'Output',
	// 					name: 'output',
	// 					type: 'number',
	// 					typeOptions: {
	// 						minValue: 0,
	// 						maxValue: 3,
	// 					},
	// 					default: 0,
	// 					description: 'The index of output to which to send data to if rule matches',
	// 				},
	// 			],
	// 		},
	// 	],
	// },
]
