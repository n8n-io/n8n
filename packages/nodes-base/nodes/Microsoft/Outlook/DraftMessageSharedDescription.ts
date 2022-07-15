import {
	INodeProperties,
} from 'n8n-workflow';

export const draftMessageSharedFields: INodeProperties[] = [

	// Get & Get All operations
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'draft',
					'message',
				],
				operation: [
					'get',
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Attachments Prefix',
				name: 'dataPropertyAttachmentsPrefixName',
				type: 'string',
				default: 'attachment_',
				description: 'Prefix for name of the binary property to which to write the attachments. An index starting with 0 will be added. So if name is "attachment_" the first attachment is saved to "attachment_0"',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields the response will contain. Multiple can be added separated by comma.',
			},
			{
				displayName: 'Filter',
				name: 'filter',
				type: 'string',
				default: '',
				placeholder: 'isRead eq false',
				description: 'Microsoft Graph API OData $filter query. Information about the syntax can be found <a href="https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter">here</a>.',
			},
		],
	},

	// Update operation
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'draft',
					'message',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'BCC Recipients',
				name: 'bccRecipients',
				description: 'Email addresses of BCC recipients',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Body Content',
				name: 'bodyContent',
				description: 'Message body content',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Body Content Type',
				name: 'bodyContentType',
				description: 'Message body content type',
				type: 'options',
				options: [
					{
						name: 'HTML',
						value: 'html',
					},
					{
						name: 'Text',
						value: 'Text',
					},
				],
				default: 'html',
			},
			{
				displayName: 'Category Names or IDs',
				name: 'categories',
				type: 'multiOptions',
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCategories',
				},
				default: [],
			},
			{
				displayName: 'CC Recipients',
				name: 'ccRecipients',
				description: 'Email addresses of CC recipients',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Headers',
				name: 'internetMessageHeaders',
				placeholder: 'Add Header',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'headers',
						displayName: 'Header',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the header',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set for the header',
							},
						],
					},
				],
			},
			{
				displayName: 'From',
				name: 'from',
				description: 'The owner of the mailbox which the message is sent. Must correspond to the actual mailbox used.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Importance',
				name: 'importance',
				description: 'The importance of the message',
				type: 'options',
				options: [
					{
						name: 'Low',
						value: 'Low',
					},
					{
						name: 'Normal',
						value: 'Normal',
					},
					{
						name: 'High',
						value: 'High',
					},
				],
				default: 'Low',
			},
			{
				displayName: 'Is Read',
				name: 'isRead',
				description: 'Whether the message has been read',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Read Receipt Requested',
				name: 'isReadReceiptRequested',
				description: 'Whether a read receipt is requested for the message',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Recipients',
				name: 'toRecipients',
				description: 'Email addresses of recipients. Multiple can be added separated by comma.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Reply To',
				name: 'replyTo',
				description: 'Email addresses to use when replying',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				description: 'The subject of the message',
				type: 'string',
				default: '',
			},
		],
	},

];
