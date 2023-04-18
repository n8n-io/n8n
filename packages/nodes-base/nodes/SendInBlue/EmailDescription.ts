import type { INodeProperties } from 'n8n-workflow';
import { SendInBlueNode } from './GenericFunctions';

export const emailOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['email'],
			},
		},
		options: [
			{
				name: 'Send',
				value: 'send',
				action: 'Send a transactional email',
			},
			{
				name: 'Send Template',
				value: 'sendTemplate',
				action: 'Send an email with an existing Template',
			},
		],
		routing: {
			request: {
				method: 'POST',
				url: '/v3/smtp/email',
			},
		},
		default: 'send',
	},
];

const sendHtmlEmailFields: INodeProperties[] = [
	{
		displayName: 'Send HTML',
		name: 'sendHTML',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
		default: false,
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
		routing: {
			send: {
				property: 'subject',
				type: 'body',
			},
		},
		default: '',
		description: 'Subject of the email',
	},
	{
		displayName: 'Text Content',
		name: 'textContent',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
				sendHTML: [false],
			},
		},
		routing: {
			send: {
				property: 'textContent',
				type: 'body',
			},
		},
		default: '',
		description: 'Text content of the message',
	},
	{
		displayName: 'HTML Content',
		name: 'htmlContent',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
				sendHTML: [true],
			},
		},
		routing: {
			send: {
				property: 'htmlContent',
				type: 'body',
			},
		},
		default: '',
		description: 'HTML content of the message',
	},
	{
		displayName: 'Sender',
		name: 'sender',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
		default: '',
		required: true,
		routing: {
			send: {
				preSend: [SendInBlueNode.Validators.validateAndCompileSenderEmail],
			},
		},
	},
	{
		displayName: 'Receipients',
		name: 'receipients',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
		default: '',
		required: true,
		routing: {
			send: {
				preSend: [SendInBlueNode.Validators.validateAndCompileReceipientEmails],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		placeholder: 'Add Field',
		description: 'Additional fields to add',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['send'],
			},
		},
		options: [
			{
				displayName: 'Attachments',
				name: 'emailAttachments',
				placeholder: 'Add Attachment',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						name: 'attachment',
						displayName: 'Attachment Data',
						values: [
							{
								displayName: 'Input Data Field Name',
								default: '',
								name: 'binaryPropertyName',
								type: 'string',
								description:
									'The name of the incoming field containing the binary file data to be processed',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [SendInBlueNode.Validators.validateAndCompileAttachmentsData],
					},
				},
			},
			{
				displayName: 'Receipients BCC',
				name: 'receipientsBCC',
				placeholder: 'Add BCC',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						name: 'receipientBcc',
						displayName: 'Receipient',
						values: [
							{
								displayName: 'Receipient',
								name: 'bcc',
								type: 'string',
								default: '',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [SendInBlueNode.Validators.validateAndCompileBCCEmails],
					},
				},
			},
			{
				displayName: 'Receipients CC',
				name: 'receipientsCC',
				placeholder: 'Add CC',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						name: 'receipientCc',
						displayName: 'Receipient',
						values: [
							{
								displayName: 'Receipient',
								name: 'cc',
								type: 'string',
								default: '',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [SendInBlueNode.Validators.validateAndCompileCCEmails],
					},
				},
			},
			{
				displayName: 'Email Tags',
				name: 'emailTags',
				default: {},
				description: 'Add tags to your emails to find them more easily',
				placeholder: 'Add Email Tags',
				type: 'fixedCollection',
				options: [
					{
						displayName: 'Tags',
						name: 'tags',
						values: [
							{
								displayName: 'Tag',
								default: '',
								name: 'tag',
								type: 'string',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [SendInBlueNode.Validators.validateAndCompileTags],
					},
				},
			},
		],
	},
];

const sendHtmlTemplateEmailFields: INodeProperties[] = [
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptions: {
				routing: {
					request: {
						method: 'GET',
						url: '/v3/smtp/templates',
						qs: {
							templateStatus: true,
							limit: 1000,
							offset: 0,
							sort: 'desc',
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'templates',
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{$responseItem.name}}',
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
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['sendTemplate'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'templateId',
			},
		},
	},
	{
		displayName: 'Receipients',
		name: 'receipients',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['sendTemplate'],
			},
		},
		default: '',
		required: true,
		routing: {
			send: {
				preSend: [SendInBlueNode.Validators.validateAndCompileReceipientEmails],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		description: 'Additional fields to add',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['email'],
				operation: ['sendTemplate'],
			},
		},
		options: [
			{
				displayName: 'Attachments',
				name: 'emailAttachments',
				placeholder: 'Add Attachment',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Attachment Data',
						name: 'attachment',
						values: [
							{
								displayName: 'Input Data Field Name',
								name: 'binaryPropertyName',
								default: '',
								type: 'string',
								description:
									'The name of the incoming field containing the binary file data to be processed',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [SendInBlueNode.Validators.validateAndCompileAttachmentsData],
					},
				},
			},
			{
				displayName: 'Email Tags',
				name: 'emailTags',
				default: {},
				description: 'Add tags to your emails to find them more easily',
				placeholder: 'Add Email Tags',
				type: 'fixedCollection',
				options: [
					{
						displayName: 'Tags',
						name: 'tags',
						values: [
							{
								displayName: 'Tag',
								default: '',
								name: 'tag',
								type: 'string',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [SendInBlueNode.Validators.validateAndCompileTags],
					},
				},
			},
			{
				displayName: 'Template Parameters',
				name: 'templateParameters',
				default: {},
				description: 'Pass a set of attributes to customize the template',
				placeholder: 'Add Parameter',
				type: 'fixedCollection',
				options: [
					{
						name: 'parameterValues',
						displayName: 'Parameters',
						values: [
							{
								displayName: 'Parameter',
								name: 'parameters',
								type: 'string',
								default: '',
								placeholder: 'key=value',
								description: 'Comma-separated key=value pairs',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [SendInBlueNode.Validators.validateAndCompileTemplateParameters],
					},
				},
			},
		],
	},
];

export const emailFields: INodeProperties[] = [
	...sendHtmlEmailFields,
	...sendHtmlTemplateEmailFields,
];
