import {
	INodeProperties,
} from 'n8n-workflow';

export const ticketOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
				name: 'Update',
				value: 'update',
				description: 'Update a ticket',
			},
		],
		default: 'create',
	},
] as INodeProperties[];

export const ticketFields = [
	// ----------------------------------------
	//              ticket: create
	// ----------------------------------------
	{
		displayName: 'Email',
		name: 'email',
		description: 'Email address of the requester',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'create',
				],
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
				resource: [
					'ticket',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Category',
				name: 'category',
				type: 'number',
				default: 0,
				description: 'Category of the ticket',
			},
			{
				displayName: 'CC Emails',
				name: 'cc_emails',
				type: 'string',
				default: '',
				description: 'Comma-separated email addresses to add in the CC field of the incoming ticket email',
			},
			{
				displayName: 'Department ID',
				name: 'department_id',
				type: 'options',
				default: '',
				description: 'ID of the department to which this ticket belongs',
				typeOptions: {
					loadOptionsMethod: [
						'getDepartments',
					],
				},
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Content of the ticket in HTML',
			},
			{
				displayName: 'Forward Emails',
				name: 'fwd_emails',
				type: 'string',
				default: '',
				description: 'Comma-separated email addresses to add while forwarding a ticket',
			},
			{
				displayName: 'Group ID',
				name: 'group_id',
				type: 'options',
				default: '',
				description: 'ID of the group to which the ticket has been assigned',
				typeOptions: {
					loadOptionsMethod: [
						'getGroups',
					],
				},
			},
			{
				displayName: 'Impact',
				name: 'impact',
				type: 'options',
				default: 1,
				description: 'Impact of the ticket',
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
				description: 'Name of the requester',
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
				displayName: 'Reply CC Emails',
				name: 'reply_cc_emails',
				type: 'string',
				default: '',
				description: 'Comma-separated email addresses to add while replying to a ticket',
			},
			{
				displayName: 'Requester ID',
				name: 'requester_id',
				type: 'options',
				default: '',
				description: 'ID of the requester',
				typeOptions: {
					loadOptionsMethod: [
						'getRequesters',
					],
				},
			},
			{
				displayName: 'Responder ID',
				name: 'responder_id',
				type: 'options',
				default: '',
				description: 'ID of the agent to whom the ticket has been assigned',
				typeOptions: {
					loadOptionsMethod: [
						'getAgents',
					],
				},
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 1,
				description: 'Status of the ticket',
				options: [
					{
						name: 'Open',
						value: 1,
					},
					{
						name: 'Pending',
						value: 2,
					},
					{
						name: 'Resolved',
						value: 3,
					},
					{
						name: 'Closed',
						value: 4,
					},
				],
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'Subject of the ticket',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'Comma-separated tags associated with the ticket',
			},
			{
				displayName: 'To Emails',
				name: 'to_emails',
				type: 'string',
				default: '',
				description: 'Comma-separated email addresses to which the ticket was originally sent',
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
				resource: [
					'ticket',
				],
				operation: [
					'delete',
				],
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
				resource: [
					'ticket',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//              ticket: getAll
	// ----------------------------------------
	{
		displayName: 'Filters',
		name: 'Filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Agent ID',
				name: 'agent_id',
				type: 'options',
				default: '',
				description: 'ID of the agent to whom the tickets have been assigned',
				typeOptions: {
					loadOptionsMethod: [
						'getAgents',
					],
				},
			},
			{
				displayName: 'Group ID',
				name: 'group_id',
				type: 'options',
				default: '',
				description: 'ID of the group to which the tickets have been assigned',
				typeOptions: {
					loadOptionsMethod: [
						'getAgentGroups',
					],
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
				default: 1,
				options: [
					{
						name: 'Open',
						value: 1,
					},
					{
						name: 'Pending',
						value: 2,
					},
					{
						name: 'Resolved',
						value: 3,
					},
					{
						name: 'Closed',
						value: 4,
					},
				],
			},
			{
				displayName: 'Created At',
				name: 'created_at',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Due By',
				name: 'due_by',
				description: 'Date when the ticket is due to be resolved',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'First Response Due By',
				name: 'fr_due_by',
				description: 'Date when the first response is due',
				type: 'dateTime',
				default: '',
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
				resource: [
					'ticket',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'How many results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
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
				resource: [
					'ticket',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'Update Fields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'CC Emails',
				name: 'cc_emails',
				type: 'string',
				default: '',
				description: 'Comma-separated email addresses to add in the CC field of the incoming ticket email',
			},
			{
				displayName: 'Department ID',
				name: 'department_id',
				type: 'options',
				default: '',
				description: 'ID of the department to which this ticket belongs',
				typeOptions: {
					loadOptionsMethod: [
						'getDepartments',
					],
				},
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Content of the ticket in HTML',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'Email address of the requester',
			},
			{
				displayName: 'Email Config ID',
				name: 'email_config_id',
				type: 'string',
				default: '',
				description: 'ID of email config used for this ticket',
			},
			{
				displayName: 'Forward Emails',
				name: 'fwd_emails',
				type: 'string',
				default: '',
				description: 'Comma-separated email addresses to add while forwarding a ticket',
			},
			{
				displayName: 'Group ID',
				name: 'group_id',
				type: 'options',
				default: '',
				description: 'ID of the group to which the ticket has been assigned',
				typeOptions: {
					loadOptionsMethod: [
						'getAgentGroups',
					],
				},
			},
			{
				displayName: 'Impact',
				name: 'impact',
				type: 'options',
				default: 1,
				description: 'Impact of the ticket',
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
				description: 'Name of the requester',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number of the requester',
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
				displayName: 'Reply CC Emails',
				name: 'reply_cc_emails',
				type: 'string',
				default: '',
				description: 'Comma-separated email addresses to add while replying to a ticket',
			},
			{
				displayName: 'Requester ID',
				name: 'requester_id',
				type: 'options',
				default: '',
				description: 'ID of the requester',
				typeOptions: {
					loadOptionsMethod: [
						'getRequesters',
					],
				},
			},
			{
				displayName: 'Responder ID',
				name: 'responder_id',
				type: 'options',
				default: '',
				description: 'ID of the agent to whom the ticket has been assigned',
				typeOptions: {
					loadOptionsMethod: [
						'getAgents',
					],
				},
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'Subject of the ticket',
			},
			{
				displayName: 'To Emails',
				name: 'to_emails',
				type: 'string',
				default: '',
				description: 'Comma-separated email addresses to which the ticket was originally sent',
			},
		],
	},
] as INodeProperties[];
