import {
	INodeProperties,
} from 'n8n-workflow';

export const ticketDescription: INodeProperties[] = [
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
					'ticket',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a ticket',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a ticket',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a ticket',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all tickets',
			},
			{
				name: 'Search',
				value: 'search', // TODO combine with get
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a ticket',
			},
		],
		default: 'create',
	},

	// ----------------------------------
	//             fields
	// ----------------------------------
	{
		displayName: 'Group',
		name: 'group',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'ticket',
				],
			},
		},
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'ticket',
				],
			},
		},
	},
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string', // TODO: loadOptions
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'ticket',
				],
			},
		},
	},
	{
		displayName: 'Ticket ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
					'get',
					'delete',
				],
				resource: [
					'ticket',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'ticket',
				],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Close Time',
				name: 'close_at',
				type: 'dateTime',
				default: '',
				description: 'Date and time when the ticket was closed',
			},
			{
				displayName: 'Customer Email',
				name: 'customer',
				type: 'string',
				default: '',
				description: 'Email address of the customer who opened the ticket',
			},
			{
				displayName: 'Escalation Time',
				name: 'escalation_at',
				type: 'dateTime',
				default: '',
				description: 'Date and time when the ticket was escalated',
			},
			{
				displayName: 'First Response Escalation Time',
				name: 'first_response_escalation_at',
				type: 'dateTime',
				default: '',
				description: 'Date and time when an escalated ticket was first responded to',
			},
			{
				displayName: 'First Response Time',
				name: 'first_response_at',
				type: 'dateTime',
				default: '',
				description: 'Date and time when the ticket was first responded to',
			},
			{
				displayName: 'Group ID',
				name: 'group_id',
				type: 'string', // TODO loadOptions
				default: '',
			},
			{
				displayName: 'Notes',
				name: 'note',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Owner ID',
				name: 'owner_id',
				type: 'string', // TODO loadOptions
				default: '',
			},
			{
				displayName: 'Priority ID',
				name: 'priority_id',
				type: 'string', // TODO loadOptions
				default: '',
			},
			{
				displayName: 'State ID',
				name: 'state_id',
				type: 'string', // TODO loadOptions
				default: '',
			},
			{
				displayName: 'Ticket Type',
				name: 'type',
				type: 'string', // TODO loadOptions
				default: '',
			},
		],
	},
	{
		displayName: 'Article Body',
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
					'ticket',
				],
			},
		},
	},
	// {
	// 	displayName: 'Article Additional Fields',
	// 	name: 'additionalFieldsArticle',
	// 	type: 'collection',
	// 	displayOptions: {
	// 		show: {
	// 			operation: [
	// 				'create',
	// 				'update',
	// 			],
	// 			resource: [
	// 				'ticket',
	// 			],
	// 		},
	// 	},
	// 	default: {},
	// 	placeholder: 'Add Field',
	// 	options: [
	// 		{
	// 			displayName: 'CC',
	// 			name: 'cc',
	// 			type: 'string',
	// 			default: '',
	// 		},
	// 		{
	// 			displayName: 'Content Type',
	// 			name: 'content_type',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'The content type of the article',
	// 		},
	// 		{
	// 			displayName: 'In Reply To',
	// 			name: 'in_reply_to',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'What this article is a reply to',
	// 		},
	// 		{
	// 			displayName: 'Internal?',
	// 			name: 'internal',
	// 			type: 'boolean',
	// 			default: false,
	// 			description: 'Whether the article is internal',
	// 		},
	// 		{
	// 			displayName: 'Message ID',
	// 			name: 'message_id',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'The message ID',
	// 		},
	// 		{
	// 			displayName: 'Reply To',
	// 			name: 'reply_to',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'The reply to info',
	// 		},
	// 		{
	// 			displayName: 'To',
	// 			name: 'to',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'The recipient',
	// 		},
	// 		{
	// 			displayName: 'Subject',
	// 			name: 'subject',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'The subject of the article',
	// 		},
	// 		{
	// 			displayName: 'Time Unit',
	// 			name: 'time_unit',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'The time unit of the article. This is ignored by the API but documented, so it is left here.',
	// 		},
	// 		{
	// 			displayName: 'Type',
	// 			name: 'type',
	// 			type: 'string',
	// 			default: '',
	// 			description: 'The type of the article',
	// 		},
	// 	],
	// },
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'ticket',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'ticket',
				],
			},
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Sort By',
		name: 'sort_by',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'ticket',
				],
			},
		},
		description: 'How to sort the tickets',
	},
	{
		displayName: 'Sort Order',
		name: 'order_by',
		type: 'options',
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'ticket',
				],
			},
		},
		options: [
			{
				name: 'Ascending',
				value: 'asc',
			},
			{
				name: 'Descending',
				value: 'desc',
			},
		],
		default: 'asc',
	},
];
