import {
	type IExecuteFunctions,
	type IDataObject,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodeListSearchResult,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

import type { TodoistProjectType } from './Service';
import {
	TodoistService,
	isTaskOperationType,
	isProjectOperationType,
	isSectionOperationType,
	isCommentOperationType,
	isLabelOperationType,
	isReminderOperationType,
} from './Service';
import { todoistApiRequest } from '../GenericFunctions';

const TODOIST_COLOR_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Berry Red', value: 'berry_red' },
	{ name: 'Red', value: 'red' },
	{ name: 'Orange', value: 'orange' },
	{ name: 'Yellow', value: 'yellow' },
	{ name: 'Olive Green', value: 'olive_green' },
	{ name: 'Lime Green', value: 'lime_green' },
	{ name: 'Green', value: 'green' },
	{ name: 'Mint Green', value: 'mint_green' },
	{ name: 'Teal', value: 'teal' },
	{ name: 'Sky Blue', value: 'sky_blue' },
	{ name: 'Light Blue', value: 'light_blue' },
	{ name: 'Blue', value: 'blue' },
	{ name: 'Grape', value: 'grape' },
	{ name: 'Violet', value: 'violet' },
	{ name: 'Lavender', value: 'lavender' },
	{ name: 'Magenta', value: 'magenta' },
	{ name: 'Salmon', value: 'salmon' },
	{ name: 'Charcoal', value: 'charcoal' },
	{ name: 'Grey', value: 'grey' },
	{ name: 'Taupe', value: 'taupe' },
];

const versionDescription: INodeTypeDescription = {
	displayName: 'Todoist',
	name: 'todoist',
	icon: 'file:todoist.svg',
	group: ['output'],
	version: [2, 2.1],
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume Todoist API',
	defaults: {
		name: 'Todoist',
	},
	usableAsTool: true,
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'todoistApi',
			required: true,
			displayOptions: {
				show: {
					authentication: ['apiKey'],
				},
			},
		},
		{
			name: 'todoistOAuth2Api',
			required: true,
			displayOptions: {
				show: {
					authentication: ['oAuth2'],
				},
			},
		},
	],
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'API Key',
					value: 'apiKey',
				},
				{
					name: 'OAuth2',
					value: 'oAuth2',
				},
			],
			default: 'apiKey',
		},
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
			options: [
				{
					name: 'Task',
					value: 'task',
					description: 'Task resource',
				},
				{
					name: 'Project',
					value: 'project',
					description: 'Project resource',
				},
				{
					name: 'Section',
					value: 'section',
					description: 'Section resource',
				},
				{
					name: 'Comment',
					value: 'comment',
					description: 'Comment resource',
				},
				{
					name: 'Label',
					value: 'label',
					description: 'Label resource',
				},
				{
					name: 'Reminder',
					value: 'reminder',
					description: 'Reminder resource',
				},
			],
			default: 'task',
			required: true,
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			required: true,
			displayOptions: {
				show: {
					resource: ['task'],
				},
			},
			options: [
				{
					name: 'Close',
					value: 'close',
					description: 'Close a task',
					action: 'Close a task',
				},
				{
					name: 'Create',
					value: 'create',
					description: 'Create a new task',
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
					name: 'Move',
					value: 'move',
					description: 'Move a task',
					action: 'Move a task',
				},
				{
					name: 'Quick Add',
					value: 'quickAdd',
					description: 'Quick add a task using natural language',
					action: 'Quick add a task',
				},
				{
					name: 'Reopen',
					value: 'reopen',
					description: 'Reopen a task',
					action: 'Reopen a task',
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
		// Project operations
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			required: true,
			displayOptions: {
				show: {
					resource: ['project'],
				},
			},
			options: [
				{
					name: 'Archive',
					value: 'archive',
					description: 'Archive a project',
					action: 'Archive a project',
				},
				{
					name: 'Create',
					value: 'create',
					description: 'Create a new project',
					action: 'Create a project',
				},
				{
					name: 'Delete',
					value: 'delete',
					description: 'Delete a project',
					action: 'Delete a project',
				},
				{
					name: 'Get',
					value: 'get',
					description: 'Get a project',
					action: 'Get a project',
				},
				{
					name: 'Get Collaborators',
					value: 'getCollaborators',
					description: 'Get project collaborators',
					action: 'Get project collaborators',
				},
				{
					name: 'Get Many',
					value: 'getAll',
					description: 'Get many projects',
					action: 'Get many projects',
				},
				{
					name: 'Unarchive',
					value: 'unarchive',
					description: 'Unarchive a project',
					action: 'Unarchive a project',
				},
				{
					name: 'Update',
					value: 'update',
					description: 'Update a project',
					action: 'Update a project',
				},
			],
			default: 'create',
		},
		// Section operations
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			required: true,
			displayOptions: {
				show: {
					resource: ['section'],
				},
			},
			options: [
				{
					name: 'Create',
					value: 'create',
					description: 'Create a new section',
					action: 'Create a section',
				},
				{
					name: 'Delete',
					value: 'delete',
					description: 'Delete a section',
					action: 'Delete a section',
				},
				{
					name: 'Get',
					value: 'get',
					description: 'Get a section',
					action: 'Get a section',
				},
				{
					name: 'Get Many',
					value: 'getAll',
					description: 'Get many sections',
					action: 'Get many sections',
				},
				{
					name: 'Update',
					value: 'update',
					description: 'Update a section',
					action: 'Update a section',
				},
			],
			default: 'create',
		},
		// Comment operations
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			required: true,
			displayOptions: {
				show: {
					resource: ['comment'],
				},
			},
			options: [
				{
					name: 'Create',
					value: 'create',
					description: 'Create a new comment',
					action: 'Create a comment',
				},
				{
					name: 'Delete',
					value: 'delete',
					description: 'Delete a comment',
					action: 'Delete a comment',
				},
				{
					name: 'Get',
					value: 'get',
					description: 'Get a comment',
					action: 'Get a comment',
				},
				{
					name: 'Get Many',
					value: 'getAll',
					description: 'Get many comments',
					action: 'Get many comments',
				},
				{
					name: 'Update',
					value: 'update',
					description: 'Update a comment',
					action: 'Update a comment',
				},
			],
			default: 'create',
		},
		// Label operations
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			required: true,
			displayOptions: {
				show: {
					resource: ['label'],
				},
			},
			options: [
				{
					name: 'Create',
					value: 'create',
					description: 'Create a new label',
					action: 'Create a label',
				},
				{
					name: 'Delete',
					value: 'delete',
					description: 'Delete a label',
					action: 'Delete a label',
				},
				{
					name: 'Get',
					value: 'get',
					description: 'Get a label',
					action: 'Get a label',
				},
				{
					name: 'Get Many',
					value: 'getAll',
					description: 'Get many labels',
					action: 'Get many labels',
				},
				{
					name: 'Update',
					value: 'update',
					description: 'Update a label',
					action: 'Update a label',
				},
			],
			default: 'create',
		},
		// Reminder operations
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			required: true,
			displayOptions: {
				show: {
					resource: ['reminder'],
				},
			},
			options: [
				{
					name: 'Create',
					value: 'create',
					description: 'Create a new reminder',
					action: 'Create a reminder',
				},
				{
					name: 'Delete',
					value: 'delete',
					description: 'Delete a reminder',
					action: 'Delete a reminder',
				},
				{
					name: 'Get Many',
					value: 'getAll',
					description: 'Get many reminders',
					action: 'Get many reminders',
				},
				{
					name: 'Update',
					value: 'update',
					description: 'Update a reminder',
					action: 'Update a reminder',
				},
			],
			default: 'create',
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
					operation: ['delete', 'close', 'get', 'reopen', 'update', 'move'],
				},
			},
		},
		{
			displayName: 'Project Name or ID',
			name: 'project',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			required: true,
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					placeholder: 'Select a project...',
					typeOptions: {
						searchListMethod: 'searchProjects',
						searchable: true,
					},
				},
				{
					displayName: 'ID',
					name: 'id',
					type: 'string',
					placeholder: '2302163813',
				},
			],
			displayOptions: {
				show: {
					resource: ['task'],
					operation: ['create', 'move'],
				},
			},
			description: 'The destination project. Choose from the list, or specify an ID.',
		},
		{
			displayName: 'Section Name or ID',
			name: 'section',
			type: 'options',
			typeOptions: {
				loadOptionsMethod: 'getSections',
				loadOptionsDependsOn: ['project.value'],
			},
			displayOptions: {
				show: {
					resource: ['task'],
					operation: ['move'],
				},
				hide: {
					'@version': [{ _cnd: { gte: 2.1 } }],
				},
			},
			default: '',
			description:
				'Section to which you want move the task. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		},
		{
			displayName: 'Additional Fields',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			displayOptions: {
				show: {
					resource: ['task'],
					operation: ['move'],
					'@version': [{ _cnd: { gte: 2.1 } }],
				},
			},
			options: [
				{
					displayName: 'Section Name or ID',
					name: 'section',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getSections',
						loadOptionsDependsOn: ['project', 'options.parent'],
					},
					default: '',
					description:
						'The destination section. The task becomes the last root task of the section. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				},
				{
					displayName: 'Parent Name or ID',
					name: 'parent',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getItems',
						loadOptionsDependsOn: ['project', 'options.section'],
					},
					default: '',
					description:
						'The destination parent task. The task becomes the last child task of the parent task. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				},
			],
		},
		{
			// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
			displayName: 'Label Names',
			name: 'labels',
			type: 'multiOptions',
			typeOptions: {
				loadOptionsMethod: 'getLabels',
			},
			displayOptions: {
				show: {
					resource: ['task'],
					operation: ['create'],
				},
			},
			default: [],
			description:
				'Optional labels that will be assigned to a created task. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		},
		{
			displayName: 'Content',
			name: 'content',
			type: 'string',
			typeOptions: {
				rows: 5,
			},
			displayOptions: {
				show: {
					resource: ['task'],
					operation: ['create'],
				},
			},
			default: '',
			required: true,
			description: 'Task content',
		},
		{
			displayName: 'Text',
			name: 'text',
			type: 'string',
			typeOptions: {
				rows: 3,
			},
			displayOptions: {
				show: {
					resource: ['task'],
					operation: ['quickAdd'],
				},
			},
			default: '',
			required: true,
			description:
				'Natural language text for quick adding task (e.g., "Buy milk @Grocery #shopping tomorrow"). It can include a due date in free form text, a project name starting with the "#" character (without spaces), a label starting with the "@" character, an assignee starting with the "+" character, a priority (e.g., p1), a deadline between "{}" (e.g. {in 3 days}), or a description starting from "//" until the end of the text.',
		},
		{
			displayName: 'Additional Fields',
			name: 'options',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: {
				show: {
					resource: ['task'],
					operation: ['quickAdd'],
				},
			},
			options: [
				{
					displayName: 'Note',
					name: 'note',
					type: 'string',
					default: '',
					description: 'The content of the note',
				},
				{
					displayName: 'Reminder',
					name: 'reminder',
					type: 'string',
					default: '',
					description: 'The date of the reminder, added in free form text',
				},
				{
					displayName: 'Auto Reminder',
					name: 'auto_reminder',
					type: 'boolean',
					default: false,
					// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
					description:
						'When this option is enabled, the default reminder will be added to the new item if it has a due date with time set',
				},
			],
		},
		{
			displayName: 'Additional Fields',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			displayOptions: {
				show: {
					resource: ['task'],
					operation: ['create'],
				},
			},
			options: [
				{
					displayName: 'Description',
					name: 'description',
					type: 'string',
					default: '',
					description: 'A description for the task',
				},
				{
					displayName: 'Due Date Time',
					name: 'dueDateTime',
					type: 'dateTime',
					default: '',
					description: 'Specific date and time in RFC3339 format in UTC',
				},
				{
					displayName: 'Due String Locale',
					name: 'dueLang',
					type: 'string',
					default: '',
					description:
						'2-letter code specifying language in case due_string is not written in English',
				},
				{
					displayName: 'Due String',
					name: 'dueString',
					type: 'string',
					default: '',
					description:
						'Human defined task due date (ex.: “next Monday”, “Tomorrow”). Value is set using local (not UTC) time.',
				},
				{
					displayName: 'Parent Name or ID',
					name: 'parentId',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getItems',
						loadOptionsDependsOn: ['project.value', 'options.section'],
					},
					default: {},
					description:
						'The parent task you want to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				},
				{
					displayName: 'Priority',
					name: 'priority',
					type: 'number',
					typeOptions: {
						maxValue: 4,
						minValue: 1,
					},
					default: 1,
					description: 'Task priority from 1 (normal) to 4 (urgent)',
				},
				{
					displayName: 'Section Name or ID',
					name: 'section',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getSections',
						loadOptionsDependsOn: ['project.value'],
					},
					default: {},
					description:
						'The section you want to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				},
				{
					displayName: 'Order',
					name: 'order',
					type: 'number',
					default: 0,
					description: 'Non-zero integer used to sort tasks under the same parent',
				},
				{
					displayName: 'Due Date',
					name: 'dueDate',
					type: 'string',
					default: '',
					placeholder: 'YYYY-MM-DD',
					description: 'Specific date in YYYY-MM-DD format',
				},
				{
					displayName: 'Assignee ID',
					name: 'assigneeId',
					type: 'string',
					default: '',
					description: 'Responsible user ID (for shared tasks)',
				},
				{
					displayName: 'Duration',
					name: 'duration',
					type: 'number',
					default: 0,
					description: 'Positive integer for task duration (must be used with Duration Unit)',
				},
				{
					displayName: 'Duration Unit',
					name: 'durationUnit',
					type: 'options',
					options: [
						{
							name: 'Minute',
							value: 'minute',
						},
						{
							name: 'Day',
							value: 'day',
						},
					],
					default: 'minute',
					description: 'Unit of time for duration (must be used with Duration)',
				},
				{
					displayName: 'Deadline Date',
					name: 'deadlineDate',
					type: 'string',
					default: '',
					placeholder: 'YYYY-MM-DD',
					description: 'Specific deadline date in YYYY-MM-DD format',
				},
			],
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
		{
			displayName: 'Filters',
			name: 'filters',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			displayOptions: {
				show: {
					resource: ['task'],
					operation: ['getAll'],
				},
			},
			options: [
				{
					displayName: 'Filter',
					name: 'filter',
					type: 'string',
					default: '',
					description:
						'Filter by any <a href="https://get.todoist.help/hc/en-us/articles/205248842">supported filter.</a>',
				},
				{
					displayName: 'IDs',
					name: 'ids',
					type: 'string',
					default: '',
					description: 'A list of the task IDs to retrieve, this should be a comma-separated list',
				},
				{
					displayName: 'Label Name or ID',
					name: 'labelId',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getLabels',
					},
					default: {},
					description:
						'Filter tasks by label. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				},
				{
					displayName: 'Lang',
					name: 'lang',
					type: 'string',
					default: '',
					description:
						'IETF language tag defining what language filter is written in, if differs from default English',
				},
				{
					displayName: 'Parent Name or ID',
					name: 'parentId',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getItems',
						loadOptionsDependsOn: ['filters.projectId', 'filters.sectionId'],
					},
					default: '',
					description:
						'Filter tasks by parent task ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				},
				{
					displayName: 'Project Name or ID',
					name: 'projectId',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getProjects',
					},
					default: '',
					description:
						'Filter tasks by project ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				},
				{
					displayName: 'Section Name or ID',
					name: 'sectionId',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getSections',
						loadOptionsDependsOn: ['filters.projectId'],
					},
					default: '',
					description:
						'Filter tasks by section ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				},
			],
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
					displayName: 'Content',
					name: 'content',
					type: 'string',
					default: '',
					description: 'Task content',
				},
				{
					displayName: 'Description',
					name: 'description',
					type: 'string',
					default: '',
					description: 'A description for the task',
				},
				{
					displayName: 'Due Date Time',
					name: 'dueDateTime',
					type: 'dateTime',
					default: '',
					description: 'Specific date and time in RFC3339 format in UTC',
				},
				{
					displayName: 'Due String Locale',
					name: 'dueLang',
					type: 'string',
					default: '',
					description:
						'2-letter code specifying language in case due_string is not written in English',
				},
				{
					displayName: 'Due String',
					name: 'dueString',
					type: 'string',
					default: '',
					description:
						'Human defined task due date (ex.: “next Monday”, “Tomorrow”). Value is set using local (not UTC) time.',
				},
				{
					displayName: 'Due String Locale',
					name: 'dueLang',
					type: 'string',
					default: '',
					description:
						'2-letter code specifying language in case due_string is not written in English',
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
					displayName: 'Label Names',
					name: 'labels',
					type: 'multiOptions',
					description:
						'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
					typeOptions: {
						loadOptionsMethod: 'getLabels',
					},
					default: [],
				},
				{
					displayName: 'Priority',
					name: 'priority',
					type: 'number',
					typeOptions: {
						maxValue: 4,
						minValue: 1,
					},
					default: 1,
					description: 'Task priority from 1 (normal) to 4 (urgent)',
				},
				{
					displayName: 'Order',
					name: 'order',
					type: 'number',
					default: 0,
					description: 'Non-zero integer used to sort tasks under the same parent',
				},
				{
					displayName: 'Due Date',
					name: 'dueDate',
					type: 'string',
					default: '',
					placeholder: 'YYYY-MM-DD',
					description: 'Specific date in YYYY-MM-DD format',
				},
				{
					displayName: 'Assignee ID',
					name: 'assigneeId',
					type: 'string',
					default: '',
					description: 'Responsible user ID (for shared tasks)',
				},
				{
					displayName: 'Duration',
					name: 'duration',
					type: 'number',
					default: 0,
					description: 'Positive integer for task duration (must be used with Duration Unit)',
				},
				{
					displayName: 'Duration Unit',
					name: 'durationUnit',
					type: 'options',
					options: [
						{
							name: 'Minute',
							value: 'minute',
						},
						{
							name: 'Day',
							value: 'day',
						},
					],
					default: 'minute',
					description: 'Unit of time for duration (must be used with Duration)',
				},
				{
					displayName: 'Deadline Date',
					name: 'deadlineDate',
					type: 'string',
					default: '',
					placeholder: 'YYYY-MM-DD',
					description: 'Specific deadline date in YYYY-MM-DD format',
				},
			],
		},
		// Project fields
		{
			displayName: 'Project ID',
			name: 'projectId',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					resource: ['project'],
					operation: ['archive', 'delete', 'get', 'getCollaborators', 'unarchive', 'update'],
				},
			},
			description: 'The project ID - can be either a string or number',
		},
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					resource: ['project'],
					operation: ['create'],
				},
			},
			description: 'Name of the project',
		},
		{
			displayName: 'Additional Fields',
			name: 'projectOptions',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: {
				show: {
					resource: ['project'],
					operation: ['create'],
				},
			},
			options: [
				{
					displayName: 'Color',
					name: 'color',
					type: 'options',
					options: TODOIST_COLOR_OPTIONS,
					default: '',
					description: 'The color of the project',
				},
				{
					displayName: 'Is Favorite',
					name: 'is_favorite',
					type: 'boolean',
					default: false,
					description: 'Whether the project is a favorite',
				},
				{
					displayName: 'Parent ID',
					name: 'parent_id',
					type: 'string',
					default: '',
					description: 'Parent project ID',
				},
				{
					displayName: 'View Style',
					name: 'view_style',
					type: 'options',
					options: [
						{
							name: 'List',
							value: 'list',
						},
						{
							name: 'Board',
							value: 'board',
						},
					],
					default: 'list',
					description: 'The default view style of the project',
				},
			],
		},
		{
			displayName: 'Update Fields',
			name: 'projectUpdateFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: {
				show: {
					resource: ['project'],
					operation: ['update'],
				},
			},
			options: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
					description: 'Name of the project',
				},
				{
					displayName: 'Color',
					name: 'color',
					type: 'options',
					options: TODOIST_COLOR_OPTIONS,
					default: '',
					description: 'The color of the project',
				},
				{
					displayName: 'Is Favorite',
					name: 'is_favorite',
					type: 'boolean',
					default: false,
					description: 'Whether the project is a favorite',
				},
				{
					displayName: 'View Style',
					name: 'view_style',
					type: 'options',
					options: [
						{
							name: 'List',
							value: 'list',
						},
						{
							name: 'Board',
							value: 'board',
						},
					],
					default: 'list',
					description: 'The default view style of the project',
				},
			],
		},
		// Section fields
		{
			displayName: 'Section ID',
			name: 'sectionId',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					resource: ['section'],
					operation: ['delete', 'get', 'update'],
				},
			},
		},
		{
			displayName: 'Project Name or ID',
			name: 'sectionProject',
			type: 'resourceLocator',
			default: { mode: 'list', value: '' },
			required: true,
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					placeholder: 'Select a project...',
					typeOptions: {
						searchListMethod: 'searchProjects',
						searchable: true,
					},
				},
				{
					displayName: 'ID',
					name: 'id',
					type: 'string',
					placeholder: '2302163813',
				},
			],
			displayOptions: {
				show: {
					resource: ['section'],
					operation: ['create'],
				},
			},
			description: 'The project to add the section to',
		},
		{
			displayName: 'Name',
			name: 'sectionName',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					resource: ['section'],
					operation: ['create'],
				},
			},
			description: 'Name of the section',
		},
		{
			displayName: 'Additional Fields',
			name: 'sectionOptions',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: {
				show: {
					resource: ['section'],
					operation: ['create'],
				},
			},
			options: [
				{
					displayName: 'Order',
					name: 'order',
					type: 'number',
					default: 0,
					description: 'The order of the section',
				},
			],
		},
		{
			displayName: 'Update Fields',
			name: 'sectionUpdateFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: {
				show: {
					resource: ['section'],
					operation: ['update'],
				},
			},
			options: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
					description: 'Name of the section',
				},
			],
		},
		{
			displayName: 'Filters',
			name: 'sectionFilters',
			type: 'collection',
			placeholder: 'Add Filter',
			default: {},
			displayOptions: {
				show: {
					resource: ['section'],
					operation: ['getAll'],
				},
			},
			options: [
				{
					displayName: 'Project Name or ID',
					name: 'project_id',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getProjects',
					},
					default: '',
					description:
						'Filter sections by project. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				},
			],
		},
		// Comment fields
		{
			displayName: 'Comment ID',
			name: 'commentId',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					resource: ['comment'],
					operation: ['delete', 'get', 'update'],
				},
			},
		},
		{
			displayName: 'Task ID',
			name: 'commentTaskId',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					resource: ['comment'],
					operation: ['create'],
				},
			},
			description: 'The ID of the task to comment on',
		},
		{
			displayName: 'Content',
			name: 'commentContent',
			type: 'string',
			typeOptions: {
				rows: 3,
			},
			default: '',
			required: true,
			displayOptions: {
				show: {
					resource: ['comment'],
					operation: ['create'],
				},
			},
			description: 'Comment content',
		},
		{
			displayName: 'Update Fields',
			name: 'commentUpdateFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: {
				show: {
					resource: ['comment'],
					operation: ['update'],
				},
			},
			options: [
				{
					displayName: 'Content',
					name: 'content',
					type: 'string',
					typeOptions: {
						rows: 3,
					},
					default: '',
					description: 'Comment content',
				},
			],
		},
		{
			displayName: 'Filters',
			name: 'commentFilters',
			type: 'collection',
			placeholder: 'Add Filter',
			default: {},
			displayOptions: {
				show: {
					resource: ['comment'],
					operation: ['getAll'],
				},
			},
			options: [
				{
					displayName: 'Task ID',
					name: 'task_id',
					type: 'string',
					default: '',
					description: 'Filter comments by task ID',
				},
				{
					displayName: 'Project ID',
					name: 'project_id',
					type: 'string',
					default: '',
					description: 'Filter comments by project ID',
				},
			],
		},
		// Label fields
		{
			displayName: 'Label ID',
			name: 'labelId',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					resource: ['label'],
					operation: ['delete', 'get', 'update'],
				},
			},
		},
		{
			displayName: 'Name',
			name: 'labelName',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					resource: ['label'],
					operation: ['create'],
				},
			},
			description: 'Name of the label',
		},
		{
			displayName: 'Additional Fields',
			name: 'labelOptions',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: {
				show: {
					resource: ['label'],
					operation: ['create'],
				},
			},
			options: [
				{
					displayName: 'Color',
					name: 'color',
					type: 'options',
					options: TODOIST_COLOR_OPTIONS,
					default: '',
					description: 'The color of the label',
				},
				{
					displayName: 'Order',
					name: 'order',
					type: 'number',
					default: 0,
					description: 'Label order',
				},
				{
					displayName: 'Is Favorite',
					name: 'is_favorite',
					type: 'boolean',
					default: false,
					description: 'Whether the label is a favorite',
				},
			],
		},
		{
			displayName: 'Update Fields',
			name: 'labelUpdateFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: {
				show: {
					resource: ['label'],
					operation: ['update'],
				},
			},
			options: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
					description: 'Name of the label',
				},
				{
					displayName: 'Color',
					name: 'color',
					type: 'options',
					options: TODOIST_COLOR_OPTIONS,
					default: '',
					description: 'The color of the label',
				},
				{
					displayName: 'Order',
					name: 'order',
					type: 'number',
					default: 0,
					description: 'Label order',
				},
				{
					displayName: 'Is Favorite',
					name: 'is_favorite',
					type: 'boolean',
					default: false,
					description: 'Whether the label is a favorite',
				},
			],
		},
		// Reminder fields
		{
			displayName: 'Reminder ID',
			name: 'reminderId',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					resource: ['reminder'],
					operation: ['delete', 'update'],
				},
			},
		},
		{
			displayName: 'Task ID',
			name: 'itemId',
			type: 'string',
			default: '',
			required: true,
			displayOptions: {
				show: {
					resource: ['reminder'],
					operation: ['create'],
				},
			},
			description: 'The ID of the task to attach reminder to',
		},
		{
			displayName: 'Due Date Type',
			name: 'dueDateType',
			type: 'options',
			options: [
				{
					name: 'Natural Language',
					value: 'natural_language',
					description: 'Human-readable date and time (e.g., "tomorrow 2pm")',
				},
				{
					name: 'Full-Day Date',
					value: 'full_day',
					description: 'Date without specific time (floating)',
				},
				{
					name: 'Floating Date with Time',
					value: 'floating_time',
					description: 'Date and time without timezone',
				},
				{
					name: 'Fixed Timezone Date with Time',
					value: 'fixed_timezone',
					description: 'Date and time with specific timezone',
				},
			],
			default: 'natural_language',
			required: true,
			displayOptions: {
				show: {
					resource: ['reminder'],
					operation: ['create'],
				},
			},
			description: 'How to specify when the reminder should trigger',
		},
		{
			displayName: 'Natural Language Representation',
			name: 'natural_language_representation',
			type: 'string',
			default: '',
			placeholder: 'e.g., "tomorrow 2pm", "monday 10:45am"',
			required: true,
			displayOptions: {
				show: {
					resource: ['reminder'],
					operation: ['create'],
					dueDateType: ['natural_language'],
				},
			},
			description: 'Human-readable date and time',
		},
		{
			displayName: 'Date',
			name: 'date',
			type: 'string',
			default: '',
			placeholder: 'YYYY-MM-DD',
			required: true,
			displayOptions: {
				show: {
					resource: ['reminder'],
					operation: ['create'],
					dueDateType: ['full_day'],
				},
			},
			description: 'Full-day date in YYYY-MM-DD format',
		},
		{
			displayName: 'Date Time',
			name: 'datetime',
			type: 'dateTime',
			default: '',
			required: true,
			displayOptions: {
				show: {
					resource: ['reminder'],
					operation: ['create'],
					dueDateType: ['floating_time'],
				},
			},
			description: 'Floating date and time (no timezone)',
		},
		{
			displayName: 'Date Time',
			name: 'datetime',
			type: 'dateTime',
			default: '',
			required: true,
			displayOptions: {
				show: {
					resource: ['reminder'],
					operation: ['create'],
					dueDateType: ['fixed_timezone'],
				},
			},
			description: 'Date and time with timezone',
		},
		{
			displayName: 'Timezone',
			name: 'timezone',
			type: 'string',
			default: '',
			placeholder: 'e.g., "America/New_York"',
			required: true,
			displayOptions: {
				show: {
					resource: ['reminder'],
					operation: ['create'],
					dueDateType: ['fixed_timezone'],
				},
			},
			description: 'Timezone for the fixed timezone date',
		},
		{
			displayName: 'Additional Fields',
			name: 'reminderOptions',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: {
				show: {
					resource: ['reminder'],
					operation: ['create'],
				},
			},
			options: [
				{
					displayName: 'Type',
					name: 'type',
					type: 'options',
					options: [
						{
							name: 'Absolute',
							value: 'absolute',
						},
						{
							name: 'Relative',
							value: 'relative',
						},
					],
					default: 'absolute',
					description: 'The reminder type',
				},
				{
					displayName: 'Minute Offset',
					name: 'minute_offset',
					type: 'number',
					default: 0,
					description: 'Minutes before the task due date',
				},
				{
					displayName: 'Notify User ID',
					name: 'notify_uid',
					type: 'string',
					default: '',
					description: 'User ID to notify (for shared tasks)',
				},
			],
		},
		{
			displayName: 'Update Fields',
			name: 'reminderUpdateFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: {
				show: {
					resource: ['reminder'],
					operation: ['update'],
				},
			},
			options: [
				{
					displayName: 'Due',
					name: 'due',
					type: 'collection',
					placeholder: 'Add Due Date Option',
					default: {},
					options: [
						{
							displayName: 'Natural Language',
							name: 'string',
							type: 'string',
							default: '',
							placeholder: 'e.g., "tomorrow 2pm", "monday 10:45am"',
							description: 'Human-readable date and time',
						},
						{
							displayName: 'Date',
							name: 'date',
							type: 'string',
							default: '',
							placeholder: 'YYYY-MM-DD',
							description: 'Specific date in YYYY-MM-DD format',
						},
						{
							displayName: 'Date Time',
							name: 'datetime',
							type: 'dateTime',
							default: '',
							description: 'Specific date and time',
						},
						{
							displayName: 'Timezone',
							name: 'timezone',
							type: 'string',
							default: '',
							placeholder: 'e.g., "America/New_York"',
							description: 'Timezone for the reminder',
						},
					],
					description: 'When the reminder should trigger',
				},
				{
					displayName: 'Type',
					name: 'type',
					type: 'options',
					options: [
						{
							name: 'Absolute',
							value: 'absolute',
						},
						{
							name: 'Relative',
							value: 'relative',
						},
					],
					default: 'absolute',
					description: 'The reminder type',
				},
				{
					displayName: 'Minute Offset',
					name: 'minute_offset',
					type: 'number',
					default: 0,
					description: 'Minutes before the task due date',
				},
				{
					displayName: 'Notify User ID',
					name: 'notify_uid',
					type: 'string',
					default: '',
					description: 'User ID to notify (for shared tasks)',
				},
			],
		},
	],
};

export class TodoistV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		listSearch: {
			async searchProjects(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const projects: TodoistProjectType[] = await todoistApiRequest.call(
					this,
					'GET',
					'/projects',
				);
				return {
					results: projects
						.filter(
							(project) => !filter || project.name.toLowerCase().includes(filter.toLowerCase()),
						)
						.map((project) => ({
							name: project.name,
							value: project.id,
						})),
				};
			},
		},
		loadOptions: {
			// Get all the available projects to display them to user so that they can
			// select them easily
			async getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const projects = await todoistApiRequest.call(this, 'GET', '/projects');
				for (const project of projects) {
					returnData.push({
						name: project.name,
						value: project.id,
					});
				}

				return returnData;
			},

			// Get all the available sections in the selected project, to display them
			// to user so that they can select one easily
			async getSections(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const options = Object.assign(
					{},
					this.getNodeParameter('options', {}),
					this.getNodeParameter('filters', {}),
				) as IDataObject;

				const projectId =
					(options.projectId as number) ??
					(this.getCurrentNodeParameter('project', { extractValue: true }) as number);
				if (projectId) {
					const qs: IDataObject = { project_id: projectId };
					const sections = await todoistApiRequest.call(this, 'GET', '/sections', {}, qs);
					for (const section of sections) {
						returnData.push({
							name: section.name,
							value: section.id,
						});
					}
				}

				return returnData;
			},

			// Get all the available parents in the selected project and section,
			// to display them to user so that they can select one easily
			async getItems(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const options = Object.assign(
					{},
					this.getNodeParameter('options', {}),
					this.getNodeParameter('filters', {}),
				) as IDataObject;

				const projectId =
					(options.projectId as number) ??
					(this.getCurrentNodeParameter('project', { extractValue: true }) as number);

				const sectionId =
					(options.sectionId as number) ||
					(options.section as number) ||
					(this.getCurrentNodeParameter('sectionId') as number);

				if (projectId) {
					const qs: IDataObject = sectionId
						? { project_id: projectId, section_id: sectionId }
						: { project_id: projectId };

					const items = await todoistApiRequest.call(this, 'GET', '/tasks', {}, qs);
					for (const item of items) {
						returnData.push({
							name: item.content,
							value: item.id,
						});
					}
				}

				return returnData;
			},

			// Get all the available labels to display them to user so that they can
			// select them easily
			async getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const labels = await todoistApiRequest.call(this, 'GET', '/labels');

				for (const label of labels) {
					returnData.push({
						name: label.name,
						value: label.name,
					});
				}

				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const service = new TodoistService();
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'task') {
					if (!isTaskOperationType(operation)) {
						throw new NodeOperationError(
							this.getNode(),
							`Invalid operation '${operation}' for task resource`,
						);
					}
					responseData = await service.executeTask(this, operation, i);
				} else if (resource === 'project') {
					if (!isProjectOperationType(operation)) {
						throw new NodeOperationError(
							this.getNode(),
							`Invalid operation '${operation}' for project resource`,
						);
					}
					responseData = await service.executeProject(this, operation, i);
				} else if (resource === 'section') {
					if (!isSectionOperationType(operation)) {
						throw new NodeOperationError(
							this.getNode(),
							`Invalid operation '${operation}' for section resource`,
						);
					}
					responseData = await service.executeSection(this, operation, i);
				} else if (resource === 'comment') {
					if (!isCommentOperationType(operation)) {
						throw new NodeOperationError(
							this.getNode(),
							`Invalid operation '${operation}' for comment resource`,
						);
					}
					responseData = await service.executeComment(this, operation, i);
				} else if (resource === 'label') {
					if (!isLabelOperationType(operation)) {
						throw new NodeOperationError(
							this.getNode(),
							`Invalid operation '${operation}' for label resource`,
						);
					}
					responseData = await service.executeLabel(this, operation, i);
				} else if (resource === 'reminder') {
					if (!isReminderOperationType(operation)) {
						throw new NodeOperationError(
							this.getNode(),
							`Invalid operation '${operation}' for reminder resource`,
						);
					}
					responseData = await service.executeReminder(this, operation, i);
				}

				if (responseData !== undefined && Array.isArray(responseData?.data)) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData.data as IDataObject[]),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				} else {
					if (responseData?.hasOwnProperty('success')) {
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ success: responseData.success }),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else {
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData?.data as IDataObject),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
