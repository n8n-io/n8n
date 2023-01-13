import { INodeProperties } from 'n8n-workflow';

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
				resource: ['ticket'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a ticket',
				action: 'Create a ticket',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a ticket',
				action: 'Delete a ticket',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a ticket',
				action: 'Get a ticket',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many tickets',
				action: 'Get many tickets',
			},
		],
		default: 'create',
	},

	// ----------------------------------
	//             fields
	// ----------------------------------
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		description: 'Title of the ticket to create',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Group Name or ID',
		name: 'group',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'loadGroupNames',
		},
		placeholder: 'First-Level Helpdesk',
		description:
			'Group that will own the ticket to create. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Customer Email Name or ID',
		name: 'customer',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'loadCustomerEmails',
		},
		description:
			'Email address of the customer concerned in the ticket to create. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		default: '',
		placeholder: 'hello@n8n.io',
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Ticket ID',
		name: 'id',
		type: 'string',
		description:
			'Ticket to retrieve. Specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Ticket ID',
		name: 'id',
		type: 'string',
		default: '',
		description:
			'Ticket to delete. Specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['delete'],
			},
		},
	},
	{
		displayName: 'Article',
		name: 'article',
		type: 'fixedCollection',
		placeholder: 'Add Article',
		required: true,
		default: {},
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Article Details',
				name: 'articleDetails',
				values: [
					{
						displayName: 'Subject',
						name: 'subject',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Body',
						name: 'body',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Visibility',
						name: 'visibility',
						type: 'options',
						default: 'internal',
						options: [
							{
								name: 'External',
								value: 'external',
								description: 'Visible to customers',
							},
							{
								name: 'Internal',
								value: 'internal',
								description: 'Visible to help desk',
							},
						],
					},
					{
						displayName: 'Article Type',
						name: 'type',
						type: 'options',
						// https://docs.zammad.org/en/latest/api/ticket/articles.html
						options: [
							{
								name: 'Chat',
								value: 'chat',
							},
							{
								name: 'Email',
								value: 'email',
							},
							{
								name: 'Fax',
								value: 'fax',
							},
							{
								name: 'Note',
								value: 'note',
							},
							{
								name: 'Phone',
								value: 'phone',
							},
							{
								name: 'SMS',
								value: 'sms',
							},
						],
						default: 'note',
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Custom Field',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'customFieldPairs',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'name',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'loadTicketCustomFields',
								},
								default: '',
								description:
									'Name of the custom field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set on the custom field',
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['ticket'],
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
		},
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
];
