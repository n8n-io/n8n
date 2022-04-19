import {
	INodeProperties,
} from 'n8n-workflow';

export const taskOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a task',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a task',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all tasks',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a task',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const taskFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                 task:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Group ID',
		name: 'groupId',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getGroups',
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
		description: 'Group ID',
	},
	{
		displayName: 'Plan ID',
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
		description: 'The ID of the Plan.',
	},
	{
		displayName: 'Bucket ID',
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
		description: 'The ID of the Bucket.',
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
		description: 'Title of the task.',
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
				displayName: 'Assigned To',
				name: 'assignedTo',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getMembers',
					loadOptionsDependsOn: [
						'groupId',
					],
				},
				default: '',
				description: `Date and time at which the task is due. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time.`,
			},
			{
				displayName: 'Due Date Time',
				name: 'dueDateTime',
				type: 'dateTime',
				default: '',
				description: `Date and time at which the task is due. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time.`,
			},
			{
				displayName: 'Labels',
				name: 'labels',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
					loadOptionsDependsOn: [
						'planId',
					],
				},
				default: [],
				description: `Percentage of task completion. When set to 100, the task is considered completed.`,
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
				description: `Percentage of task completion. When set to 100, the task is considered completed.`,
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
		description: 'Task ID',
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
		description: 'Task ID',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 task:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Group ID',
		name: 'groupId',
		required: true,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getGroups',
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
		description: 'Group ID',
	},
	{
		displayName: 'Member ID',
		name: 'memberId',
		required: false,
		type: 'options',
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
			},
		},
		default: '',
		description: 'Member ID',
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
		description: 'The ID of the Task.',
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
				displayName: 'Assigned To',
				name: 'assignedTo',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getMembers',
					loadOptionsDependsOn: [
						'groupId',
					],
				},
				default: '',
				description: `Date and time at which the task is due. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time.`,
			},
			{
				displayName: 'Bucket ID',
				name: 'bucketId',
				type: 'string',
				default: '',
				description: 'Channel name as it will appear to the user in Microsoft Teams.',
			},
			{
				displayName: 'Due Date Time',
				name: 'dueDateTime',
				type: 'dateTime',
				default: '',
				description: `Date and time at which the task is due. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time.`,
			},
			{
				displayName: 'Group ID',
				name: 'groupId',
				type: 'string',
				default: '',
				description: 'Group ID',
			},
			{
				displayName: 'Labels',
				name: 'labels',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
					loadOptionsDependsOn: [
						'planId',
					],
				},
				default: [],
				description: `Percentage of task completion. When set to 100, the task is considered completed.`,
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
				description: `Percentage of task completion. When set to 100, the task is considered completed.`,
			},
			{
				displayName: 'Plan ID',
				name: 'planId',
				type: 'string',
				default: '',
				description: 'Channel name as it will appear to the user in Microsoft Teams.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title of the task.',
			},
		],
	},
];
