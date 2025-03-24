import type { INodeProperties } from 'n8n-workflow';

export const messageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['message'],
			},
		},
		options: [
			{
				name: 'Send Mail',
				value: 'sendmail',
				description: 'This action will send an email.',
				action: 'Send Mail',
			},
			{
				name: 'Send Template Mail',
				value: 'sendtemplatemail',
				description: 'Send custom Template Mail.',
				action: 'Send Template Mail',
			},
		],
		default: 'sendmail',
	},
];

export const messageFields: INodeProperties[] = [
	// ----------------------------------------
	//     event: Create, Update and Delete
	// ----------------------------------------

	{
		displayName: 'Mail Agent',
		name: 'mailagent',
		type: 'options',
		default: '',
		description: 'Select Mail Agent',
		hint: 'Select Mail Agent',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendmail', 'sendtemplatemail'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getListMailagent',
		},
		required: true,
	},
	{
		displayName: 'Template',
		name: 'template',
		type: 'options',
		default: '',
		description: 'Choose a ZeptoMail template',
		hint: 'Choose a ZeptoMail template',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendtemplatemail'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getListTemplate',
			loadOptionsDependsOn: ['mailagent'],
		},
		required: true,
	},
	{
		displayName: 'From',
		name: 'fromaddress',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendmail', 'sendtemplatemail'],
			},
		},
		options: [
			{
				displayName: 'From Address',
				name: 'address',
				type: 'string',
				description:
					'Enter a From email address that belongs to the domain associated with the above chosen Mail Agent',
				hint: 'Enter a From email address that belongs to the domain associated with the above chosen Mail Agent.',
				default: '',
			},
			{
				displayName: 'From Name',
				name: 'name',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'To',
		name: 'toaddress',
		type: 'string',
		description: 'Enter To email address and separate by comma if more than one',
		hint: 'Enter To email address and separate by comma if more than one.',
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendmail', 'sendtemplatemail'],
			},
		},
		required: true,
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		description: 'Enter subject of the email',
		hint: 'Enter subject of the email.',
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendmail'],
			},
		},
		required: true,
	},
	{
		displayName: 'Body',
		name: 'htmlbody',
		type: 'string',
		description: 'Enter the content of the email',
		hint: 'Enter the content of the email',
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendmail'],
			},
		},
	},
	{
		displayName: 'Reply To',
		name: 'replyto',
		type: 'string',
		description: 'Enter ReplyTo address',
		hint: 'Enter ReplyTo address',
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendmail', 'sendtemplatemail'],
			},
		},
	},
	{
		displayName: 'CC',
		name: 'cc',
		type: 'string',
		description: 'Enter CC email address and separate by comma if more than one',
		hint: 'Enter CC email address and separate by comma if more than one',
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendmail', 'sendtemplatemail'],
			},
		},
	},
	{
		displayName: 'BCC',
		name: 'bcc',
		type: 'string',
		description: 'Enter BCC email address and separate by comma if more than one',
		hint: 'Enter BCC email address and separate by comma if more than one',
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendmail', 'sendtemplatemail'],
			},
		},
	},
	{
		displayName: 'Attachments',
		name: 'attachment',
		type: 'collection',
		default: null,
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendmail'],
			},
		},
		options: [
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				description: 'Base64 encoded value of the attachment file',
				hint: 'Base64 encoded value of the attachment file',
				default: '',
			},
			{
				displayName: 'File Name',
				name: 'name',
				description: 'The name of your attachment file.',
				hint: 'The name of your attachment file.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mime Type',
				name: 'mime_type',
				hint: 'Indicates the content type of your attachment file. Allowed values: simple text message - plain/text, image file - image/jpg.',
				description:
					'Indicates the content type of your attachment file. Allowed values: simple text message - plain/text, image file - image/jpg.',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Template merge info values',
		name: 'mergeinfo',
		type: 'string',
		description:
			'Provide the merge info in JSON format. You can copy the JSON from ZeptoMail templates page.',
		hint: 'Provide the merge info in JSON format. You can copy the JSON from ZeptoMail templates page.',
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendtemplatemail'],
			},
		},
		required: true,
	},
];
