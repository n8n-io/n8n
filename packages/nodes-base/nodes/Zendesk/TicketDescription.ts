import { INodeProperties } from 'n8n-workflow';

export const ticketOperations: INodeProperties[] = [
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
				description: 'Get a ticket',
				action: 'Get a ticket',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many tickets',
				action: 'Get many tickets',
			},
			{
				name: 'Recover',
				value: 'recover',
				description: 'Recover a suspended ticket',
				action: 'Recover a ticket',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a ticket',
				action: 'Update a ticket',
			},
		],
		default: 'create',
	},
];

export const ticketFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                ticket:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
		required: true,
		description: 'The first comment on the ticket',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
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
				resource: ['ticket'],
				operation: ['create'],
				jsonParameters: [false],
			},
		},
		options: [
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Add Custom Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						displayName: 'Custom Field',
						name: 'customFieldsValues',
						values: [
							{
								displayName: 'Name or ID',
								name: 'id',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								default: '',
								description:
									'Custom field ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Custom field Value',
							},
						],
					},
				],
			},
			{
				displayName: 'External ID',
				name: 'externalId',
				type: 'string',
				default: '',
				description: 'An ID you can use to link Zendesk Support tickets to local records',
			},
			{
				displayName: 'Group Name or ID',
				name: 'group',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getGroups',
				},
				default: '',
				description:
					'The group this ticket is assigned to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Recipient',
				name: 'recipient',
				type: 'string',
				default: '',
				description: 'The original recipient e-mail address of the ticket',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Closed',
						value: 'closed',
					},
					{
						name: 'New',
						value: 'new',
					},
					{
						name: 'On-Hold',
						value: 'hold',
					},
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'Pending',
						value: 'pending',
					},
					{
						name: 'Solved',
						value: 'solved',
					},
				],
				default: '',
				description: 'The state of the ticket',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'The value of the subject field for this ticket',
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				description:
					'The array of tags applied to this ticket. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Question',
						value: 'question',
					},
					{
						name: 'Incident',
						value: 'incident',
					},
					{
						name: 'Problem',
						value: 'problem',
					},
					{
						name: 'Task',
						value: 'task',
					},
				],
				default: '',
				description: 'The type of this ticket',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFieldsJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
				jsonParameters: [true],
			},
		},
		description:
			'Object of values to set as described <a href="https://developer.zendesk.com/rest_api/docs/support/tickets">here</a>',
	},

	/* -------------------------------------------------------------------------- */
	/*                                ticket:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['update'],
				jsonParameters: [false],
			},
		},
		options: [
			{
				displayName: 'Assignee Email',
				name: 'assigneeEmail',
				type: 'string',
				default: '',
				description: 'The e-mail address of the assignee',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Add Custom Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						displayName: 'Custom Field',
						name: 'customFieldsValues',
						values: [
							{
								displayName: 'Name or ID',
								name: 'id',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								default: '',
								description:
									'Custom field ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Custom field Value',
							},
						],
					},
				],
			},
			{
				displayName: 'External ID',
				name: 'externalId',
				type: 'string',
				default: '',
				description: 'An ID you can use to link Zendesk Support tickets to local records',
			},
			{
				displayName: 'Group Name or ID',
				name: 'group',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getGroups',
				},
				default: '',
				description:
					'The group this ticket is assigned to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Internal Note',
				name: 'internalNote',
				type: 'string',
				default: '',
				description: 'Internal Ticket Note (Accepts HTML)',
			},
			{
				displayName: 'Public Reply',
				name: 'publicReply',
				type: 'string',
				default: '',
				description: 'Public ticket reply',
			},
			{
				displayName: 'Recipient',
				name: 'recipient',
				type: 'string',
				default: '',
				description: 'The original recipient e-mail address of the ticket',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Closed',
						value: 'closed',
					},
					{
						name: 'New',
						value: 'new',
					},
					{
						name: 'On-Hold',
						value: 'hold',
					},
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'Pending',
						value: 'pending',
					},
					{
						name: 'Solved',
						value: 'solved',
					},
				],
				default: '',
				description: 'The state of the ticket',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'The value of the subject field for this ticket',
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				description:
					'The array of tags applied to this ticket. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Question',
						value: 'question',
					},
					{
						name: 'Incident',
						value: 'incident',
					},
					{
						name: 'Problem',
						value: 'problem',
					},
					{
						name: 'Task',
						value: 'task',
					},
				],
				default: '',
				description: 'The type of this ticket',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFieldsJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['update'],
				jsonParameters: [true],
			},
		},
		description:
			'Object of values to update as described <a href="https://developer.zendesk.com/rest_api/docs/support/tickets">here</a>',
	},
	{
		displayName: 'Ticket Type',
		name: 'ticketType',
		type: 'options',
		options: [
			{
				name: 'Regular',
				value: 'regular',
			},
			{
				name: 'Suspended',
				value: 'suspended',
			},
		],
		default: 'regular',
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['get', 'delete', 'getAll'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                 ticket:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['get'],
				ticketType: ['regular'],
			},
		},
	},
	{
		displayName: 'Suspended Ticket ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['get'],
				ticketType: ['suspended'],
			},
		},
		description: 'Ticket ID',
	},
	/* -------------------------------------------------------------------------- */
	/*                                   ticket:getAll                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Group Name or ID',
				name: 'group',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getGroups',
				},
				displayOptions: {
					show: {
						'/ticketType': ['regular'],
					},
				},
				default: '',
				description:
					'The group to search. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				displayOptions: {
					show: {
						'/ticketType': ['regular'],
					},
				},
				default: '',
				description:
					'<a href="https://developer.zendesk.com/api-reference/ticketing/ticket-management/search/#syntax-examples">Query syntax</a> to search tickets',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				options: [
					{
						name: 'Created At',
						value: 'created_at',
					},
					{
						name: 'Priority',
						value: 'priority',
					},
					{
						name: 'Status',
						value: 'status',
					},
					{
						name: 'Ticket Type',
						value: 'ticket_type',
					},
					{
						name: 'Updated At',
						value: 'updated_at',
					},
				],
				default: 'updated_at',
				description: 'Defaults to sorting by relevance',
			},
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
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
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				displayOptions: {
					show: {
						'/ticketType': ['regular'],
					},
				},
				options: [
					{
						name: 'Closed',
						value: 'closed',
					},
					{
						name: 'New',
						value: 'new',
					},
					{
						name: 'On-Hold',
						value: 'hold',
					},
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'Pending',
						value: 'pending',
					},
					{
						name: 'Solved',
						value: 'solved',
					},
				],
				default: '',
				description: 'The state of the ticket',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                ticket:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Ticket ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['delete'],
				ticketType: ['regular'],
			},
		},
	},
	{
		displayName: 'Suspended Ticket ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['delete'],
				ticketType: ['suspended'],
			},
		},
		description: 'Ticket ID',
	},
	/* -------------------------------------------------------------------------- */
	/*                                ticket:recover                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Suspended Ticket ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['recover'],
			},
		},
	},
];
