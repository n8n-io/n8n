import type { INodeProperties } from 'n8n-workflow';

export const problemOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['problem'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a problem',
				action: 'Create a problem',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a problem',
				action: 'Delete a problem',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a problem',
				action: 'Get a problem',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many problems',
				action: 'Get many problems',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a problem',
				action: 'Update a problem',
			},
		],
		default: 'create',
	},
];

export const problemFields: INodeProperties[] = [
	// ----------------------------------------
	//             problem: create
	// ----------------------------------------
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['problem'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Requester Name or ID',
		name: 'requesterId',
		description:
			'ID of the initiator of the problem. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getRequesters',
		},
		displayOptions: {
			show: {
				resource: ['problem'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Due By',
		name: 'dueBy',
		description: 'Date when the problem is due to be solved',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: ['problem'],
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
				resource: ['problem'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Agent Name or ID',
				name: 'agent_id',
				type: 'options',
				default: '',
				description:
					'ID of the agent to whom the problem is assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getAgents',
				},
			},
			{
				displayName: 'Department Name or ID',
				name: 'department_id',
				type: 'options',
				default: '',
				description:
					'ID of the department initiating the problem. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getDepartments',
				},
			},
			{
				displayName: 'Description',
				name: 'description',
				description: 'HTML supported',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Group Name or ID',
				name: 'group_id',
				type: 'options',
				default: '',
				description:
					'ID of the agent group to which the problem is assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				default: 1,
				options: [
					{
						name: 'Open',
						value: 1,
					},
					{
						name: 'Change Requested',
						value: 2,
					},
					{
						name: 'Closed',
						value: 3,
					},
				],
			},
		],
	},

	// ----------------------------------------
	//             problem: delete
	// ----------------------------------------
	{
		displayName: 'Problem ID',
		name: 'problemId',
		description: 'ID of the problem to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['problem'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//               problem: get
	// ----------------------------------------
	{
		displayName: 'Problem ID',
		name: 'problemId',
		description: 'ID of the problem to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['problem'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//             problem: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['problem'],
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
				resource: ['problem'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},

	// ----------------------------------------
	//             problem: update
	// ----------------------------------------
	{
		displayName: 'Problem ID',
		name: 'problemId',
		description: 'ID of the problem to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['problem'],
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
				resource: ['problem'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Agent Name or ID',
				name: 'agent_id',
				type: 'options',
				default: '',
				description:
					'ID of the agent to whom the problem is assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getAgents',
				},
			},
			{
				displayName: 'Department Name or ID',
				name: 'department_id',
				type: 'options',
				default: '',
				description:
					'ID of the department initiating the problem. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				displayName: 'Due By',
				name: 'due_by',
				description: 'Date when the problem is due to be solved',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Group Name or ID',
				name: 'group_id',
				type: 'options',
				default: '',
				description:
					'ID of the agent group to which the problem is assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				displayName: 'Requester Name or ID',
				name: 'requester_id',
				type: 'options',
				default: '',
				description:
					'ID of the initiator of the problem. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getRequesters',
				},
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
						name: 'Change Requested',
						value: 2,
					},
					{
						name: 'Closed',
						value: 3,
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
