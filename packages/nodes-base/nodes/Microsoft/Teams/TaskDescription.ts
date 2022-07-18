import {
	INodeProperties,
} from 'n8n-workflow';

export const taskOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'task',
				],
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
				description: 'Get a task',
				action: 'Get a task',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all tasks',
				action: 'Get all tasks',
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
	{
		displayName: 'Group Source',
		name: 'groupSource',
		required: true,
		type: 'options',
		default: 'all',
		displayOptions: {
			show: {
				operation: [
					'getAll',
					'create',
					'update',
				],
				resource: [
					'task',
				],
			},
		},
		options: [
			{
				name: 'All Groups',
				value: 'all',
				description: 'From all groups',
			},
			{
				name: 'My Groups',
				value: 'mine',
				description: 'Only load groups that account is member of',
			},
		],
	},


	/* -------------------------------------------------------------------------- */
	/*                                 task:create                                */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Group Name or ID',
		name: 'groupId',
		required: true,
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getGroups',
			loadOptionsDependsOn: [
				'groupSource',
			],
		},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'task',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Plan Name or ID',
		name: 'planId',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getPlans',
			loadOptionsDependsOn: [
				'groupId',
			],
		},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'task',
				],
			},
		},
		default: '',
		description: 'The plan for the task to belong to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Bucket Name or ID',
		name: 'bucketId',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBuckets',
			loadOptionsDependsOn: [
				'planId',
			],
		},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'task',
				],
			},
		},
		default: '',
		description: 'The bucket for the task to belong to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Title',
		name: 'title',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'task',
				],
			},
		},
		default: '',
		description: 'Title of the task',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'task',
				],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Assigned To Name or ID',
				name: 'assignedTo',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getMembers',
					loadOptionsDependsOn: [
						'groupId',
					],
				},
				default: '',
				description: 'Who the task should be assigned to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Due Date Time',
				name: 'dueDateTime',
				type: 'dateTime',
				default: '',
				description: 'Date and time at which the task is due. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time.',
			},
			{
				displayName: 'Label Names or IDs',
				name: 'labels',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
					loadOptionsDependsOn: [
						'planId',
					],
				},
				default: [],
				description: 'Labels to assign to the task. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Percent Complete',
				name: 'percentComplete',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 100,
				},
				default: 0,
				description: 'Percentage of task completion. When set to 100, the task is considered completed.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 task:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'taskId',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'task',
				],
			},
		},
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 task:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'taskId',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'task',
				],
			},
		},
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 task:getAll                                */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Tasks For',
		name: 'tasksFor',
		default: 'member',
		required: true,
		type: 'options',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'task',
				],
			},
		},
		options: [
			{
				name: 'Group Member',
				value: 'member',
				description: 'Tasks assigned to group member',
			},
			{
				name: 'Plan',
				value: 'plan',
				description: 'Tasks in group plan',
			},
		],
	},
	{
		displayName: 'Group Name or ID',
		name: 'groupId',
		required: true,
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getGroups',
			loadOptionsDependsOn: [
				'groupSource',
			],
		},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'task',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Member Name or ID',
		name: 'memberId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getMembers',
			loadOptionsDependsOn: [
				'groupId',
			],
		},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'task',
				],
				tasksFor: [
					'member',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Plan Name or ID',
		name: 'planId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getPlans',
			loadOptionsDependsOn: [
				'groupId',
			],
		},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'task',
				],
				tasksFor: [
					'plan',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'task',
				],
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
				operation: [
					'getAll',
				],
				resource: [
					'task',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 50,
		description: 'Max number of results to return',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 task:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'taskId',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'task',
				],
			},
		},
		default: '',
		description: 'The ID of the Task',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'task',
				],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Assigned To Name or ID',
				name: 'assignedTo',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getMembers',
					loadOptionsDependsOn: [
						'groupId',
					],
				},
				default: '',
				description: 'Who the task should be assigned to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Bucket Name or ID',
				name: 'bucketId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getBuckets',
					loadOptionsDependsOn: [
						'updateFields.planId',
					],
				},
				default: '',
				description: 'The bucket for the task to belong to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Due Date Time',
				name: 'dueDateTime',
				type: 'dateTime',
				default: '',
				description: 'Date and time at which the task is due. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time.',
			},
			{
				displayName: 'Group Name or ID',
				name: 'groupId',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getGroups',
					loadOptionsDependsOn: [
						'groupSource',
					],
				},
				default: '',
			},
			{
				displayName: 'Label Names or IDs',
				name: 'labels',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
					loadOptionsDependsOn: [
						'updateFields.planId',
					],
				},
				default: [],
				description: 'Labels to assign to the task. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Percent Complete',
				name: 'percentComplete',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 100,
				},
				default: 0,
				description: 'Percentage of task completion. When set to 100, the task is considered completed.',
			},
			{
				displayName: 'Plan Name or ID',
				name: 'planId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPlans',
					loadOptionsDependsOn: [
						'groupId',
					],
				},
				default: '',
				description: 'The plan for the task to belong to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
