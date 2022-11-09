import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { todoistApiRequest } from './GenericFunctions';

import { OperationType, TodoistService } from './Service';

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

export class Todoist implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Todoist',
		name: 'todoist',
		icon: 'file:todoist.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Todoist API',
		defaults: {
			name: 'Todoist',
		},
		inputs: ['main'],
		outputs: ['main'],
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
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				displayOptions: {
					show: {
						resource: ['task'],
						operation: ['create', 'move', 'sync'],
					},
				},
				default: '',
				description:
					'The project you want to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Section Name or ID',
				name: 'section',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSections',
					loadOptionsDependsOn: ['project'],
				},
				displayOptions: {
					show: {
						resource: ['task'],
						operation: ['move'],
					},
				},
				default: '',
				description:
					'Section to which you want move the task. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
					'Optional labels that will be assigned to a created task. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				placeholder: 'Add Option',
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
							loadOptionsDependsOn: ['project', 'options.section'],
						},
						default: {},
						description:
							'The parent task you want to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
							loadOptionsDependsOn: ['project'],
						},
						default: {},
						description:
							'The section you want to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				placeholder: 'Add Option',
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
						description:
							'A list of the task IDs to retrieve, this should be a comma-separated list',
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
							'Filter tasks by label. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
							'Filter tasks by parent task ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
							'Filter tasks by project ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
							'Filter tasks by section ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
							'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
		],
	};

	methods = {
		loadOptions: {
			// Get all the available projects to display them to user so that he can
			// select them easily
			async getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const projects = await todoistApiRequest.call(this, 'GET', '/projects');
				for (const project of projects) {
					const projectName = project.name;
					const projectId = project.id;

					returnData.push({
						name: projectName,
						value: projectId,
					});
				}

				return returnData;
			},

			// Get all the available sections in the selected project, to display them
			// to user so that he can select one easily
			async getSections(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const options = Object.assign(
					{},
					this.getNodeParameter('options', {}),
					this.getNodeParameter('filters', {}),
				) as IDataObject;

				const projectId =
					(options.projectId as number) ?? (this.getCurrentNodeParameter('project') as number);
				if (projectId) {
					const qs: IDataObject = { project_id: projectId };
					const sections = await todoistApiRequest.call(this, 'GET', '/sections', {}, qs);
					for (const section of sections) {
						const sectionName = section.name;
						const sectionId = section.id;

						returnData.push({
							name: sectionName,
							value: sectionId,
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
					(options.projectId as number) ?? (this.getCurrentNodeParameter('project') as number);

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
						const itemContent = item.content;
						const itemId = item.id;

						returnData.push({
							name: itemContent,
							value: itemId,
						});
					}
				}

				return returnData;
			},

			// Get all the available labels to display them to user so that he can
			// select them easily
			async getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const labels = await todoistApiRequest.call(this, 'GET', '/labels');

				for (const label of labels) {
					const labelName = label.name;
					const labelId = label.id;

					returnData.push({
						name: labelName,
						value: labelId,
					});
				}

				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		const service = new TodoistService();
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'task') {
					responseData = await service.execute(
						this,
						OperationType[operation as keyof typeof OperationType],
						i,
					);
				}
				if (Array.isArray(responseData?.data)) {
					returnData.push.apply(returnData, responseData?.data as IDataObject[]);
				} else {
					if (responseData?.hasOwnProperty('success')) {
						returnData.push({ success: responseData.success });
					} else {
						returnData.push(responseData?.data as IDataObject);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
