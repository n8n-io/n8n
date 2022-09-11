import { INodeProperties } from 'n8n-workflow';

export const draftOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['draft'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a draft',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a draft',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a draft',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many drafts',
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
				resource: ['draft'],
				operation: ['delete', 'get'],
			},
		},
		placeholder: 'r-3254521568507167962',
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['draft'],
				operation: ['create'],
			},
		},
		placeholder: 'Hello World!',
	},
	{
		displayName: 'Email Type',
		name: 'emailType',
		type: 'options',
		default: 'text',
		required: true,
		noDataExpression: true,
		options: [
			{
				name: 'HTML',
				value: 'html',
			},
			{
				name: 'Text',
				value: 'text',
			},
		],
		displayOptions: {
			show: {
				resource: ['draft'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['draft'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: ['draft'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'To Email',
				name: 'sendTo',
				type: 'string',
				default: '',
				placeholder: 'info@example.com',
				description:
					'The email addresses of the recipients. Multiple addresses can be separated by a comma. e.g. jay@getsby.com, jon@smith.com.',
			},
			{
				displayName: 'BCC',
				name: 'bccList',
				type: 'string',
				description:
					'The email addresses of the blind copy recipients. Multiple addresses can be separated by a comma. e.g. jay@getsby.com, jon@smith.com.',
				placeholder: 'info@example.com',
				default: '',
			},
			{
				displayName: 'CC',
				name: 'ccList',
				type: 'string',
				description:
					'The email addresses of the copy recipients. Multiple addresses can be separated by a comma. e.g. jay@getsby.com, jon@smith.com.',
				placeholder: 'info@example.com',
				default: '',
			},
			{
				displayName: 'Attachments',
				name: 'attachmentsUi',
				placeholder: 'Add Attachment',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'attachmentsBinary',
						displayName: 'Attachment Binary',
						values: [
							{
								displayName: 'Attachment Field Name (in Input)',
								name: 'property',
								type: 'string',
								default: '',
								description:
									'Add the field name from the input node. Multiple properties can be set separated by comma.',
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
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: ['draft'],
				operation: ['get'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Attachment Prefix',
				name: 'dataPropertyAttachmentsPrefixName',
				type: 'string',
				default: 'attachment_',
				description:
					"Prefix for name of the binary property to which to write the attachment. An index starting with 0 will be added. So if name is 'attachment_' the first attachment is saved to 'attachment_0'.",
			},
			{
				displayName: 'Download Attachments',
				name: 'downloadAttachments',
				type: 'boolean',
				default: false,
				description: "Whether the draft's attachments will be downloaded",
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
				operation: ['getAll'],
				resource: ['draft'],
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
				operation: ['getAll'],
				resource: ['draft'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['draft'],
			},
		},
		options: [
			{
				displayName: 'Attachment Prefix',
				name: 'dataPropertyAttachmentsPrefixName',
				type: 'string',
				default: 'attachment_',
				description:
					"Prefix for name of the binary property to which to write the attachments. An index starting with 0 will be added. So if name is 'attachment_' the first attachment is saved to 'attachment_0'.",
			},
			{
				displayName: 'Download Attachments',
				name: 'downloadAttachments',
				type: 'boolean',
				default: false,
				description: "Whether the draft's attachments will be downloaded",
			},
			{
				displayName: 'Include Spam and Trash',
				name: 'includeSpamTrash',
				type: 'boolean',
				default: false,
				description: 'Whether to include messages from SPAM and TRASH in the results',
			},
		],
	},
];
