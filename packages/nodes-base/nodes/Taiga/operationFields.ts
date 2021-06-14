import {
	INodeProperties,
} from 'n8n-workflow';

// User Story Update Fields
// Issue Update Fields
// Task Update Fields

export const operationFields = [
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getUserProjects',
		},
		displayOptions: {
			show: {
				resource: [
					'userstory',
					'issue',
					'task',
				],
				operation: [
					'create',
					'getAll',
					'update',
				],
			},
		},
		default: '',
		description: 'The project ID.',
		required: true,
	},
	{
		displayName: 'User story ID',
		name: 'user_story',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		required: false,
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'userstory',
					'issue',
					'task',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		required: true,
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
					'issue',
					'userstory',
					'task',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Assigned To',
				name: 'assigned_to',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectId',
					],
					loadOptionsMethod: 'getProjectUsers',
				},
				default: '',
				description: 'User id to you want assign the issue to',
			},
			{
				displayName: 'Blocked Note',
				name: 'blocked_note',
				type: 'string',
				default: '',
				description: 'Reason why the issue is blocked',
			},
			{
				displayName: 'Due Date',
				name: 'due_date',
				type: 'string',
				default: '',
				description: 'Add a due date',
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
			},
			{
				displayName: 'Is Closed',
				name: 'is_closed',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Milestone ID',
				name: 'milestone',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectSlug',
					],
					loadOptionsMethod: 'getProjectMilestones',
				},
				default: '',
			},
			{
				displayName: 'Priority ID',
				name: 'priority',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectSlug',
					],
					loadOptionsMethod: 'getProjectPriorities',
				},
				default: '',
			},
			{
				displayName: 'Severity ID',
				name: 'severity',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectSlug',
					],
					loadOptionsMethod: 'getProjectSeverities',
				},
				default: '',
			},
			{
				displayName: 'Status ID',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getStatuses',
				},
				default: '',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				description: 'Tags separated by comma.',
				default: '',
				placeholder: 'product, sales',
			},
			{
				displayName: 'Type ID',
				name: 'type',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectSlug',
					],
					loadOptionsMethod: 'getTypes',
				},
				default: '',
			},
		],
	},
	{
		displayName: 'Item ID',
		name: 'itemId',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'issue',
					'userstory',
					'task',
				],
				operation: [
					'update',
					'delete',
					'get',
				],
			},
		},
		default: '',
		required: true,
	},
	{// Issue Update Fields
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'issue',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Assigned To',
				name: 'assigned_to',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectId',
					],
					loadOptionsMethod: 'getProjectUsers',
				},
				default: '',
				description: 'User id to you want assign the issue to',
			},
			{
				displayName: 'Blocked Note',
				name: 'blocked_note',
				type: 'string',
				default: '',
				description: 'Reason why the issue is blocked',
			},
			{
				displayName: 'Due Date',
				name: 'due_date',
				type: 'string',
				default: '',
				description: 'Add a due date',
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
			},
			{
				displayName: 'Is Closed',
				name: 'is_closed',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Milestone ID',
				name: 'milestone',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectSlug',
					],
					loadOptionsMethod: 'getProjectMilestones',
				},
				default: '',
			},
			{
				displayName: 'Priority ID',
				name: 'priority',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectSlug',
					],
					loadOptionsMethod: 'getProjectPriorities',
				},
				default: '',
			},
			{
				displayName: 'Severity ID',
				name: 'severity',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectSlug',
					],
					loadOptionsMethod: 'getProjectSeverities',
				},
				default: '',
			},
			{
				displayName: 'Issue Status ID',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getIssueStatuses',
				},
				default: '',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Swimlane',
				name: 'swimlane',
				type: 'number',
				default: '',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				description: 'Tags separated by comma.',
				default: '',
				placeholder: 'product, sales',
			},
			{
				displayName: 'Type ID',
				name: 'type',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectSlug',
					],
					loadOptionsMethod: 'getTypes',
				},
				default: '',
			},
		],
	},
	{ // User Story Update Fields
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'userstory',
					'task',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Assigned To',
				name: 'assigned_to',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectId',
					],
					loadOptionsMethod: 'getProjectUsers',
				},
				default: '',
				description: 'User id to you want assign the user story to',
			},
			{
				displayName: 'Blocked Note',
				name: 'blocked_note',
				type: 'string',
				default: '',
				description: 'Reason why the user story is blocked',
			},
			{
				displayName: 'Due Date',
				name: 'due_date',
				type: 'string',
				default: '',
				description: 'Add a due date',
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
			},
			{
				displayName: 'Is Closed',
				name: 'is_closed',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Milestone ID',
				name: 'milestone',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectSlug',
					],
					loadOptionsMethod: 'getProjectMilestones',
				},
				default: '',
			},
			{
				displayName: 'Priority ID',
				name: 'priority',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectSlug',
					],
					loadOptionsMethod: 'getProjectPriorities',
				},
				default: '',
			},
			{
				displayName: 'Severity ID',
				name: 'severity',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectSlug',
					],
					loadOptionsMethod: 'getProjectSeverities',
				},
				default: '',
			},
			{
				displayName: 'Status ID',
				name: 'status',
				type: 'options',
				description: 'Select the status you want the user story to be changed to.',
				typeOptions: {
					loadOptionsMethod: 'getUserstoryStatuses',
				},
				default: '',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Swimlane',
				name: 'swimlane',
				type: 'number',
				default: '',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				description: 'Tags separated by comma.',
				default: '',
				placeholder: 'product, sales',
			},
			{
				displayName: 'Type ID',
				name: 'type',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectSlug',
					],
					loadOptionsMethod: 'getTypes',
				},
				default: '',
			},
		],
	},
	{// Task Update Fields
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Assigned To',
				name: 'assigned_to',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectId',
					],
					loadOptionsMethod: 'getProjectUsers',
				},
				default: '',
				description: 'User id to you want assign the task to',
			},
			{
				displayName: 'Blocked Note',
				name: 'blocked_note',
				type: 'string',
				default: '',
				description: 'Reason why the task is blocked',
			},
			{
				displayName: 'Due Date',
				name: 'due_date',
				type: 'string',
				default: '',
				description: 'Add a due date',
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
			},
			{
				displayName: 'Is Closed',
				name: 'is_closed',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Milestone ID',
				name: 'milestone',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectSlug',
					],
					loadOptionsMethod: 'getProjectMilestones',
				},
				default: '',
			},
			{
				displayName: 'Priority ID',
				name: 'priority',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectSlug',
					],
					loadOptionsMethod: 'getProjectPriorities',
				},
				default: '',
			},
			{
				displayName: 'Severity ID',
				name: 'severity',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectSlug',
					],
					loadOptionsMethod: 'getProjectSeverities',
				},
				default: '',
			},
			{
				displayName: 'Task Status ID',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTaskStatuses',
				},
				default: '',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Swimlane',
				name: 'swimlane',
				type: 'number',
				default: '',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				description: 'Tags separated by comma.',
				default: '',
				placeholder: 'product, sales',
			},
			{
				displayName: 'Type ID',
				name: 'type',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectSlug',
					],
					loadOptionsMethod: 'getTypes',
				},
				default: '',
			},
		],
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
					'issue',
					'userstory',
					'task',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
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
					'issue',
					'userstory',
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
		default: 100,
		description: 'How many results to return.',
	},

] as INodeProperties[];
