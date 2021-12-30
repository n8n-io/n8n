import {
	INodeProperties,
} from 'n8n-workflow';

export const ticketsDescription: INodeProperties[] = [
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
				api: [
					'rest',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an entry',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an entry',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an entry',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all entries',
			},
			{
				name: 'Search',
				value: 'search', // TODO combine with get
				description: 'Get data of an entry',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an entry',
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
				api: [
					'rest',
				],
			},
		},
		description: 'The group of the ticket',
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
				api: [
					'rest',
				],
			},
		},
		description: 'The title of the ticket',
	},
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'number',
		default: 0,
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
				api: [
					'rest',
				],
			},
		},
		description: 'The ID of the customer',
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
					'update',
					'get',
					'delete',
				],
				resource: [
					'ticket',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The ID of the ticket',
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
					'ticket',
				],
				api: [
					'rest',
				],
			},
		},
		default: {},
		description: 'Additional optional fields of the ticket',
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Close Time',
				name: 'close_at',
				type: 'dateTime',
				default: 0,
				description: 'The closing time of the ticket',
			},
			{
				displayName: 'Close Escalation Time',
				name: 'close_escalation_at',
				type: 'dateTime',
				default: 0,
				description: 'The escalation closing time of the ticket',
			},
			{
				displayName: 'Close in Minutes',
				name: 'close_in_min',
				type: 'number',
				default: 0,
				description: 'The closing time in minutes of the ticket',
			},
			{
				displayName: 'Close Difference in Minutes',
				name: 'close_diff_in_min',
				type: 'number',
				default: 0,
				description: 'The closing difference time in minutes of the ticket',
			},
			{
				displayName: 'Customer Email',
				name: 'customer',
				type: 'string',
				default: '',
				description: 'The Email of the customer of the ticket',
			},
			{
				displayName: 'Escalation Time',
				name: 'escalation_at',
				type: 'dateTime',
				default: 0,
				description: 'Time of ticket escalation',
			},
			{
				displayName: 'First Response Escalation Time',
				name: 'first_response_escalation_at',
				type: 'dateTime',
				default: 0,
				description: 'The first response escalation time of the ticket',
			},
			{
				displayName: 'First Response in Minutes',
				name: 'first_response_in_min',
				type: 'number',
				default: 0,
				description: 'The first response time in minutes of the ticket',
			},
			{
				displayName: 'First Response Difference in Minutes',
				name: 'first_response_diff_in_min',
				type: 'number',
				default: 0,
				description: 'The first response difference time in minutes of the ticket',
			},
			{
				displayName: 'First Response Time',
				name: 'first_response_at',
				type: 'dateTime',
				default: 0,
				description: 'The first response time of the ticket',
			},
			{
				displayName: 'Group ID',
				name: 'group_id',
				type: 'number',
				default: 0,
				description: 'The Group ID of the ticket',
			},
			{
				displayName: 'Last Contact Time of Agent',
				name: 'last_contact_agent_at',
				type: 'dateTime',
				default: 0,
				description: 'Time of last contact of agent',
			},
			{
				displayName: 'Last Contact Time of Customer',
				name: 'last_contact_customer_at',
				type: 'dateTime',
				default: 0,
				description: 'Time of last contact of customer',
			},
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
				description: 'The note of the ticket',
			},
			{
				displayName: 'Owner ID',
				name: 'owner_id',
				type: 'number',
				default: 0,
				description: 'The Owner ID of the ticket',
			},
			{
				displayName: 'Pending Time',
				name: 'pending_time',
				type: 'dateTime',
				default: 0,
				description: 'Ticket pending time',
			},
			{
				displayName: 'Priority ID',
				name: 'priority_id',
				type: 'number',
				default: 0,
				description: 'The Priority ID of the ticket',
			},
			{
				displayName: 'State ID',
				name: 'state_id',
				type: 'number',
				default: 0,
				description: 'The State ID of the ticket',
			},
			{
				displayName: 'Update Difference in Minutes',
				name: 'update_diff_in_min',
				type: 'number',
				default: 0,
				description: 'The update difference time in minutes of the ticket',
			},
			{
				displayName: 'Update Escalation Time',
				name: 'update_escalation_at',
				type: 'dateTime',
				default: 0,
				description: 'The escalation update time of the ticket',
			},
			{
				displayName: 'Update in Minutes',
				name: 'update_in_min',
				type: 'number',
				default: 0,
				description: 'The update time in minutes of the ticket',
			},
			{
				displayName: 'Ticket Type',
				name: 'type',
				type: 'string',
				default: '',
				description: 'Ticket type',
			},
			{
				displayName: 'Time Unit',
				name: 'time_unit',
				type: 'string',
				default: '',
				description: 'Ticket time unit',
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
				api: [
					'rest',
				],
			},
		},
		description: 'The body of the article',
	},
	{
		displayName: 'Article Body',
		name: 'body',
		type: 'string',
		default: '',
		required: false,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'ticket',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The body of the article',
	},
	{
		displayName: 'Article Additional Fields',
		name: 'optionalFieldsArticle',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'create',
					'update',
				],
				resource: [
					'ticket',
				],
				api: [
					'rest',
				],
			},
		},
		default: {},
		description: 'Additional optional fields of the article',
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'CC',
				name: 'cc',
				type: 'string',
				default: '',
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
				displayName: 'To',
				name: 'to',
				type: 'string',
				default: '',
				description: 'The recipient',
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
				displayName: 'Type',
				name: 'type',
				type: 'string',
				default: '',
				description: 'The type of the article',
			},
		],
	},
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
				api: [
					'rest',
				],
			},
		},
		description: 'The query to search the tickets',
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
				api: [
					'rest',
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
				api: [
					'rest',
				],
			},
		},
		description: 'How to sort the tickets',
	},
	{
		displayName: 'Order By',
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
				api: [
					'rest',
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
		description: 'How to order the tickets',
	},
];
