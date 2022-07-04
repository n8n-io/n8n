import {
	INodeProperties,
} from 'n8n-workflow';

export const draftOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
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
				description: 'Create a new email draft',
				action: 'Create a draft',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a draft',
				action: 'Delete a draft',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a draft',
				action: 'Get a draft',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all drafts',
				action: 'Get all drafts',
			},
		],
		default: 'create',
	},
];

export const draftFields: INodeProperties[] = [
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
				],
			},
		},
		placeholder: 'r-3254521568507167962',
		description: 'The ID of the draft to operate on',
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
				],
			},
		},
		placeholder: 'Hello World!',
		description: 'The message subject',
	},
	{
		displayName: 'HTML',
		name: 'includeHtml',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'draft',
				],
				operation: [
					'create',
				],
			},
		},
		default: false,
		description: 'Whether the message should also be included as HTML',
	},
	{
		displayName: 'HTML Message',
		name: 'htmlMessage',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				includeHtml: [
					true,
				],
				resource: [
					'draft',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'The HTML message body',
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
				],
			},
		},
		placeholder: 'Hello World!',
		description:  'The message body. If HTML formatted, then you have to add and activate the option "HTML content" in the "Additional Options" section.',
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
				],
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
				description: 'The email addresses of the recipients',
			},
			{
				displayName: 'CC Email',
				name: 'ccList',
				type: 'string',
				description: 'The email addresses of the copy recipients',
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
				description: 'The email addresses of the blind copy recipients',
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
						name: 'attachmentsBinary',
						displayName: 'Attachments Binary',
						values: [
							{
								displayName: 'Property',
								name: 'property',
								type: 'string',
								default: '',
								description: 'Name of the binary property containing the data to be added to the email as an attachment. Multiple properties can be set separated by comma.',
							},
						],
					},
				],
				default: {},
				description: 'Array of supported attachments to add to the message',
			},
		],
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
					'get',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Attachments Prefix',
				name: 'dataPropertyAttachmentsPrefixName',
				type: 'string',
				default: 'attachment_',
				displayOptions: {
					hide: {
						format: [
							'full',
							'metadata',
							'minimal',
							'raw',
						],
					},
				},
				description: 'Prefix for name of the binary property to which to write the attachments. An index starting with 0 will be added. So if name is "attachment_" the first attachment is saved to "attachment_0"',
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{
						name: 'Full',
						value: 'full',
						description: 'Returns the full email message data with body content parsed in the payload field',
					},
					{
						name: 'Metadata',
						value: 'metadata',
						description: 'Returns only email message ID, labels, and email headers',
					},
					{
						name: 'Minimal',
						value: 'minimal',
						description: 'Returns only email message ID and labels; does not return the email headers, body, or payload',
					},
					{
						name: 'RAW',
						value: 'raw',
						description: 'Returns the full email message data with body content in the raw field as a base64url encoded string; the payload field is not used',
					},
					{
						name: 'Resolved',
						value: 'resolved',
						description: 'Returns the full email with all data resolved and attachments saved as binary data',
					},
				],
				default: 'resolved',
				description: 'The format to return the message in',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 draft:getAll                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'draft',
				],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'draft',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 10,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'draft',
				],
			},
		},
		options: [
			{
				displayName: 'Attachments Prefix',
				name: 'dataPropertyAttachmentsPrefixName',
				type: 'string',
				default: 'attachment_',
				displayOptions: {
					hide: {
						format: [
							'full',
							'ids',
							'metadata',
							'minimal',
							'raw',
						],
					},
				},
				description: 'Prefix for name of the binary property to which to write the attachments. An index starting with 0 will be added. So if name is "attachment_" the first attachment is saved to "attachment_0"',
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{
						name: 'Full',
						value: 'full',
						description: 'Returns the full email message data with body content parsed in the payload field',
					},
					{
						name: 'IDs',
						value: 'ids',
						description: 'Returns only the IDs of the emails',
					},
					{
						name: 'Metadata',
						value: 'metadata',
						description: 'Returns only email message ID, labels, and email headers',
					},
					{
						name: 'Minimal',
						value: 'minimal',
						description: 'Returns only email message ID and labels; does not return the email headers, body, or payload',
					},
					{
						name: 'RAW',
						value: 'raw',
						description: 'Returns the full email message data with body content in the raw field as a base64url encoded string; the payload field is not used',
					},
					{
						name: 'Resolved',
						value: 'resolved',
						description: 'Returns the full email with all data resolved and attachments saved as binary data',
					},
				],
				default: 'resolved',
				description: 'The format to return the message in',
			},
			{
				displayName: 'Include Spam Trash',
				name: 'includeSpamTrash',
				type: 'boolean',
				default: false,
				description: 'Whether to include messages from SPAM and TRASH in the results',
			},
		],
	},
];
