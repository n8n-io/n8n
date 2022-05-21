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
			displayName: "Text",
			name: "text",
			type: "collection",
			default: {},
			options: [
				{
					displayName: "Body",
					name: "body",
					type: "string",
					default: "",
					description: "The body of the message (max 4096 characters).",
				},
				{
					displayName: "Preview URL",
					name: "preview_url",
					type: "boolean",
					default: false,
					description: "Allows for URL previews in text messages."

				}
			],
			displayOptions: {
			show: {
				type: [
					'text',
				],
			},
		},
		description: "Just text message.",
},
{
			displayName: "Template",
			name: "template",
			type: "collection",
			default: {},
			options: [
				{
					displayName: "Name",
					name: "name",
					type: "string",
					default: "",
					description: "Name of the template.",
				},
				{
					displayName: "Language",
					name: "language",
					type: "collection",
					default: {},
					options: [
						{
							displayName: "Code",
							name: "code",
							type: "string",
							default: "en_US",
							description: "The language code of the template.",
						}
					],
					description: "Specifies the language the template is rendered in."

				}
			],
			displayOptions: {
			show: {
				type: [
					'text',
				],
			},
		},
		description: "Send a template message.",
}
]
