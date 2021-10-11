import {
	INodeProperties,
} from 'n8n-workflow';

export const ArticlesDescription = [
			// ----------------------------------
			//         Operation: article
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['article'],
						api: ['rest']
					}
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a article to an object.'
					},
					{
						name: 'List By Ticket ID',
						value: 'listByTicketId',
						description: 'Get all articles by the ticket ID.'
					},
					{
						name: 'Show',
						value: 'show',
						description: 'Get specific article.'
					},
				],
				default: 'create',
				description: 'The operation to perform.'
			},
			// ----------------------------------
			//         Fields: article
			// ----------------------------------
			{
				displayName: 'Ticket ID',
				name: 'ticket_id',
				type: 'number',
				default: 0,
				required: true,
				displayOptions: {
					show: {
						operation: ['create', 'listByTicketId'],
						resource: ['article'],
						api: ['rest'],
					}
				},
				description: 'The ticket ID of the article.'
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['show'],
						resource: ['article'],
						api: ['rest'],
					}
				},
				description: 'The ID of the article.'
			},
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['article'],
						api: ['rest'],
					}
				},
				description: 'The body of the article.'
			},
			{
				displayName: 'Additional Fields',
				name: 'optionalFields',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['article'],
						api: ['rest'],
					}
				},
				default: {},
				description: 'Additional optional fields of the article.',
				placeholder: 'Add Field',
				options: [
					{
						displayName: 'To',
						name: 'to',
						type: 'string',
						default: '',
						description: "The recipient."
					},
					{
						displayName: 'CC',
						name: 'cc',
						type: 'string',
						default: '',
						description: "The cc recipient."
					},
					{
						displayName: 'Reply to',
						name: 'reply_to',
						type: 'string',
						default: '',
						description: "The reply to info."
					},
					{
						displayName: 'In Reply to',
						name: 'in_reply_to',
						type: 'string',
						default: '',
						description: "What this article is a reply to."
					},
					{
						displayName: 'Message ID',
						name: 'message_id',
						type: 'string',
						default: '',
						description: "The message ID."
					},
					{
						displayName: 'Subject',
						name: 'subject',
						type: 'string',
						default: '',
						description: "The subject of the article."
					},
					{
						displayName: 'Content Type',
						name: 'content_type',
						type: 'string',
						default: '',
						description: "The content type of the article."
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'string',
						default: '',
						description: "The type of the article."
					},
					{
						displayName: 'Internal?',
						name: 'internal',
						type: 'boolean',
						default: false,
						description: "If article is internal."
					},
					{
						displayName: 'Time Unit',
						name: 'time_unit',
						type: 'string',
						default: '',
						description: "The time unit of the article. This is ignored by the API but documented, so it is left here."
					},
				]
			},

] as INodeProperties[];
