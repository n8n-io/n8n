import type { INodeProperties } from 'n8n-workflow';

export const taskOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['task'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a task',
				action: 'Create a task',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a task',
				action: 'Delete a task',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a task',
				action: 'Get a task',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many tasks',
				action: 'Get many tasks',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a task',
				action: 'Update a task',
			},
		],
		default: 'create',
	},
];

export const taskFields: INodeProperties[] = [
	// ----------------------------------------
	//               task: create
	// ----------------------------------------
	{
		displayName: 'Title',
		name: 'title',
		description: 'Title of the task',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Due Date',
		name: 'dueDate',
		description: 'Timestamp that denotes when the task is due to be completed',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Owner Name or ID',
		name: 'ownerId',
		description:
			'ID of the user to whom the task is assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Target Type',
		name: 'targetableType',
		description: 'Type of the entity for which the task is updated',
		type: 'options',
		required: true,
		default: 'Contact',
		options: [
			{
				name: 'Contact',
				value: 'Contact',
			},
			{
				name: 'Deal',
				value: 'Deal',
			},
			{
				name: 'SalesAccount',
				value: 'SalesAccount',
			},
		],
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Target ID',
		name: 'targetable_id',
		description:
			'ID of the entity for which the task is created. The type of entity is selected in "Target Type".',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['task'],
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
				resource: ['task'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Creator Name or ID',
				name: 'creater_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				description:
					'ID of the user who created the task. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Outcome Name or ID',
				name: 'outcome_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getOutcomes',
				},
				description:
					'ID of the outcome of the task. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Task Type ID',
				name: 'task_type_id',
				type: 'string', // not obtainable from API
				default: '',
				description: 'ID of the type of task',
			},
		],
	},

	// ----------------------------------------
	//               task: delete
	// ----------------------------------------
	{
		displayName: 'Task ID',
		name: 'taskId',
		description: 'ID of the task to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//                task: get
	// ----------------------------------------
	{
		displayName: 'Task ID',
		name: 'taskId',
		description: 'ID of the task to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//               task: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['task'],
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
				resource: ['task'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		default: {},
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Include',
				name: 'include',
				type: 'options',
				default: 'owner',
				options: [
					{
						name: 'Owner',
						value: 'owner',
					},
					{
						name: 'Target',
						value: 'targetable',
					},
					{
						name: 'Users',
						value: 'users',
					},
				],
			},
			{
				displayName: 'Status',
				name: 'filter',
				type: 'options',
				default: 'open',
				options: [
					{
						name: 'Completed',
						value: 'completed',
					},
					{
						name: 'Due Today',
						value: 'due_today',
					},
					{
						name: 'Due Tomorrow',
						value: 'due_tomorrow',
					},
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'Overdue',
						value: 'overdue',
					},
				],
			},
		],
	},

	// ----------------------------------------
	//               task: update
	// ----------------------------------------
	{
		displayName: 'Task ID',
		name: 'taskId',
		description: 'ID of the task to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
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
				resource: ['task'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Creator Name or ID',
				name: 'creater_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				description:
					'ID of the user who created the sales activity. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				description: 'Timestamp that denotes when the task is due to be completed',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Outcome Name or ID',
				name: 'outcome_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getOutcomes',
				},
				description:
					'ID of the outcome of the task. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Owner Name or ID',
				name: 'owner_id',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				description:
					'ID of the user to whom the task is assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Target ID',
				name: 'targetable_id',
				type: 'string',
				default: '',
				description:
					'ID of the entity for which the task is updated. The type of entity is selected in "Target Type".',
			},
			{
				displayName: 'Target Type',
				name: 'targetable_type',
				description: 'Type of the entity for which the task is updated',
				type: 'options',
				default: 'Contact',
				options: [
					{
						name: 'Contact',
						value: 'Contact',
					},
					{
						name: 'Deal',
						value: 'Deal',
					},
					{
						name: 'SalesAccount',
						value: 'SalesAccount',
					},
				],
			},
			{
				displayName: 'Task Type ID',
				name: 'task_type_id',
				type: 'string', // not obtainable from API
				default: '',
				description: 'ID of the type of task',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title of the task',
			},
		],
	},
];
