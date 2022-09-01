import { INodeProperties } from 'n8n-workflow';

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
	// ----------------------------------------
	//               task: create
	// ----------------------------------------
	{
		displayName: 'Project Name or ID',
		name: 'projectId',
		description:
			'ID of the project to which the task belongs. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
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
		displayName: 'Subject',
		name: 'subject',
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
				displayName: 'Asignee Name or ID',
				name: 'assigned_to',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description:
					'ID of the user to whom the task is assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Blocked Note',
				name: 'blocked_note',
				type: 'string',
				default: '',
				description: 'Reason why the task is blocked. Requires "Is Blocked" toggle to be enabled.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Is Blocked',
				name: 'is_blocked',
				type: 'boolean',
				default: false,
				description: 'Whether the task is blocked',
			},
			{
				displayName: 'Milestone (Sprint) Name or ID',
				name: 'milestone',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getMilestones',
				},
				default: '',
				description:
					'ID of the milestone of the task. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Status Name or ID',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getTaskStatuses',
				},
				default: '',
				description:
					'ID of the status of the task. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getTags',
				},
				default: [],
			},
			{
				displayName: 'Taskboard Order',
				name: 'taskboard_order',
				type: 'number',
				default: 1,
				description: 'Order of the task in the taskboard',
				typeOptions: {
					minValue: 1,
				},
			},
			{
				displayName: 'User Story Name or ID',
				name: 'user_story',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getUserStories',
				},
				default: '',
				description:
					'ID of the user story of the task. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'User Story Order',
				name: 'us_order',
				type: 'number',
				default: 1,
				description: 'Order of the task in the user story',
				typeOptions: {
					minValue: 1,
				},
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
		displayName: 'Project Name or ID',
		name: 'projectId',
		description:
			'ID of the project to which the task belongs. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['getAll'],
			},
		},
	},
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
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['getAll'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Asignee Name or ID',
				name: 'assigned_to',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description:
					'ID of the user whom the task is assigned to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Is Closed',
				name: 'statusIsClosed',
				description: 'Whether the task is closed',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Milestone (Sprint) Name or ID',
				name: 'milestone',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getMilestones',
				},
				default: '',
				description:
					'ID of the milestone of the task. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Owner Name or ID',
				name: 'owner',
				description:
					'ID of the owner of the task. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getUsers',
				},
				default: '',
			},
			{
				displayName: 'Role Name or ID',
				name: 'role',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getRoles',
				},
				default: '',
			},
			{
				displayName: 'Status Name or ID',
				name: 'status',
				description:
					'ID of the status of the task. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getTaskStatuses',
				},
				default: '',
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getTags',
				},
				default: [],
			},
			{
				displayName: 'User Story Name or ID',
				name: 'userStory',
				description:
					'ID of the user story to which the task belongs. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getUserStories',
				},
				default: '',
			},
		],
	},

	// ----------------------------------------
	//               task: update
	// ----------------------------------------
	{
		displayName: 'Project Name or ID',
		name: 'projectId',
		description:
			'ID of the project to set the task to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['update'],
			},
		},
	},
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
				displayName: 'Asignee Name or ID',
				name: 'assigned_to',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getTypes',
				},
				default: '',
				description:
					'ID of the user to assign the task to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Blocked Note',
				name: 'blocked_note',
				type: 'string',
				default: '',
				description: 'Reason why the task is blocked. Requires "Is Blocked" toggle to be enabled.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Is Blocked',
				name: 'is_blocked',
				type: 'boolean',
				default: false,
				description: 'Whether the task is blocked',
			},
			{
				displayName: 'Milestone (Sprint) Name or ID',
				name: 'milestone',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getMilestones',
				},
				default: '',
				description:
					'ID of the milestone of the task. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Status Name or ID',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getTaskStatuses',
				},
				default: '',
				description:
					'ID of the status of the task. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
			},
			{
				displayName: 'User Story Name or ID',
				name: 'user_story',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getUserStories',
				},
				default: '',
				description:
					'ID of the user story of the task. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'User Story Order',
				name: 'us_order',
				type: 'number',
				default: 1,
				typeOptions: {
					minValue: 1,
				},
				description: 'Order of the task in the user story',
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getTags',
				},
				default: [],
			},
			{
				displayName: 'Taskboard Order',
				name: 'taskboard_order',
				type: 'number',
				default: 1,
				typeOptions: {
					minValue: 1,
				},
				description: 'Order of the task in the taskboard',
			},
		],
	},
];
