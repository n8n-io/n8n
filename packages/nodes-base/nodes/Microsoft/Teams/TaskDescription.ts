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
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many tasks',
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
	{
		displayName: 'Group Source',
		name: 'groupSource',
		required: true,
		type: 'options',
		default: 'all',
		displayOptions: {
			show: {
				operation: ['getAll', 'create', 'update'],
				resource: ['task'],
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
		displayName: 'Group',
		name: 'groupId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'Group',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Group...',
				typeOptions: {
					searchListMethod: 'getGroups',
					// missing searchListDependsOn: ['groupSource'],
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: '12f0ca7d-b77f-4c4e-93d2-5cbdb4f464c6',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})[ \t]*',
							errorMessage: 'Not a valid Microsoft Teams Team ID',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})',
				},
			},
		],
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['task'],
			},
		},
	},
	{
		displayName: 'Plan',
		name: 'planId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'Plan',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Plan...',
				typeOptions: {
					searchListMethod: 'getPlans',
					// missing searchListDependsOn: ['groupId'],
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'rl1HYb0cUEiHPc7zgB_KWWUAA7Of',
				// validation missing because no documentation found how these unique ids look like.
			},
		],
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['task'],
			},
		},
		description: 'The plan for the task to belong to',
	},
	{
		displayName: 'Bucket Name',
		name: 'bucketId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'Bucket',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Bucket...',
				typeOptions: {
					searchListMethod: 'getBuckets',
					// missing searchListDependsOn: ['planId'],
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'rl1HYb0cUEiHPc7zgB_KWWUAA7Of',
				// validation missing because no documentation found how these unique ids look like.
			},
		],
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['task'],
			},
		},
		description: 'The bucket for the task to belong to',
	},
	{
		displayName: 'Title',
		name: 'title',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['task'],
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
				operation: ['create'],
				resource: ['task'],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Assigned To Name',
				name: 'assignedTo',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				modes: [
					{
						displayName: 'Member',
						name: 'list',
						type: 'list',
						placeholder: 'Select a Member...',
						typeOptions: {
							searchListMethod: 'getMembers',
							// missing searchListDependsOn: ['groupId'],
							searchable: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						placeholder: '7e2f1174-e8ee-4859-b8b1-a8d1cc63d276',
						validation: [
							{
								type: 'regex',
								properties: {
									regex:
										'^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})[ \t]*',
									errorMessage: 'Not a valid Microsoft Teams Team ID',
								},
							},
						],
						extractValue: {
							type: 'regex',
							regex: '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})',
						},
					},
				],
				description: 'Who the task should be assigned to',
			},
			{
				displayName: 'Due Date Time',
				name: 'dueDateTime',
				type: 'dateTime',
				default: '',
				description:
					'Date and time at which the task is due. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time.',
			},
			{
				displayName: 'Label Names or IDs',
				name: 'labels',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
					loadOptionsDependsOn: ['planId'],
				},
				default: [],
				description:
					'Labels to assign to the task. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				description:
					'Percentage of task completion. When set to 100, the task is considered completed.',
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
				operation: ['delete'],
				resource: ['task'],
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
				operation: ['get'],
				resource: ['task'],
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
				operation: ['getAll'],
				resource: ['task'],
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
		displayName: 'Group',
		name: 'groupId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'Group',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Group...',
				typeOptions: {
					searchListMethod: 'getGroups',
					// missing searchListDependsOn: ['groupSource'],
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: '12f0ca7d-b77f-4c4e-93d2-5cbdb4f464c6',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})[ \t]*',
							errorMessage: 'Not a valid Microsoft Teams Team ID',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})',
				},
			},
		],
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['task'],
			},
		},
	},
	{
		displayName: 'Member Name',
		name: 'memberId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'Member',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Member...',
				typeOptions: {
					searchListMethod: 'getMembers',
					// missing searchListDependsOn: ['groupId'],
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: '7e2f1174-e8ee-4859-b8b1-a8d1cc63d276',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})[ \t]*',
							errorMessage: 'Not a valid Microsoft Teams Team ID',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})',
				},
			},
		],
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['task'],
				tasksFor: ['member'],
			},
		},
	},
	{
		displayName: 'Plan',
		name: 'planId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'Plan',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Plan...',
				typeOptions: {
					searchListMethod: 'getPlans',
					// missing searchListDependsOn: ['groupId'],
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'rl1HYb0cUEiHPc7zgB_KWWUAA7Of',
				// validation missing because no documentation found how these unique ids look like.
			},
		],
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['task'],
				tasksFor: ['plan'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['task'],
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
				operation: ['getAll'],
				resource: ['task'],
				returnAll: [false],
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
				operation: ['update'],
				resource: ['task'],
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
				operation: ['update'],
				resource: ['task'],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Assigned To Name',
				name: 'assignedTo',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				modes: [
					{
						displayName: 'Member',
						name: 'list',
						type: 'list',
						placeholder: 'Select a Member...',
						typeOptions: {
							searchListMethod: 'getMembers',
							// missing searchListDependsOn: ['groupId'],
							searchable: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						placeholder: '7e2f1174-e8ee-4859-b8b1-a8d1cc63d276',
						validation: [
							{
								type: 'regex',
								properties: {
									regex:
										'^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})[ \t]*',
									errorMessage: 'Not a valid Microsoft Teams Team ID',
								},
							},
						],
						extractValue: {
							type: 'regex',
							regex: '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})',
						},
					},
				],
				description: 'Who the task should be assigned to',
			},
			{
				displayName: 'Bucket Name',
				name: 'bucketId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				modes: [
					{
						displayName: 'Bucket',
						name: 'list',
						type: 'list',
						placeholder: 'Select a Bucket...',
						typeOptions: {
							searchListMethod: 'getBuckets',
							// missing searchListDependsOn: ['updateFields.planId'],
							searchable: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						placeholder: 'rl1HYb0cUEiHPc7zgB_KWWUAA7Of',
						// validation missing because no documentation found how these unique ids look like.
					},
				],
				description: 'The bucket for the task to belong to',
			},
			{
				displayName: 'Due Date Time',
				name: 'dueDateTime',
				type: 'dateTime',
				default: '',
				description:
					'Date and time at which the task is due. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time.',
			},
			{
				displayName: 'Group',
				name: 'groupId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				modes: [
					{
						displayName: 'Group',
						name: 'list',
						type: 'list',
						placeholder: 'Select a Group...',
						typeOptions: {
							searchListMethod: 'getGroups',
							// missing searchListDependsOn: ['groupSource'],
							searchable: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						placeholder: '12f0ca7d-b77f-4c4e-93d2-5cbdb4f464c6',
						validation: [
							{
								type: 'regex',
								properties: {
									regex:
										'^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})[ \t]*',
									errorMessage: 'Not a valid Microsoft Teams Team ID',
								},
							},
						],
						extractValue: {
							type: 'regex',
							regex: '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})',
						},
					},
				],
			},
			{
				displayName: 'Label Names or IDs',
				name: 'labels',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
					loadOptionsDependsOn: ['updateFields.planId'],
				},
				default: [],
				description:
					'Labels to assign to the task. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				description:
					'Percentage of task completion. When set to 100, the task is considered completed.',
			},
			{
				displayName: 'Plan',
				name: 'planId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				modes: [
					{
						displayName: 'Plan',
						name: 'list',
						type: 'list',
						placeholder: 'Select a Plan...',
						typeOptions: {
							searchListMethod: 'getPlans',
							// missing searchListDependsOn: ['groupId'],
							searchable: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						placeholder: 'rl1HYb0cUEiHPc7zgB_KWWUAA7Of',
						// validation missing because no documentation found how these unique ids look like.
					},
				],
				description: 'The plan for the task to belong to',
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
