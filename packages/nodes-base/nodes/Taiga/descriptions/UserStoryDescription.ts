import {
	INodeProperties,
} from 'n8n-workflow';

export const userStoryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'userStory',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a user story',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a user story',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a user story',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all user stories',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a user story',
			},
		],
		default: 'create',
		description: 'Operation to perform',
	},
];

export const userStoryFields: INodeProperties[] = [
	// ----------------------------------------
	//            userStory: create
	// ----------------------------------------
	{
		displayName: 'Project ID',
		name: 'projectId',
		description: 'ID of the project to which the user story belongs',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'userStory',
				],
				operation: [
					'create',
				],
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
				resource: [
					'userStory',
				],
				operation: [
					'create',
				],
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
				resource: [
					'userStory',
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
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'ID of the user to whom the user story is assigned',
			},
			{
				displayName: 'Backlog Order',
				name: 'backlog_order',
				type: 'number',
				default: 1,
				typeOptions: {
					minValue: 1,
				},
				description: 'Order of the user story in the backlog',
			},
			{
				displayName: 'Blocked Note',
				name: 'blocked_note',
				type: 'string',
				default: '',
				description: 'Reason why the user story is blocked. Requires "Is Blocked" toggle to be enabled',
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
				description: 'Whether the user story is blocked',
			},
			{
				displayName: 'Kanban Order',
				name: 'kanban_order',
				type: 'number',
				default: 1,
				typeOptions: {
					minValue: 1,
				},
				description: 'Order of the user story in the kanban',
			},
			{
				displayName: 'Milestone (Sprint)',
				name: 'milestone',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectId',
					],
					loadOptionsMethod: 'getMilestones',
				},
				default: '',
				description: 'ID of the milestone of the user story',
			},
			{
				displayName: 'Sprint Order',
				name: 'sprint_order',
				type: 'number',
				default: 1,
				typeOptions: {
					minValue: 1,
				},
				description: 'Order of the user story in the milestone',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectId',
					],
					loadOptionsMethod: 'getUserStoryStatuses',
				},
				default: '',
				description: 'ID of the status of the user story',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectId',
					],
					loadOptionsMethod: 'getTags',
				},
				default: [],
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectId',
					],
					loadOptionsMethod: 'getTypes',
				},
				default: '',
			},
		],
	},

	// ----------------------------------------
	//            userStory: delete
	// ----------------------------------------
	{
		displayName: 'User Story ID',
		name: 'userStoryId',
		description: 'ID of the user story to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'userStory',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//              userStory: get
	// ----------------------------------------
	{
		displayName: 'User Story ID',
		name: 'userStoryId',
		description: 'ID of the user story to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'userStory',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//            userStory: getAll
	// ----------------------------------------
	{
		displayName: 'Project ID',
		name: 'projectId',
		description: 'ID of the project to which the user story belongs',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'userStory',
				],
				operation: [
					'getAll',
				],
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
				resource: [
					'userStory',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'How many results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'userStory',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
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
				resource: [
					'userStory',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Assigned To',
				name: 'assigned_to',
				description: 'ID of the user whom the user story is assigned to',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectId',
					],
					loadOptionsMethod: 'getUsers',
				},
				default: '',
			},
			{
				displayName: 'Epic',
				name: 'epic',
				description: 'ID of the epic to which the user story belongs',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectId',
					],
					loadOptionsMethod: 'getEpics',
				},
				default: '',
			},
			{
				displayName: 'Is Closed',
				name: 'statusIsClosed',
				description: 'Whether the user story is closed',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Is Archived',
				name: 'statusIsArchived',
				description: 'Whether the user story has been archived',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Milestone (Sprint)',
				name: 'milestone',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectId',
					],
					loadOptionsMethod: 'getMilestones',
				},
				default: '',
				description: 'ID of the milestone of the user story',
			},
			{
				displayName: 'Role',
				name: 'role',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectId',
					],
					loadOptionsMethod: 'getRoles',
				},
				default: '',
			},
			{
				displayName: 'Status',
				name: 'status',
				description: 'ID of the status of the user story',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectId',
					],
					loadOptionsMethod: 'getUserStoryStatuses',
				},
				default: '',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectId',
					],
					loadOptionsMethod: 'getTags',
				},
				default: [],
			},
		],
	},

	// ----------------------------------------
	//            userStory: update
	// ----------------------------------------
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		default: '',
		description: 'ID of the project to set the user story to',
		displayOptions: {
			show: {
				resource: [
					'userStory',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'User Story ID',
		name: 'userStoryId',
		description: 'ID of the user story to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'userStory',
				],
				operation: [
					'update',
				],
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
				resource: [
					'userStory',
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
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'ID of the user to assign the the user story to',
			},
			{
				displayName: 'Backlog Order',
				name: 'backlog_order',
				type: 'number',
				default: 1,
				typeOptions: {
					minValue: 1,
				},
				description: 'Order of the user story in the backlog',
			},
			{
				displayName: 'Blocked Note',
				name: 'blocked_note',
				type: 'string',
				default: '',
				description: 'Reason why the user story is blocked. Requires "Is Blocked" toggle to be enabled',
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
				description: 'Whether the user story is blocked',
			},
			{
				displayName: 'Kanban Order',
				name: 'kanban_order',
				type: 'number',
				default: 1,
				typeOptions: {
					minValue: 1,
				},
				description: 'Order of the user story in the kanban',
			},
			{
				displayName: 'Milestone (Sprint)',
				name: 'milestone',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectId',
					],
					loadOptionsMethod: 'getMilestones',
				},
				default: '',
				description: 'ID of the milestone of the user story',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Sprint Order',
				name: 'sprint_order',
				type: 'number',
				default: 1,
				typeOptions: {
					minValue: 1,
				},
				description: 'Order of the user story in the milestone',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectId',
					],
					loadOptionsMethod: 'getUserStoryStatuses',
				},
				default: '',
				description: 'ID of the status of the user story',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectId',
					],
					loadOptionsMethod: 'getTags',
				},
				default: [],
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectId',
					],
					loadOptionsMethod: 'getTypes',
				},
				default: '',
			},
		],
	},
];
