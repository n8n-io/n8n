import {
	INodeProperties,
} from 'n8n-workflow';

export const messageOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
			},
		},
		options: [
			{
				name: 'Create and Send',
				value: 'create',
				description: 'Create and send an email',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a message.',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a message by message ID.',
			},
			{
				name: 'Reply',
				value: 'reply',
				description: 'Reply to an email',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const messageFields = [
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'get',
					'delete',
				]
			},
		},
		placeholder: '172ce2c4a72cc243',
		description: 'The ID of the message you are operating on.',
	},
	{
		displayName: 'Thread ID',
		name: 'threadId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'reply',
				]
			},
		},
		placeholder: '172ce2c4a72cc243',
		description: 'The ID of the thread you are replying to.',
	},
	{
		displayName: 'Message ID',
		name: 'messageId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'reply',
				]
			},
		},
		placeholder: 'CAHNQoFsC6JMMbOBJgtjsqN0eEc+gDg2a=SQj-tWUebQeHMDgqQ@mail.gmail.com',
		description: 'The ID of the message you are replying to.',
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
					'message',
				],
				operation: [
					'reply',
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
					'message',
				],
				operation: [
					'reply',
					'create',
				]
			},
		},
		placeholder: 'Hello World!',
		description: 'The message body. This can be in HTML.',
	},
	{
        displayName: 'To Email',
        name: 'toList',
        type: 'string',
		default: [],
		required: true,
        typeOptions: {
            multipleValues: true,
            multipleValueButtonText: 'Add To Email',
        },
        displayOptions: {
            show: {
                resource: [
                    'message',
				],
				operation: [
					'reply',
					'create',
				]
            },
        },
		placeholder: 'info@example.com',
		description: 'The email addresses of the recipients.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'message',
				],
				operation: [
					'create',
					'reply',
				]
			},
		},
		default: {},
		options: [
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
								description: 'Name of the binary properties which contain data which should be added to email as attachment',
							},
						],
					},
				],
				default: '',
				description: 'Array of supported attachments to add to the message.',
			},
		]
	}
] as INodeProperties[];
