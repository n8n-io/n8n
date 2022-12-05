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
				description: 'Create a new task',
				action: 'Create a task',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a task',
				action: 'Update a task',
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
		],
		default: 'create',
	},
];

export const taskFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                task:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workspace ID',
		name: 'workspaceId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
		description: 'Create resources under the given workspace',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['create'],
			},
		},
		description: 'The title of the task',
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
				displayName: 'Owner ID',
				name: 'ownerid',
				type: 'string',
				default: '',
				description: 'The ID of the account to whom this task will be assigned',
			},
			{
				displayName: 'List ID',
				name: 'listID',
				type: 'string',
				default: '',
				description:
					'Put the new task in a list ("project"). Omit this param to have the task be private.',
			},
			{
				displayName: 'Starts On',
				name: 'startsOn',
				type: 'dateTime',
				default: '',
				description: 'The date on which the task should start',
			},
			{
				displayName: 'Due On',
				name: 'dueOn',
				type: 'dateTime',
				default: '',
				description: 'The date on which the task should be due',
			},
			{
				displayName: 'Mirror Parent Subscribers',
				name: 'mirrorParentSubscribers',
				type: 'boolean',
				default: false,
				description:
					"Whether this task will be a subtask, and this is true, the parent tasks's subscribers will be mirrored to this one",
			},
			{
				displayName: 'Mirror Parent Tags',
				name: 'mirrorParentTags',
				type: 'boolean',
				default: false,
				description:
					"Whether this task will be a subtask, and this is true, the parent tasks's tags will be mirrored to this one",
			},
			{
				displayName: 'Note Content',
				name: 'noteContent',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: "Provide the content for the task's note",
			},
			{
				displayName: 'Note Mime Type',
				name: 'noteMimeType',
				type: 'options',
				default: 'text/plain',
				options: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'text/plain',
						value: 'text/plain',
					},
					{
						name: 'text/x-markdown',
						value: 'text/x-markdown',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'text/html',
						value: 'text/html',
					},
				],
				description: 'Identify which markup language is used to format the given note',
			},
			{
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'string',
				default: '',
				description: 'If provided, this task will become a subtask of the given task',
			},
			{
				displayName: 'Position List',
				name: 'positionList',
				type: 'number',
				default: 0,
				description: 'Determines the sort order when showing tasks in, or grouped by, a list',
			},
			{
				displayName: 'Position Upcoming',
				name: 'positionUpcoming',
				type: 'number',
				default: 0,
				description: 'Determines the sort order when showing tasks grouped by their due_date',
			},
			{
				displayName: 'Position',
				name: 'position',
				type: 'number',
				default: 0,
				description: 'Determines the sort order of tasks',
			},
			{
				displayName: 'Section ID',
				name: 'sectionId',
				type: 'string',
				default: '',
				description: 'Specify which section under which to create this task',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'A list of tag names to apply to the new task separated by a comma (,)',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 task:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Workspace ID',
		name: 'workspaceId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['update'],
			},
		},
		description: 'Create resources under the given workspace',
	},
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		default: '',
		required: true,
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
		placeholder: 'Add Update Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The title of the task',
			},
			{
				displayName: 'Completed',
				name: 'completed',
				type: 'boolean',
				default: false,
				description: 'Whether to complete the task',
			},
			{
				displayName: 'Owner ID',
				name: 'ownerid',
				type: 'string',
				default: '',
				description: 'The ID of the account to whom this task will be assigned',
			},
			{
				displayName: 'List ID',
				name: 'listID',
				type: 'string',
				default: '',
				description:
					'Put the new task in a list ("project"). Omit this param to have the task be private.',
			},
			{
				displayName: 'Starts On',
				name: 'startsOn',
				type: 'dateTime',
				default: '',
				description: 'The date on which the task should start',
			},
			{
				displayName: 'Due On',
				name: 'dueOn',
				type: 'dateTime',
				default: '',
				description: 'The date on which the task should be due',
			},
			{
				displayName: 'Mirror Parent Subscribers',
				name: 'mirrorParentSubscribers',
				type: 'boolean',
				default: false,
				description:
					"Whether this task will be a subtask, and this is true, the parent tasks's subscribers will be mirrored to this one",
			},
			{
				displayName: 'Mirror Parent Tags',
				name: 'mirrorParentTags',
				type: 'boolean',
				default: false,
				description:
					"Whether this task will be a subtask, and this is true, the parent tasks's tags will be mirrored to this one",
			},
			{
				displayName: 'Note Content',
				name: 'noteContent',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: "Provide the content for the task's note",
			},
			{
				displayName: 'Note Mime Type',
				name: 'noteMimeType',
				type: 'options',
				default: 'text/plain',
				options: [
					{
						name: 'Text/plain',
						value: 'text/plain',
					},
					{
						name: 'text/x-markdown',
						value: 'text/x-markdown',
					},
					{
						name: 'Text/html',
						value: 'text/html',
					},
				],
				description: 'Identify which markup language is used to format the given note',
			},
			{
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'string',
				default: '',
				description: 'If provided, this task will become a subtask of the given task',
			},
			{
				displayName: 'Position List',
				name: 'positionList',
				type: 'number',
				default: 0,
				description: 'Determines the sort order when showing tasks in, or grouped by, a list',
			},
			{
				displayName: 'Position Upcoming',
				name: 'positionUpcoming',
				type: 'number',
				default: 0,
				description: 'Determines the sort order when showing tasks grouped by their due_date',
			},
			{
				displayName: 'Position',
				name: 'position',
				type: 'number',
				default: 0,
				description: 'Determines the sort order of tasks',
			},
			{
				displayName: 'Section ID',
				name: 'sectionId',
				type: 'string',
				default: '',
				description: 'Specify which section under which to create this task',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'A list of tag names to apply to the new task separated by a comma (,)',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                  task:get                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['task'],
				operation: ['get'],
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
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Include',
				name: 'include',
				type: 'multiOptions',
				default: [],
				options: [
					{
						name: 'Schedule',
						value: 'schedule',
					},
					{
						name: 'Files',
						value: 'files',
					},
					{
						name: 'File Associations',
						value: 'file_associations',
					},
					{
						name: 'Parent',
						value: 'parent',
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 task:getAll                                */
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
				displayName: 'Include',
				name: 'include',
				type: 'multiOptions',
				default: [],
				options: [
					{
						name: 'Schedule',
						value: 'schedule',
					},
					{
						name: 'Files',
						value: 'files',
					},
					{
						name: 'File Associations',
						value: 'file_associations',
					},
					{
						name: 'Parent',
						value: 'parent',
					},
				],
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'options',
				default: 'created_at',
				options: [
					{
						name: 'Account ID',
						value: 'account_id',
					},
					{
						name: 'Completed At',
						value: 'completed_at',
					},
					{
						name: 'Created At',
						value: 'created_at',
					},
					{
						name: 'Due On',
						value: 'due_on',
					},
					{
						name: 'List ID',
						value: 'list_id',
					},
					{
						name: 'Name',
						value: 'name',
					},
					{
						name: 'Owner ID',
						value: 'owner_id',
					},
					{
						name: 'Position',
						value: 'position',
					},
					{
						name: 'Section ID',
						value: 'section_id',
					},
					{
						name: 'Starts On',
						value: 'starts_on',
					},
					{
						name: 'Updated At',
						value: 'updated_at',
					},
				],
			},
			{
				displayName: 'Workspace ID',
				name: 'workspaceId',
				type: 'string',
				default: '',
				description: 'Create resources under the given workspace',
			},
			{
				displayName: 'Created Before',
				name: 'createdBefore',
				type: 'dateTime',
				default: '',
				description: 'Select resources created before a certain time',
			},
			{
				displayName: 'Created After',
				name: 'createdAfter',
				type: 'dateTime',
				default: '',
				description: 'Select resources created after a certain time',
			},
			{
				displayName: 'Update Before',
				name: 'updateBefore',
				type: 'dateTime',
				default: '',
				description: 'Select resources updated before a certain time',
			},
			{
				displayName: 'Update After',
				name: 'updateAfter',
				type: 'dateTime',
				default: '',
				description: 'Select resources updated after a certain time',
			},
			{
				displayName: 'Deleted',
				name: 'deleted',
				type: 'boolean',
				default: false,
				description: 'Whether to select deleted resources',
			},
			{
				displayName: 'Cleared',
				name: 'cleared',
				type: 'boolean',
				default: false,
				description: 'Whether to select cleared resources',
			},
		],
	},
];
