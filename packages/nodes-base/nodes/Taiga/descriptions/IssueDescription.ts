import type { INodeProperties } from 'n8n-workflow';

export const issueOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['issue'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an issue',
				action: 'Create an issue',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an issue',
				action: 'Delete an issue',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an issue',
				action: 'Get an issue',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get many issues',
				action: 'Get many issues',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an issue',
				action: 'Update an issue',
			},
		],
		default: 'create',
	},
];

export const issueFields: INodeProperties[] = [
	// ----------------------------------------
	//              issue: create
	// ----------------------------------------
	{
		displayName: 'Project name or ID',
		name: 'projectId',
		description:
			'ID of the project to which the issue belongs. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['issue'],
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
				resource: ['issue'],
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
				resource: ['issue'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Assignee name or ID',
				name: 'assigned_to',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description:
					'ID of the user to whom the issue is assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Blocked note',
				name: 'blocked_note',
				type: 'string',
				default: '',
				description: 'Reason why the issue is blocked. Requires "Is blocked" toggle to be enabled.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Is blocked',
				name: 'is_blocked',
				type: 'boolean',
				default: false,
				description: 'Whether the issue is blocked',
			},
			{
				displayName: 'Milestone (sprint) name or ID',
				name: 'milestone',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getMilestones',
				},
				default: '',
				description:
					'ID of the milestone of the issue. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Priority name or ID',
				name: 'priority',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getPriorities',
				},
				default: '',
			},
			{
				displayName: 'Severity name or ID',
				name: 'severity',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getSeverities',
				},
				default: '',
			},
			{
				displayName: 'Status name or ID',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getIssueStatuses',
				},
				default: '',
				description:
					'ID of the status of the issue. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Tag names or IDs',
				name: 'tags',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getTags',
				},
				default: [],
			},
			{
				displayName: 'Type name or ID',
				name: 'type',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getTypes',
				},
				default: '',
			},
		],
	},

	// ----------------------------------------
	//              issue: delete
	// ----------------------------------------
	{
		displayName: 'Issue ID',
		name: 'issueId',
		description: 'ID of the issue to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['issue'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//                issue: get
	// ----------------------------------------
	{
		displayName: 'Issue ID',
		name: 'issueId',
		description: 'ID of the issue to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['issue'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//              issue: getAll
	// ----------------------------------------
	{
		displayName: 'Project name or ID',
		name: 'projectId',
		description:
			'ID of the project to which the issue belongs. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['issue'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['issue'],
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
				resource: ['issue'],
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
		displayOptions: {
			show: {
				resource: ['issue'],
				operation: ['getAll'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Assignee name or ID',
				name: 'assigned_to',
				description:
					'ID of the user to assign the issue to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getUsers',
				},
				default: '',
			},
			{
				displayName: 'Order by',
				name: 'orderBy',
				description: 'Field to order the issues by',
				type: 'options',
				options: [
					{
						name: 'Assigned to',
						value: 'assigned_to',
					},
					{
						name: 'Created date',
						value: 'created_date',
					},
					{
						name: 'Modified date',
						value: 'modified_date',
					},
					{
						name: 'Owner',
						value: 'owner',
					},
					{
						name: 'Priority',
						value: 'priority',
					},
					{
						name: 'Severity',
						value: 'severity',
					},
					{
						name: 'Status',
						value: 'status',
					},
					{
						name: 'Subject',
						value: 'subject',
					},
					{
						name: 'Type',
						value: 'type',
					},
				],
				default: 'assigned_to',
			},
			{
				displayName: 'Owner name or ID',
				name: 'owner',
				description:
					'ID of the owner of the issue. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getUsers',
				},
				default: '',
			},
			{
				displayName: 'Priority name or ID',
				name: 'priority',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getPriorities',
				},
				default: '',
			},
			{
				displayName: 'Role name or ID',
				name: 'role',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getRoles',
				},
				default: '',
			},
			{
				displayName: 'Severity name or ID',
				name: 'severity',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getSeverities',
				},
				default: '',
			},
			{
				displayName: 'Status name or ID',
				name: 'status',
				description:
					'ID of the status of the issue. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getIssueStatuses',
				},
				default: '',
			},
			{
				displayName: 'Tag names or IDs',
				name: 'tags',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getTags',
				},
				default: [],
			},
			{
				displayName: 'Type name or ID',
				name: 'type',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getTypes',
				},
				default: '',
			},
		],
	},

	// ----------------------------------------
	//              issue: update
	// ----------------------------------------
	{
		displayName: 'Project name or ID',
		name: 'projectId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		default: '',
		description:
			'ID of the project to set the issue to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['issue'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Issue ID',
		name: 'issueId',
		description: 'ID of the issue to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['issue'],
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
				resource: ['issue'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Assignee name or ID',
				name: 'assigned_to',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description:
					'ID of the user whom the issue is assigned to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Blocked note',
				name: 'blocked_note',
				type: 'string',
				default: '',
				description: 'Reason why the issue is blocked. Requires "Is blocked" toggle to be enabled.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Is blocked',
				name: 'is_blocked',
				type: 'boolean',
				default: false,
				description: 'Whether the issue is blocked',
			},
			{
				displayName: 'Milestone (sprint) name or ID',
				name: 'milestone',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getMilestones',
				},
				default: '',
				description:
					'ID of the milestone of the issue. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Priority name or ID',
				name: 'priority',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getPriorities',
				},
				default: '',
			},
			{
				displayName: 'Severity name or ID',
				name: 'severity',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getSeverities',
				},
				default: '',
			},
			{
				displayName: 'Status name or ID',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getIssueStatuses',
				},
				default: '',
				description:
					'ID of the status of the issue. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tag names or IDs',
				name: 'tags',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getTags',
				},
				default: [],
			},
			{
				displayName: 'Type name or ID',
				name: 'type',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['projectId'],
					loadOptionsMethod: 'getTypes',
				},
				default: '',
			},
		],
	},
];
