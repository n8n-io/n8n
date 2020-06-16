import { INodeProperties } from 'n8n-workflow';

export const taskOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['task']
			}
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Add a task to tasklist'
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a task'
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a task'
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all tasks from a tasklist'
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a task'
			}
		],
		default: 'create',
		description: 'The operation to perform.'
	}
] as INodeProperties[];

export const taskFields = [
	/* -------------------------------------------------------------------------- */
	/*                                 task:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'TaskList',
		name: 'task',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTasks'
		},
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['task']
			}
		},
		default: ''
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['task']
			}
		},
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'needs Action',
						value: 'needsAction'
					},
					{
						name: 'completed',
						value: 'completed'
					}
				],
				default: '',
				description: 'Current status of the task.'
			},
			{
				displayName: 'Links',
				name: 'links',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Link'
				},
				default: '',
				description: 'The links to insert in the task.'
			},

			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Additional Notes.'
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title of the task.'
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
				description: 'Due date of the task.'
			},
			{
				displayName: 'Completion date',
				name: 'completed',
				type: 'dateTime',
				default: '',
				description: `Completion date of the task (as a RFC 3339 timestamp). This field is omitted if the task has not been completed.`
			},

			{
				displayName: 'Deleted status',
				name: 'deleted',
				type: 'boolean',
				default: false,
				description: 'Flag indicating whether the task has been deleted.'
			},
			{
				displayName: 'Hidden',
				name: 'hidden',
				type: 'boolean',
				default: false,
				description: 'Flag indicating whether the task is hidden.'
			},
			{
				displayName: 'Parent',
				name: 'parent',
				type: 'string',
				default: '',
				description:
					'Parent task identifier.This field is omitted if it is a top-level task.'
			},
			{
				displayName: 'Position',
				name: 'position',
				type: 'string',
				default: '',
				description:
					'Parent task identifier.This field is omitted if it is a top-level task.'
			},
			{
				displayName: 'Self Link',
				name: 'selfLink',
				type: 'string',
				default: '',
				description:
					'URL pointing to this task. Used to retrieve, update, or delete this task.'
			},
			{
				displayName: 'Previous',
				name: 'previous',
				type: 'string',
				default: '',
				description:
					'Previous sibling task identifier. If the task is created at the first position among its siblings, this parameter is omitted.'
			}
		]
	},
	/* -------------------------------------------------------------------------- */
	/*                                 task:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'TaskList',
		name: 'task',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTasks'
		},
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['task']
			}
		},
		default: ''
	},
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['task']
			}
		},
		default: ''
	},
	/* -------------------------------------------------------------------------- */
	/*                                 task:get                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'TaskList',
		name: 'task',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTasks'
		},
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['task']
			}
		},
		default: ''
	},
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['task']
			}
		},
		default: ''
	},
	/* -------------------------------------------------------------------------- */
	/*                                 task:getAll                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'TaskList',
		name: 'task',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTasks'
		},
		required: true,
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['task']
			}
		},
		default: ''
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['task']
			}
		},
		default: false,
		description:
			'If all results should be returned or only up to a given limit.'
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['task'],
				returnAll: [false]
			}
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100
		},
		default: 20,
		description: 'How many results to return.'
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['task']
			}
		},

		options: [
			{
				displayName: 'Completed Max',
				name: 'completedMax',
				type: 'dateTime',
				default: '',
				description:
					'Upper bound for a task completion date (as a RFC 3339 timestamp) to filter by.'
			},
			{
				displayName: 'Completed Min',
				name: 'completedMin',
				type: 'dateTime',
				default: '',
				description:
					'Lower bound for a task completion date (as a RFC 3339 timestamp) to filter by.'
			},
			{
				displayName: 'Due Min',
				name: 'dueMin',
				type: 'dateTime',
				default: '',
				description:
					'Lower bound for a task due date (as a RFC 3339 timestamp) to filter by.'
			},
			{
				displayName: 'Due Max',
				name: 'dueMax',
				type: 'dateTime',
				default: '',
				description:
					'Upper bound for a task due date (as a RFC 3339 timestamp) to filter by.'
			},

			{
				displayName: 'Page Token',
				name: 'pageToken',
				type: 'string',
				default: '',
				description: 'Token specifying the result page to return.'
			},

			{
				displayName: 'Show Completed',
				name: 'showCompleted',
				type: 'boolean',
				default: true,
				description:
					'Flag indicating whether completed tasks are returned in the result'
			},
			{
				displayName: 'Show Deleted',
				name: 'showDeleted',
				type: 'boolean',
				default: false,
				description:
					'Flag indicating whether deleted tasks are returned in the result'
			},
			{
				displayName: 'Show Hidden',
				name: 'showHidden',
				type: 'boolean',
				default: false,
				description:
					'Flag indicating whether hidden tasks are returned in the result'
			},
			{
				displayName: 'Updated Min',
				name: 'updatedMin',
				type: 'string',

				description:
					'Lower bound for a task last modification time (as a RFC 3339 timestamp) to filter by.'
			}
		]
	},
	/* -------------------------------------------------------------------------- */
	/*                                 task:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'TaskList',
		name: 'task',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTasks'
		},
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['task']
			}
		},
		default: ''
	},
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['task']
			}
		},
		default: ''
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Update Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['task']
			}
		},
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'needs Action',
						value: 'needsAction'
					},
					{
						name: 'completed',
						value: 'completed'
					}
				],
				default: '',
				description: 'Current status of the task.'
			},
			{
				displayName: 'Links',
				name: 'links',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Link'
				},
				default: '',
				description: 'The links to insert in the task.'
			},

			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
				description: 'Additional Notes.'
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title of the task.'
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
				description: 'Due date of the task.'
			},
			{
				displayName: 'Completion date',
				name: 'completed',
				type: 'dateTime',
				default: '',
				description: `Completion date of the task (as a RFC 3339 timestamp). This field is omitted if the task has not been completed.`
			},

			{
				displayName: 'Deleted status',
				name: 'deleted',
				type: 'boolean',
				default: false,
				description: 'Flag indicating whether the task has been deleted.'
			},
			{
				displayName: 'Hidden',
				name: 'hidden',
				type: 'boolean',
				default: false,
				description: 'Flag indicating whether the task is hidden.'
			},
			{
				displayName: 'Parent',
				name: 'parent',
				type: 'string',
				default: '',
				description:
					'Parent task identifier.This field is omitted if it is a top-level task.'
			},
			{
				displayName: 'Position',
				name: 'position',
				type: 'string',
				default: '',
				description:
					'Parent task identifier.This field is omitted if it is a top-level task.'
			},
			{
				displayName: 'Self Link',
				name: 'selfLink',
				type: 'string',
				default: '',
				description:
					'URL pointing to this task. Used to retrieve, update, or delete this task.'
			},
			{
				displayName: 'Previous',
				name: 'previous',
				type: 'string',
				default: '',
				description:
					'Previous sibling task identifier. If the task is created at the first position among its siblings, this parameter is omitted.'
			}
		]
	}
] as INodeProperties[];
