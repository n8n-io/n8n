import type { INodeProperties } from 'n8n-workflow';

export const taskOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a manual task/opportunity',
				action: 'Create a task',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many pending tasks',
				action: 'Get many tasks',
			},
			{
				name: 'Ignore',
				value: 'ignore',
				description: 'Mark tasks as ignored',
				action: 'Ignore tasks',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing task',
				action: 'Update a task',
			},
		],
		displayOptions: {
			show: {
				resource: ['task'],
			},
		},
	},
];

export const taskFields: INodeProperties[] = [
	// ----------------------------------
	//        task: create
	// ----------------------------------
	{
		displayName: 'Task Type',
		name: 'taskType',
		type: 'options',
		required: true,
		default: 'manual',
		options: [
			{
				name: 'Manual',
				value: 'manual',
			},
			{
				name: 'Opportunity',
				value: 'opportunity',
			},
		],
		description: 'Type of task to create',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Contact ID or Lead ID',
		name: 'entityId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the contact or lead to associate the task with',
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
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title of the task',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				default: '',
				description: 'Description of the task',
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
				description: 'Due date for the task',
			},
			{
				displayName: 'Assignee Email',
				name: 'assigneeEmail',
				type: 'string',
				default: '',
				placeholder: 'name@email.com',
				description: 'Email of the team member to assign the task to',
			},
		],
	},

	// ----------------------------------
	//        task: getAll
	// ----------------------------------
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
			maxValue: 1000,
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
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Assignee Email',
				name: 'assigneeEmail',
				type: 'string',
				default: '',
				placeholder: 'name@email.com',
				description: 'Filter tasks by assignee',
			},
			{
				displayName: 'Task Type',
				name: 'taskType',
				type: 'options',
				default: '',
				options: [
					{
						name: 'All',
						value: '',
					},
					{
						name: 'Manual',
						value: 'manual',
					},
					{
						name: 'Opportunity',
						value: 'opportunity',
					},
				],
				description: 'Filter by task type',
			},
		],
	},

	// ----------------------------------
	//        task: update
	// ----------------------------------
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the task to update',
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
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'New title for the task',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				default: '',
				description: 'New description for the task',
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
				description: 'New due date for the task',
			},
			{
				displayName: 'Assignee Email',
				name: 'assigneeEmail',
				type: 'string',
				default: '',
				placeholder: 'name@email.com',
				description: 'Email of team member to reassign the task to',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'pending',
				options: [
					{
						name: 'Pending',
						value: 'pending',
					},
					{
						name: 'Done',
						value: 'done',
					},
				],
				description: 'New status for the task',
			},
		],
	},

	// ----------------------------------
	//        task: ignore
	// ----------------------------------
	{
		displayName: 'Task IDs',
		name: 'taskIds',
		type: 'string',
		required: true,
		default: '',
		description: 'Comma-separated list of task IDs to ignore',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['ignore'],
			},
		},
	},
];
