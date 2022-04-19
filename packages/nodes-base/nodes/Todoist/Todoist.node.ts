import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	FormatDueDatetime,
	todoistApiRequest,
} from './GenericFunctions';

interface IBodyCreateTask {
	content?: string;
	description?: string;
	project_id?: number;
	section_id?: number;
	parent?: number;
	order?: number;
	label_ids?: number[];
	priority?: number;
	due_string?: string;
	due_datetime?: string;
	due_date?: string;
	due_lang?: string;
}

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
						authentication: [
							'apiKey',
						],
					},
				},
			},
			{
				name: 'todoistOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
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
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Task',
						value: 'task',
						description: 'Task resource.',
					},
				],
				default: 'task',
				required: true,
				description: 'Resource to consume.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				required: true,
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
						description: 'Create a new task',
					},
					{
						name: 'Close',
						value: 'close',
						description: 'Close a task',
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
						name: 'Reopen',
						value: 'reopen',
						description: 'Reopen a task',
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
			{
				displayName: 'Project',
				name: 'project',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
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
				description: 'The project you want to operate on.',
			},
			{
				displayName: 'Labels',
				name: 'labels',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLabels',
				},
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
				default: [],
				required: false,
				description: 'Labels',
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
						resource: [
							'task',
						],
						operation: [
							'create',
						],
					},
				},
				default: '',
				required: true,
				description: 'Task content',
			},
			{
				displayName: 'Task ID',
				name: 'taskId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'task',
						],
						operation: [
							'delete',
							'close',
							'get',
							'reopen',
							'update',
						],
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
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
				options: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'A description for the task.',
					},
					{
						displayName: 'Due Date Time',
						name: 'dueDateTime',
						type: 'dateTime',
						default: '',
						description: 'Specific date and time in RFC3339 format in UTC.',
					},
					{
						displayName: 'Due String',
						name: 'dueString',
						type: 'string',
						default: '',
						description: 'Human defined task due date (ex.: “next Monday”, “Tomorrow”). Value is set using local (not UTC) time.',
					},
					{
						displayName: 'Due String Locale',
						name: 'dueLang',
						type: 'string',
						default: '',
						description: '2-letter code specifying language in case due_string is not written in English.',
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
						description: 'Task priority from 1 (normal) to 4 (urgent).',
					},
					{
						displayName: 'Section',
						name: 'section',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getSections',
							loadOptionsDependsOn: [
								'project',
							],
						},
						default: {},
						description: 'The section you want to operate on.',
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
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'task',
						],
						operation: [
							'getAll',
						],
					},
				},
				options: [
					{
						displayName: 'Filter',
						name: 'filter',
						type: 'string',
						default: '',
						description: 'Filter by any <a href="https://get.todoist.help/hc/en-us/articles/205248842">supported filter.</a>',
					},
					{
						displayName: 'IDs',
						name: 'ids',
						type: 'string',
						default: '',
						description: 'A list of the task IDs to retrieve, this should be a comma separated list.',
					},
					{
						displayName: 'Label ID',
						name: 'labelId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getLabels',
						},
						default: {},
						description: 'Filter tasks by label.',
					},
					{
						displayName: 'Lang',
						name: 'lang',
						type: 'string',
						default: '',
						description: 'IETF language tag defining what language filter is written in, if differs from default English',
					},
					{
						displayName: 'Project ID',
						name: 'projectId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getProjects',
						},
						default: '',
						description: 'Filter tasks by project id.',
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
						description: 'A description for the task.',
					},
					{
						displayName: 'Due Date Time',
						name: 'dueDateTime',
						type: 'dateTime',
						default: '',
						description: 'Specific date and time in RFC3339 format in UTC.',
					},
					{
						displayName: 'Due String',
						name: 'dueString',
						type: 'string',
						default: '',
						description: 'Human defined task due date (ex.: “next Monday”, “Tomorrow”). Value is set using local (not UTC) time.',
					},
					{
						displayName: 'Due String Locale',
						name: 'dueLang',
						type: 'string',
						default: '',
						description: '2-letter code specifying language in case due_string is not written in English.',
					},
					{
						displayName: 'Labels',
						name: 'labels',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getLabels',
						},
						default: [],
						required: false,
						description: 'Labels',
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
						description: 'Task priority from 1 (normal) to 4 (urgent).',
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

				const projectId = this.getCurrentNodeParameter('project') as number;
				if (projectId) {
					const qs: IDataObject = {project_id: projectId};
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
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {

			try {
				if (resource === 'task') {
					if (operation === 'create') {
						//https://developer.todoist.com/rest/v1/#create-a-new-task
						const content = this.getNodeParameter('content', i) as string;
						const projectId = this.getNodeParameter('project', i) as number;
						const labels = this.getNodeParameter('labels', i) as number[];
						const options = this.getNodeParameter('options', i) as IDataObject;

						const body: IBodyCreateTask = {
							content,
							project_id: projectId,
							priority: (options.priority!) ? parseInt(options.priority as string, 10) : 1,
						};

						if (options.description) {
							body.description = options.description as string;
						}

						if (options.dueDateTime) {
							body.due_datetime = FormatDueDatetime(options.dueDateTime as string);
						}

						if (options.dueString) {
							body.due_string = options.dueString as string;
						}

						if (options.dueLang) {
							body.due_lang = options.dueLang as string;
						}

						if (labels !== undefined && labels.length !== 0) {
							body.label_ids = labels;
						}

						if (options.section) {
							body.section_id = options.section as number;
						}

						responseData = await todoistApiRequest.call(this, 'POST', '/tasks', body);
					}
					if (operation === 'close') {
						//https://developer.todoist.com/rest/v1/#close-a-task
						const id = this.getNodeParameter('taskId', i) as string;

						responseData = await todoistApiRequest.call(this, 'POST', `/tasks/${id}/close`);

						responseData = { success: true };

					}
					if (operation === 'delete') {
						//https://developer.todoist.com/rest/v1/#delete-a-task
						const id = this.getNodeParameter('taskId', i) as string;

						responseData = await todoistApiRequest.call(this, 'DELETE', `/tasks/${id}`);

						responseData = { success: true };

					}
					if (operation === 'get') {
						//https://developer.todoist.com/rest/v1/#get-an-active-task
						const id = this.getNodeParameter('taskId', i) as string;

						responseData = await todoistApiRequest.call(this, 'GET', `/tasks/${id}`);
					}
					if (operation === 'getAll') {
						//https://developer.todoist.com/rest/v1/#get-active-tasks
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const filters = this.getNodeParameter('filters', i) as IDataObject;
						if (filters.projectId) {
							qs.project_id = filters.projectId as string;
						}
						if (filters.labelId) {
							qs.label_id = filters.labelId as string;
						}
						if (filters.filter) {
							qs.filter = filters.filter as string;
						}
						if (filters.lang) {
							qs.lang = filters.lang as string;
						}
						if (filters.ids) {
							qs.ids = filters.ids as string;
						}

						responseData = await todoistApiRequest.call(this, 'GET', '/tasks', {}, qs);

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = responseData.splice(0, limit);
						}
					}
					if (operation === 'reopen') {
						//https://developer.todoist.com/rest/v1/#get-an-active-task
						const id = this.getNodeParameter('taskId', i) as string;

						responseData = await todoistApiRequest.call(this, 'POST', `/tasks/${id}/reopen`);

						responseData = { success: true };
					}

					if (operation === 'update') {
						//https://developer.todoist.com/rest/v1/#update-a-task
						const id = this.getNodeParameter('taskId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						const body: IBodyCreateTask = {};

						if (updateFields.content) {
							body.content = updateFields.content as string;
						}

						if (updateFields.priority) {
							body.priority = parseInt(updateFields.priority as string, 10);
						}

						if (updateFields.description) {
							body.description = updateFields.description as string;
						}

						if (updateFields.dueDateTime) {
							body.due_datetime = FormatDueDatetime(updateFields.dueDateTime as string);
						}

						if (updateFields.dueString) {
							body.due_string = updateFields.dueString as string;
						}

						if (updateFields.dueLang) {
							body.due_lang = updateFields.dueLang as string;
						}

						if (updateFields.labels !== undefined &&
							Array.isArray(updateFields.labels) &&
							updateFields.labels.length !== 0) {
							body.label_ids = updateFields.labels as number[];
						}

						await todoistApiRequest.call(this, 'POST', `/tasks/${id}`, body);
						responseData = { success: true };
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
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
