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
				action: 'Create a task',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a task',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a task',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many tasks',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a task',
			},
		],
		default: 'get',
	},
];

export const taskFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 task:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'List Name or ID',
		name: 'taskListId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTaskLists',
		},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['task'],
			},
		},
		required: true,
		default: '',
		description:
			'The identifier of the list, unique in the user\'s mailbox. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Subject',
		name: 'title',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['task'],
			},
		},
		required: true,
		default: '',
		description: 'A brief description of the task',
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
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				description: 'The content of the task',
			},
			{
				displayName: 'Due',
				name: 'dueDateTime',
				type: 'dateTime',
				default: '',
				description: 'The date in the specified time zone that the task is to be finished',
			},
			{
				displayName: 'Reminder',
				name: 'reminderDateTime',
				type: 'dateTime',
				default: '',
				description: 'The date in the specified time zone that the task is to be reminded',
			},
			{
				displayName: 'Importance',
				name: 'importance',
				type: 'options',
				options: [
					{
						name: 'Low',
						value: 'low',
					},
					{
						name: 'Normal',
						value: 'normal',
					},
					{
						name: 'High',
						value: 'high',
					},
				],
				default: 'normal',
				description: 'The importance of the task',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
				options: [
					{
						name: 'Not Started',
						value: 'notStarted',
					},
					{
						name: 'In Progress',
						value: 'inProgress',
					},
					{
						name: 'Completed',
						value: 'completed',
					},
					{
						name: 'Waiting On Others',
						value: 'waitingOnOthers',
					},
					{
						name: 'Deferred',
						value: 'deferred',
					},
				],
				default: 'notStarted',
				description: 'Indicates the state or progress of the task',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 task:get/delete/update/getAll              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'List Name or ID',
		name: 'taskListId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTaskLists',
		},
		displayOptions: {
			show: {
				operation: ['delete', 'get', 'getAll', 'update'],
				resource: ['task'],
			},
		},
		required: true,
		default: '',
		description:
			'The identifier of the list, unique in the user\'s mailbox. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['delete', 'get', 'update'],
				resource: ['task'],
			},
		},
		required: true,
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 task:getAll                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['task'],
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
				resource: ['task'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 task:update                                */
	/* -------------------------------------------------------------------------- */
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
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				description: 'The content of the task',
			},
			{
				displayName: 'Due Date Time',
				name: 'dueDateTime',
				type: 'dateTime',
				default: '',
				description: 'The date in the specified time zone that the task is to be finished',
			},
			{
				displayName: 'Reminder',
				name: 'reminderDateTime',
				type: 'dateTime',
				default: '',
				description: 'The date in the specified time zone that the task is to be reminded',
			},
			{
				displayName: 'Importance',
				name: 'importance',
				type: 'options',
				options: [
					{
						name: 'Low',
						value: 'low',
					},
					{
						name: 'Normal',
						value: 'normal',
					},
					{
						name: 'High',
						value: 'high',
					},
				],
				default: 'normal',
				description: 'The importance of the task',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
				options: [
					{
						name: 'Not Started',
						value: 'notStarted',
					},
					{
						name: 'In Progress',
						value: 'inProgress',
					},
					{
						name: 'Completed',
						value: 'completed',
					},
					{
						name: 'Waiting On Others',
						value: 'waitingOnOthers',
					},
					{
						name: 'Deferred',
						value: 'deferred',
					},
				],
				default: 'notStarted',
				description: 'Indicates the state or progress of the task',
			},
			{
				displayName: 'Subject',
				name: 'title',
				type: 'string',
				default: '',
				description: 'A brief description of the task',
			},
		],
	},
];
