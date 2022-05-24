import {
	INodeProperties,
} from 'n8n-workflow';


export const messageFields: INodeProperties[] = [
	{
		displayName: 'Phone number ID',
		name: 'phoneNumberId',
		type: 'string',
		default: '',
		placeholder: '',
		required: true,
		description: 'The ID of the business account\'s phone number from which the message will be sent from.',
	},
	{
		displayName: 'Recipient\'s phone number',
		name: 'to',
		type: 'string',
		default: '',
		description: 'Phone number of the recipient of the message, starting with the country code without the leading +.',
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
		],
		default: "text",
		description: 'The type of the message.',
	},
];

export const messageTypeFields: INodeProperties[] = [
	{
		displayName: "Body",
		name: "body",
		type: "string",
		default: "",
		description: "The body of the message (max 4096 characters).",
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
		name: "preview_url",
		type: "boolean",
		default: false,
		description: "Allows for URL previews in text messages.",
		displayOptions: {
			show: {
				type: [
					'text',
				],
			},
		},
	},
	{
		displayName: "Name",
		name: "name",
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
		description: "Name of the template.",
	},
	{
		displayName: "Language",
		name: "language",
		type: "string",
		default: "en_US",
		displayOptions: {
			show: {
				type: [
					'template',
				],
			},
		},
		description: "Specifies the language the template is rendered in."

	}
]
