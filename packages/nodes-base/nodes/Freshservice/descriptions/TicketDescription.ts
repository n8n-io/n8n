import type { INodeProperties } from 'n8n-workflow';

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
				description: 'Retrieve a ticket',
				action: 'Get a ticket',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many tickets',
				action: 'Get many tickets',
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
	// ----------------------------------------
	//              ticket: create
	// ----------------------------------------
	{
		displayName: 'Email',
		name: 'email',
		description: 'Email address of the ticket author',
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		description: 'HTML supported',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Priority',
		name: 'priority',
		type: 'options',
		default: 1,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Low',
				value: 1,
			},
			{
				name: 'Medium',
				value: 2,
			},
			{
				name: 'High',
				value: 3,
			},
			{
				name: 'Urgent',
				value: 4,
			},
		],
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		default: 2,
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Open',
				value: 2,
			},
			{
				name: 'Pending',
				value: 3,
			},
			{
				name: 'Resolved',
				value: 4,
			},
			{
				name: 'Closed',
				value: 5,
			},
		],
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
			},
		},
		options: [
			{
				displayName: 'CC Emails',
				name: 'cc_emails',
				type: 'string',
				default: '',
				description: 'Comma-separated email addresses to add in the CC field of the ticket email',
			},
			{
				displayName: 'Department Name or ID',
				name: 'department_id',
				type: 'options',
				default: '',
				description:
					'ID of the department to which this ticket belongs. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getDepartments',
				},
			},
			{
				displayName: 'Group Name or ID',
				name: 'group_id',
				type: 'options',
				default: '',
				description:
					'ID of the group to which the ticket has been assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getAgentGroups',
				},
			},
			{
				displayName: 'Impact',
				name: 'impact',
				type: 'options',
				default: 1,
				options: [
					{
						name: 'Low',
						value: 1,
					},
					{
						name: 'Medium',
						value: 2,
					},
					{
						name: 'High',
						value: 3,
					},
				],
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the ticket author',
			},
			{
				displayName: 'Requester Name or ID',
				name: 'requester_id',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getRequesters',
				},
			},
		],
	},

	// ----------------------------------------
	//              ticket: delete
	// ----------------------------------------
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		description: 'ID of the ticket to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//               ticket: get
	// ----------------------------------------
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		description: 'ID of the ticket to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//              ticket: getAll
	// ----------------------------------------
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
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['ticket'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Agent Name or ID',
				name: 'agent_id',
				type: 'options',
				default: '',
				description:
					'ID of the agent to whom the tickets have been assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getAgents',
				},
			},
			{
				displayName: 'Group Name or ID',
				name: 'group_id',
				type: 'options',
				default: '',
				description:
					'ID of the group to which the tickets have been assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getAgentGroups',
				},
			},
			{
				displayName: 'Impact',
				name: 'impact',
				type: 'options',
				default: 1,
				options: [
					{
						name: 'Low',
						value: 1,
					},
					{
						name: 'Medium',
						value: 2,
					},
					{
						name: 'High',
						value: 3,
					},
				],
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				default: 1,
				options: [
					{
						name: 'Low',
						value: 1,
					},
					{
						name: 'Medium',
						value: 2,
					},
					{
						name: 'High',
						value: 3,
					},
					{
						name: 'Urgent',
						value: 4,
					},
				],
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 2,
				options: [
					{
						name: 'Open',
						value: 2,
					},
					{
						name: 'Pending',
						value: 3,
					},
					{
						name: 'Resolved',
						value: 4,
					},
					{
						name: 'Closed',
						value: 5,
					},
				],
			},
			{
				displayName: 'Created On',
				name: 'created_at',
				type: 'dateTime',
				default: '',
				description: 'Date when the ticket was created',
			},
			{
				displayName: 'Due By',
				name: 'due_by',
				description: 'Date when the ticket is due to be resolved',
				type: 'dateTime',
				default: '',
			},
		],
	},

	// ----------------------------------------
	//              ticket: update
	// ----------------------------------------
	{
		displayName: 'Ticket ID',
		name: 'ticketId',
		description: 'ID of the ticket to update',
		type: 'string',
		required: true,
		default: '',
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
			},
		},
		options: [
			{
				displayName: 'Department Name or ID',
				name: 'department_id',
				type: 'options',
				default: '',
				description:
					'ID of the department to which this ticket has been assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getDepartments',
				},
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'HTML supported',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Email address of the ticket author',
			},
			{
				displayName: 'Group Name or ID',
				name: 'group_id',
				type: 'options',
				default: '',
				description:
					'ID of the group to which the ticket has been assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getAgentGroups',
				},
			},
			{
				displayName: 'Impact',
				name: 'impact',
				type: 'options',
				default: 1,
				options: [
					{
						name: 'Low',
						value: 1,
					},
					{
						name: 'Medium',
						value: 2,
					},
					{
						name: 'High',
						value: 3,
					},
				],
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the ticket author',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				default: 1,
				description: 'Priority of the ticket',
				options: [
					{
						name: 'Low',
						value: 1,
					},
					{
						name: 'Medium',
						value: 2,
					},
					{
						name: 'High',
						value: 3,
					},
					{
						name: 'Urgent',
						value: 4,
					},
				],
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 2,
				options: [
					{
						name: 'Open',
						value: 2,
					},
					{
						name: 'Pending',
						value: 3,
					},
					{
						name: 'Resolved',
						value: 4,
					},
					{
						name: 'Closed',
						value: 5,
					},
				],
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
			},
		],
	},
];
