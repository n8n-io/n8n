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
} from 'n8n-workflow';

import type { OperationType, TodoistProjectType } from './Service';
import { TodoistService } from './Service';
import { todoistApiRequest } from '../GenericFunctions';

// interface IBodyCreateTask {
// 	content?: string;
// 	description?: string;
// 	project_id?: number;
// 	section_id?: number;
// 	parent_id?: number;
// 	order?: number;
// 	label_ids?: number[];
// 	priority?: number;
// 	due_string?: string;
// 	due_datetime?: string;
// 	due_date?: string;
// 	due_lang?: string;
// }

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
					name: 'Reopen',
					value: 'reopen',
					description: 'Reopen a task',
					action: 'Reopen a task',
				},
				// {
				// 	name: 'Sync',
				// 	value: 'sync',
				// 	description: 'Sync a project',
				// },
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
					operation: ['create', 'move', 'sync'],
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
			displayName: 'Label Names or IDs',
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
			displayName: 'Sync Commands',
			name: 'commands',
			type: 'string',
			displayOptions: {
				show: {
					resource: ['task'],
					operation: ['sync'],
				},
			},
			default: '[]',
			hint: 'See docs for possible commands: https://developer.todoist.com/sync/v8/#sync',
			description: 'Sync body',
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
					displayName: 'Label Names or IDs',
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
					type: 'color',
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
					type: 'color',
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
			displayName: 'Additional Fields',
			name: 'commentOptions',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: {
				show: {
					resource: ['comment'],
					operation: ['create'],
				},
			},
			options: [
				{
					displayName: 'Attachment',
					name: 'attachment',
					type: 'json',
					default: '',
					description: 'Attachment data (JSON)',
				},
			],
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
					type: 'color',
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
					type: 'color',
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
		const operation = this.getNodeParameter('operation', 0) as OperationType;
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'task') {
					responseData = await service.execute(this, operation, i);
				} else if (resource === 'project') {
					responseData = await service.executeProject(this, operation as any, i);
				} else if (resource === 'section') {
					responseData = await service.executeSection(this, operation as any, i);
				} else if (resource === 'comment') {
					responseData = await service.executeComment(this, operation as any, i);
				} else if (resource === 'label') {
					responseData = await service.executeLabel(this, operation as any, i);
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
