import {
	INodeProperties,
} from 'n8n-workflow';

export const articlesDescription: INodeProperties[] = [
	// ----------------------------------
	//           operations
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'article',
				],
				api: [
					'rest',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a article to an object',
			},
			{
				name: 'List By Ticket ID',
				value: 'listByTicketId',
				description: 'Get all articles by the ticket ID',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get specific article',
			},
		],
		default: 'create',
	},

	// ----------------------------------
	//             fields
	// ----------------------------------
	{
		displayName: 'Ticket ID',
		name: 'ticket_id',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
					'listByTicketId',
				],
				resource: [
					'article',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The ticket ID of the article',
	},
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'article',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The ID of the article',
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'article',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The body of the article',
	},
	{
		displayName: 'Additional Fields',
		name: 'optionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'article',
				],
				api: [
					'rest',
				],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'CC',
				name: 'cc',
				type: 'string',
				default: '',
				description: 'The cc recipient',
			},
			{
				displayName: 'Content Type',
				name: 'content_type',
				type: 'string',
				default: '',
				description: 'The content type of the article',
			},
			{
				displayName: 'In Reply To',
				name: 'in_reply_to',
				type: 'string',
				default: '',
				description: 'What this article is a reply to',
			},
			{
				displayName: 'Internal?',
				name: 'internal',
				type: 'boolean',
				default: false,
				description: 'Whether the article is internal',
			},
			{
				displayName: 'Message ID',
				name: 'message_id',
				type: 'string',
				default: '',
				description: 'The message ID',
			},
			{
				displayName: 'Reply To',
				name: 'reply_to',
				type: 'string',
				default: '',
				description: 'The reply to info',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'The subject of the article',
			},
			{
				displayName: 'Time Unit',
				name: 'time_unit',
				type: 'string',
				default: '',
				description: 'The time unit of the article. This is ignored by the API but documented, so it is left here.',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				default: '',
				description: 'The recipient',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'string',
				default: '',
				description: 'The type of the article',
			},
		],
	},
];
