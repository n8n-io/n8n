import {
	INodeProperties,
} from 'n8n-workflow';

export const draftOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'draft',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new email draft.',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a draft.',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a draft by message ID.',
			}
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const draftFields = [
	{
		displayName: 'Draft ID',
		name: 'messageId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'draft',
				],
				operation: [
					'delete',
					'get',
				]
			},
		},
		placeholder: 'r-3254521568507167962',
		description: 'The ID of the draft to operate on.',
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'draft',
				],
				operation: [
					'create',
				]
			},
		},
		placeholder: 'Hello World!',
		description: 'The message subject.',
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'draft',
				],
				operation: [
					'create',
				]
			},
		},
		placeholder: 'Hello World!',
		description: 'The message body. This can be in HTML.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'draft',
				],
				operation: [
					'create',
				]
			},
		},
		default: {},
		options: [
			{
				displayName: 'To Email',
				name: 'toList',
				type: 'string',
				default: [],
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add To Email',
				},
				placeholder: 'info@example.com',
				description: 'The email addresses of the recipients.',
			},
			{
				displayName: 'CC Email',
				name: 'ccList',
				type: 'string',
				description: 'The email addresses of the copy recipients.',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add CC Email',
				},
				placeholder: 'info@example.com',
				default: [],
			},
			{
				displayName: 'BCC Email',
				name: 'bccList',
				type: 'string',
				description: 'The email addresses of the blind copy recipients.',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add BCC Email',
				},
				placeholder: 'info@example.com',
				default: [],
			},
			{
				displayName: 'Attachments',
				name: 'attachmentsUi',
				placeholder: 'Add Attachments',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'attachmentsValues',
						displayName: 'Attachments Values',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'string',
								default: '',
								placeholder: 'text/plain',
								description: 'The MIME type of the attachment.',
							},
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: 'myfile.txt',
								description: 'The file name of the attachment.',
							},
							{
								displayName: 'Content',
								name: 'content',
								type: 'string',
								default: '',
								placeholder: 'ZXhhbXBsZSBmaWxl',
								description: 'The content of the attachment as a base64-encoded string.',
							},
						],
					},
					{
						name: 'attachmentsBinary',
						displayName: 'Attachments Binary',
						values: [
							{
								displayName: 'Property',
								name: 'property',
								type: 'string',
								default: '',
								description: 'Name of the binary property containing the data to be added to the email as an attachment',
							},
						],
					},
				],
				default: '',
				description: 'Array of supported attachments to add to the message.',
			},
		],
	},
] as INodeProperties[];
