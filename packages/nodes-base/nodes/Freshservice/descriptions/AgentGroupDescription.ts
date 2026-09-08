import type { INodeProperties } from 'n8n-workflow';

export const agentGroupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['agentGroup'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an agent group',
				action: 'Create an agent group',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an agent group',
				action: 'Delete an agent group',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an agent group',
				action: 'Get an agent group',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Retrieve many agent groups',
				action: 'Get many agent groups',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an agent group',
				action: 'Update an agent group',
			},
		],
		default: 'create',
	},
];

export const agentGroupFields: INodeProperties[] = [
	// ----------------------------------------
	//            agentGroup: create
	// ----------------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['agentGroup'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['agentGroup'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Escalate to agent name or ID',
				name: 'escalate_to',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getAgents',
				},
				description:
					'ID of the user to whom an escalation email is sent if a ticket in this group is unassigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Member names or IDs',
				name: 'members',
				type: 'multiOptions',
				default: [],
				description:
					'Comma-separated IDs of agents who are members of this group. Choose from the list or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getAgents',
				},
			},
			{
				displayName: 'Observer names or IDs',
				name: 'observers',
				type: 'multiOptions',
				default: [],
				description:
					'Comma-separated agent IDs who are observers of this group. Choose from the list or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getAgents',
				},
			},
			{
				displayName: 'Unassigned for',
				name: 'unassigned_for',
				description:
					'Time after which an escalation email is sent if a ticket in the group remains unassigned',
				type: 'options',
				default: '30m',
				options: [
					{
						name: '1 day',
						value: '1d',
					},
					{
						name: '1 hour',
						value: '1h',
					},
					{
						name: '12 hours',
						value: '12h',
					},
					{
						name: '2 days',
						value: '2d',
					},
					{
						name: '2 hours',
						value: '2h',
					},
					{
						name: '3 days',
						value: '3d',
					},
					{
						name: '30 minutes',
						value: '30m',
					},
					{
						name: '8 hours',
						value: '8h',
					},
				],
			},
		],
	},

	// ----------------------------------------
	//            agentGroup: delete
	// ----------------------------------------
	{
		displayName: 'Agent group ID',
		name: 'agentGroupId',
		description: 'ID of the agent group to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['agentGroup'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//             agentGroup: get
	// ----------------------------------------
	{
		displayName: 'Agent group ID',
		name: 'agentGroupId',
		description: 'ID of the agent group to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['agentGroup'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//            agentGroup: getAll
	// ----------------------------------------
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['agentGroup'],
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
				resource: ['agentGroup'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},

	// ----------------------------------------
	//            agentGroup: update
	// ----------------------------------------
	{
		displayName: 'Agent group ID',
		name: 'agentGroupId',
		description: 'ID of the agent group to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['agentGroup'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['agentGroup'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Escalate to agent name or ID',
				name: 'escalate_to',
				type: 'options',
				default: '',
				description:
					'ID of the agent to whom an escalation email is sent if a ticket in this group is unassigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getAgents',
				},
			},
			{
				displayName: 'Member names or IDs',
				name: 'members',
				type: 'multiOptions',
				default: [],
				description:
					'Comma-separated IDs of agents who are members of this group. Choose from the list or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getAgents',
				},
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Observer names or IDs',
				name: 'observers',
				type: 'multiOptions',
				default: [],
				description:
					'Comma-separated agent user IDs who are observers of this group. Choose from the list or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getAgents',
				},
			},
			{
				displayName: 'Unassigned for',
				name: 'unassigned_for',
				description:
					'Time after which an escalation email is sent if a ticket in the group remains unassigned',
				type: 'options',
				default: '30m',
				options: [
					{
						name: '1 day',
						value: '1d',
					},
					{
						name: '1 hour',
						value: '1h',
					},
					{
						name: '12 hours',
						value: '12h',
					},
					{
						name: '2 days',
						value: '2d',
					},
					{
						name: '2 hours',
						value: '2h',
					},
					{
						name: '3 days',
						value: '3d',
					},
					{
						name: '30 minutes',
						value: '30m',
					},
					{
						name: '8 hours',
						value: '8h',
					},
				],
			},
		],
	},
];
