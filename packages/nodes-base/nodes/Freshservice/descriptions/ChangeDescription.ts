import type { INodeProperties } from 'n8n-workflow';

export const changeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['change'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a change',
				action: 'Create a change',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a change',
				action: 'Delete a change',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a change',
				action: 'Get a change',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Retrieve many changes',
				action: 'Get many changes',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a change',
				action: 'Update a change',
			},
		],
		default: 'create',
	},
];

export const changeFields: INodeProperties[] = [
	// ----------------------------------------
	//              change: create
	// ----------------------------------------
	{
		displayName: 'Requester name or ID',
		name: 'requesterId',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'ID of the requester of the change. Choose from the list or specify an ID. You can also specify the ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getRequesters',
		},
		displayOptions: {
			show: {
				resource: ['change'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['change'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Planned start date',
		name: 'plannedStartDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['change'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Planned end date',
		name: 'plannedEndDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['change'],
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
				resource: ['change'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Agent name or ID',
				name: 'agent_id',
				type: 'options',
				default: '',
				description:
					'ID of the agent to whom the change is assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getAgents',
				},
			},
			{
				displayName: 'Change type',
				name: 'change_type',
				type: 'options',
				default: 1,
				options: [
					{
						name: 'Minor',
						value: 1,
					},
					{
						name: 'Standard',
						value: 2,
					},
					{
						name: 'Major',
						value: 3,
					},
					{
						name: 'Emergency',
						value: 4,
					},
				],
			},
			{
				displayName: 'Department name or ID',
				name: 'department_id',
				type: 'options',
				default: '',
				description:
					'ID of the department requesting the change. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
				displayName: 'Group name or ID',
				name: 'group_id',
				type: 'options',
				default: '',
				description:
					'ID of the agent group to which the change is assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
				displayName: 'Risk',
				name: 'risk',
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
						name: 'Very high',
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
						name: 'Planning',
						value: 2,
					},
					{
						name: 'Approval',
						value: 3,
					},
					{
						name: 'Pending release',
						value: 4,
					},
					{
						name: 'Pending review',
						value: 5,
					},
					{
						name: 'Closed',
						value: 6,
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

	// ----------------------------------------
	//              change: delete
	// ----------------------------------------
	{
		displayName: 'Change ID',
		name: 'changeId',
		description: 'ID of the change to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['change'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//               change: get
	// ----------------------------------------
	{
		displayName: 'Change ID',
		name: 'changeId',
		description: 'ID of the change to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['change'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//              change: getAll
	// ----------------------------------------
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['change'],
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
				resource: ['change'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['change'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Predefined filters',
				name: 'filter',
				type: 'options',
				default: 'my_open',
				options: [
					{
						name: 'Closed',
						value: 'closed',
					},
					{
						name: 'My open',
						value: 'my_open',
					},
					{
						name: 'Release requested',
						value: 'release_requested',
					},
					{
						name: 'Requester ID',
						value: 'requester_id',
					},
					{
						name: 'Unassigned',
						value: 'unassigned',
					},
				],
			},
			{
				displayName: 'Sort order',
				name: 'sort_by',
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
				displayName: 'Updated since',
				name: 'updated_since',
				type: 'dateTime',
				default: '',
			},
		],
	},

	// ----------------------------------------
	//              change: update
	// ----------------------------------------
	{
		displayName: 'Change ID',
		name: 'changeId',
		description: 'ID of the change to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['change'],
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
				resource: ['change'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Agent name or ID',
				name: 'agent_id',
				type: 'options',
				default: '',
				description:
					'ID of the agent to whom the change is assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getAgents',
				},
			},
			{
				displayName: 'Change type',
				name: 'change_type',
				type: 'options',
				default: 1,
				options: [
					{
						name: 'Minor',
						value: 1,
					},
					{
						name: 'Standard',
						value: 2,
					},
					{
						name: 'Major',
						value: 3,
					},
					{
						name: 'Emergency',
						value: 4,
					},
				],
			},
			{
				displayName: 'Department name or ID',
				name: 'department_id',
				type: 'options',
				default: '',
				description:
					'ID of the department requesting the change. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
				displayName: 'Group name or ID',
				name: 'group_id',
				type: 'options',
				default: '',
				description:
					'ID of the agent group to which the change is assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getAgentGroups',
				},
			},
			{
				displayName: 'Impact',
				name: 'impact',
				type: 'options',
				default: 1,
				description: 'Impact of the change',
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
				displayName: 'Requester name or ID',
				name: 'requester_id',
				type: 'options',
				default: '',
				description:
					'ID of the requester of the change. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getRequesters',
				},
			},
			{
				displayName: 'Risk',
				name: 'risk',
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
						name: 'Very high',
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
						name: 'Planning',
						value: 2,
					},
					{
						name: 'Approval',
						value: 3,
					},
					{
						name: 'Pending release',
						value: 4,
					},
					{
						name: 'Pending review',
						value: 5,
					},
					{
						name: 'Closed',
						value: 6,
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
