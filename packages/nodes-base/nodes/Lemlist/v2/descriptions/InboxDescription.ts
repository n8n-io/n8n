import type { INodeProperties } from 'n8n-workflow';

export const inboxOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many inbox conversations',
				action: 'Get many inbox conversations',
			},
			{
				name: 'Get Messages',
				value: 'getMessages',
				description: 'Get messages for a specific contact',
				action: 'Get messages for a contact',
			},
			{
				name: 'Send Email',
				value: 'sendEmail',
				description: 'Send an email through inbox',
				action: 'Send an email',
			},
			{
				name: 'Send LinkedIn Message',
				value: 'sendLinkedIn',
				description: 'Send a LinkedIn message through inbox',
				action: 'Send a LinkedIn message',
			},
			{
				name: 'Send WhatsApp Message',
				value: 'sendWhatsApp',
				description: 'Send a WhatsApp message through inbox',
				action: 'Send a WhatsApp message',
			},
		],
		displayOptions: {
			show: {
				resource: ['inbox'],
			},
		},
	},
];

export const inboxFields: INodeProperties[] = [
	// ----------------------------------
	//        inbox: getAll
	// ----------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['inbox'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				resource: ['inbox'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},

	// ----------------------------------
	//        inbox: getMessages
	// ----------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the contact to get messages for',
		displayOptions: {
			show: {
				resource: ['inbox'],
				operation: ['getMessages'],
			},
		},
	},

	// ----------------------------------
	//        inbox: sendEmail
	// ----------------------------------
	{
		displayName: 'To Email',
		name: 'toEmail',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'name@email.com',
		description: 'Email address to send the message to',
		displayOptions: {
			show: {
				resource: ['inbox'],
				operation: ['sendEmail'],
			},
		},
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		default: '',
		description: 'Subject of the email',
		displayOptions: {
			show: {
				resource: ['inbox'],
				operation: ['sendEmail'],
			},
		},
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		typeOptions: {
			rows: 5,
		},
		required: true,
		default: '',
		description: 'Body content of the email',
		displayOptions: {
			show: {
				resource: ['inbox'],
				operation: ['sendEmail'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['inbox'],
				operation: ['sendEmail'],
			},
		},
		options: [
			{
				displayName: 'From Email',
				name: 'fromEmail',
				type: 'string',
				default: '',
				placeholder: 'sender@email.com',
				description: 'Email address to send from',
			},
			{
				displayName: 'CC',
				name: 'cc',
				type: 'string',
				default: '',
				description: 'Comma-separated list of CC email addresses',
			},
			{
				displayName: 'BCC',
				name: 'bcc',
				type: 'string',
				default: '',
				description: 'Comma-separated list of BCC email addresses',
			},
		],
	},

	// ----------------------------------
	//        inbox: sendLinkedIn
	// ----------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the contact to send the LinkedIn message to',
		displayOptions: {
			show: {
				resource: ['inbox'],
				operation: ['sendLinkedIn'],
			},
		},
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		typeOptions: {
			rows: 5,
		},
		required: true,
		default: '',
		description: 'Content of the LinkedIn message',
		displayOptions: {
			show: {
				resource: ['inbox'],
				operation: ['sendLinkedIn'],
			},
		},
	},

	// ----------------------------------
	//        inbox: sendWhatsApp
	// ----------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the contact to send the WhatsApp message to',
		displayOptions: {
			show: {
				resource: ['inbox'],
				operation: ['sendWhatsApp'],
			},
		},
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		typeOptions: {
			rows: 5,
		},
		required: true,
		default: '',
		description: 'Content of the WhatsApp message',
		displayOptions: {
			show: {
				resource: ['inbox'],
				operation: ['sendWhatsApp'],
			},
		},
	},
];
