import {
	INodeProperties,
} from 'n8n-workflow';

export const mailOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'mail',
				],
			},
		},
		options: [
			{
				name: 'Send',
				value: 'send',
				description: 'Send an email.',
			},
		],
		default: 'upsert',
		description: 'Operation to perform.',
	},
] as INodeProperties[];

export const mailFields = [
	/* -------------------------------------------------------------------------- */
	/*                                 mail:send                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Sender Email',
		name: 'fromEmail',
		type: 'string',
		default: '',
		placeholder: 'sender@domain.com',
		description: 'Email address of the sender of the email.',
		displayOptions: {
			show: {
				resource: [
					'mail',
				],
				operation: [
					'send',
				],
			},
		},
	},
	{
		displayName: 'Sender Name',
		name: 'fromName',
		type: 'string',
		default: '',
		placeholder: 'John Smith',
		description: 'Name of the sender of the email.',
		displayOptions: {
			show: {
				resource: [
					'mail',
				],
				operation: [
					'send',
				],
			},
		},
	},
	{
		displayName: 'Recipient Email',
		name: 'toEmail',
		type: 'string',
		default: '',
		placeholder: 'recipient@domain.com',
		description: 'Comma-separated list of recipient email addresses.',
		displayOptions: {
			show: {
				resource: [
					'mail',
				],
				operation: [
					'send',
				],
			},
		},
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		description: 'Subject of the email to send.',
		displayOptions: {
			show: {
				resource: [
					'mail',
				],
				operation: [
					'send',
				],
			},
		},
	},
	{
		displayName: 'Dynamic Template',
		name: 'dynamicTemplate',
		type: 'boolean',
		required: true,
		default: false,
		description: 'Whether this email will contain a dynamic template.',
		displayOptions: {
			show: {
				resource: [
					'mail',
				],
				operation: [
					'send',
				],
			},
		},
	},
	{
		displayName: 'Message Body',
		name: 'contentValue',
		type: 'string',
		default: '',
		required: true,
		description: 'Message body of the email to send.',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [
					'mail',
				],
				operation: [
					'send',
				],
				dynamicTemplate: [
					false,
				],
			},
		},
	},
	{
		displayName: 'MIME type',
		name: 'contentType',
		type: 'options',
		default: 'text/plain',
		description: 'MIME type of the email to send.',
		options: [
			{
				name: 'Plain Text',
				value: 'text/plain',
			},
			{
				name: 'HTML',
				value: 'html',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'mail',
				],
				operation: [
					'send',
				],
			},
		},
	},
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'options',
		default: [],
		typeOptions: {
			loadOptionsMethod: 'getTemplateIds',
		},
		displayOptions: {
			show: {
				resource: [
					'mail',
				],
				operation: [
					'send',
				],
				dynamicTemplate: [
					true,
				],
			},
		},
	},
	{
		displayName: 'Dynamic Template Fields',
		name: 'dynamicTemplateFields',
		placeholder: 'Add Dynamic Template Fields',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				resource: [
					'mail',
				],
				operation: [
					'send',
				],
				dynamicTemplate: [
					true,
				],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
						description: 'Key of the dynamic template field.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value for the field',
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
				resource: [
					'mail',
				],
				operation: [
					'send',
				],
			},
		},
		options: [
			{
				displayName: 'BCC Email',
				name: 'bccEmail',
				type: 'string',
				default: '',
				description: 'Comma-separated list of emails of the recipients<br>of a blind carbon copy of the email.',
			},
			{
				displayName: 'CC Email',
				name: 'ccEmail',
				type: 'string',
				default: '',
				description: 'Comma-separated list of emails of the recipients<br>of a carbon copy of the email.',
			},
			{
				displayName: 'Enable Sandbox',
				name: 'enableSandbox',
				type: 'boolean',
				default: false,
				description: 'Whether to use to the sandbox for testing out email-sending functionality.',
			},
		],
	},
] as INodeProperties[];

export type SendMailBody = {
	personalizations: Array<{
		to: EmailName[],
		subject: string,
		cc?: EmailName[],
		bcc?: EmailName[],
		dynamic_template_data?: { [key: string]: string },
	}>,
	from: EmailName,
	template_id?: string,
	content?: Array<{
		type: string,
		value: string,
	}>,
	mail_settings: {
		sandbox_mode: {
			enable: boolean,
		},
	},
};

type EmailName = {
	email: string,
	name?: string,
};

