import type { INodeProperties } from 'n8n-workflow';

export const conversationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: {
			show: {
				resource: ['conversation'],
			},
		},

		options: [
			{
				name: 'Reply',
				value: 'reply',
				description: 'Reply to a ticket',
				action: 'Reply to a ticket',
			},
			{
				name: 'Note',
				value: 'notes',
				description: 'Add a note to a ticket',
				action: 'Add a note to a ticket',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a note',
				action: 'Update a note',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a conversation',
				action: 'Delete a conversation',
			},
		],
		default: 'reply',
	},
];

export const conversationFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                conversation:reply                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['conversation'],
				operation: ['reply'],
			},
		},
		description: 'ID of the ticket',
		required: true,
	},
	{
		displayName: 'Reply Content',
		name: 'body',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['conversation'],
				operation: ['reply'],
			},
		},
		required: true,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['conversation'],
				operation: ['reply'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'From Email',
				name: 'from_email',
				type: 'string',
				default: '',
				description:
					'The email address from which the reply is sent. By default the global support email will be used.',
			},
			{
				displayName: 'Cc Email',
				name: 'cc_email',
				type: 'string',
				default: '',
				typeOptions: {
					multipleValues: true,
				},
				description: "Email address added in the 'cc' field of the outgoing ticket email",
			},
			{
				displayName: 'Bcc Email',
				name: 'bcc_email',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: '',
				description: "Email address added in the 'bcc' field of the outgoing ticket email",
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                conversation:notes                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['notes'],
				resource: ['conversation'],
			},
		},
		description: 'ID of the ticket',
		required: true,
	},
	{
		displayName: 'Note Content',
		name: 'body',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['conversation'],
				operation: ['notes'],
			},
		},
		required: true,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['conversation'],
				operation: ['notes'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Private',
				name: 'private',
				type: 'boolean',
				default: true,
				description: 'Set to true if the note is private. The default value is true.',
			},
			{
				displayName: 'Notify Email',
				name: 'notify_emails',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
				description: 'Email addresses of agents/users who need to be notified about this note',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                conversation:update                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'number',
		default: '',
		displayOptions: {
			show: {
				resource: ['conversation'],
				operation: ['update'],
			},
		},
		required: true,
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['conversation'],
				operation: ['update'],
			},
		},
		required: true,
	},
	/* -------------------------------------------------------------------------- */
	/*                                conversation:delete                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'number',
		default: '',
		displayOptions: {
			show: {
				resource: ['conversation'],
				operation: ['delete'],
			},
		},
		required: true,
	},
];
