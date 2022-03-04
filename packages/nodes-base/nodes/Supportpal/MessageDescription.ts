import { INodeProperties } from 'n8n-workflow';

export const messageDescription = [
	// ----------------------------------
	//         Fields: message
	// ----------------------------------
	{
		displayName: 'Ticket ID',
		name: 'ticket_id',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['message'],
			},
		},
		description: 'The ticket we are posting to.',
	},
	{
		displayName: 'Ticket ID',
		name: 'ticket_id',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['message'],
			},
		},
		description: 'Ticket ID to fetch messages for.',
	},
	{
		displayName: 'User ID',
		name: 'user_id',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['message'],
			},
		},
		description: 'The user we are posting on behalf of.',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create', 'update'],
				resource: ['message'],
			},
		},
		description: 'The message text.',
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['update', 'get', 'delete'],
			},
		},
		description: 'The ID of the message.',
	},
	{
		displayName: 'Simplify Response',
		name: 'simplify',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['create', 'update', 'get', 'getAll'],
			},
		},
		description: 'Return simplified response. Only returns the message data.',
	},
	{
		displayName: 'Additional Fields',
		name: 'optionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['create'],
			},
		},
		default: {},
		description: 'Additional optional fields of the user.',
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'User IP Address',
				name: 'user_ip_address',
				type: 'string',
				default: '',
				description: 'The IP address of the user.',
			},
			{
				displayName: 'Message Type',
				name: 'message_type',
				type: 'number',
				default: 0,
				description: 'Whether we are adding a normal message (false) or an operator note (true).',
			},
			{
				displayName: 'Attachments',
				name: 'attachment',
				type: 'json',
				default: '',
				description:
					'A multi-dimensional array of attachments in the format of "attachment[n][filename]" (attachment filename) and "attachment[n][contents]" (base64-encoded file contents).',
			},
			{
				displayName: 'CC',
				name: 'cc',
				type: 'json',
				default: '',
				description: 'An array of email addresses to CC on the ticket.',
			},
			{
				displayName: 'Is draft?',
				name: 'is_draft',
				type: 'boolean',
				default: false,
				description: 'Whether the message is a draft.',
			},
			{
				displayName: 'Send user email?',
				name: 'send_user_email',
				type: 'boolean',
				default: true,
				description:
					'If an operator reply, whether to send an email to the user(s). If a user reply, whether to send a notification to CCed email addresses.',
			},
			{
				displayName: 'Send operator email?',
				name: 'send_operator_email',
				type: 'boolean',
				default: true,
				description:
					'If a user reply, whether to send a notification to the relevant operators. If an operator reply, whether to also send an email to the operators containing the reply (default 0 in this case).',
			},
		],
	},
	{
		displayName: 'Query Parameters',
		name: 'queryParameters',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['getAll'],
			},
		},
		default: {},
		description: 'Query Parameters for filtering the messages.',
		placeholder: 'Add Parameter',
		options: [
			{
				displayName: 'Include Drafts?',
				name: 'include_draft',
				type: 'boolean',
				default: false,
				description: 'Whether to include drafts.',
			},
			{
				displayName: 'By User Only?',
				name: 'by',
				type: 'boolean',
				default: false,
				description: 'Filter by messages posted by operator (false) or users (true) only.',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'boolean',
				default: false,
				description: 'Filter by ticket messages (false) or ticket notes (true) only.',
			},
			{
				displayName: 'Start',
				name: 'start',
				type: 'number',
				default: 1,
				description: 'The first result to start from.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				description: 'The amount of results to fetch.',
			},
			{
				displayName: 'Order Column',
				name: 'order_column',
				type: 'string',
				default: 'id',
				description: 'The column to sort by.',
			},
			{
				displayName: 'Order Direction',
				name: 'order_direction',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				default: 'asc',
				description: 'The ordering of the results.',
			},
		],
	},
] as INodeProperties[];
