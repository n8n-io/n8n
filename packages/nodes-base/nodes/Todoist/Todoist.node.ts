import {
	IExecuteSingleFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import {
	todoistApiRequest,
} from './GenericFunctions';


interface IBodyCreateTask {
	content: string;
	project_id?: number;
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
		icon: 'file:todoist.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Todoist API',
		defaults: {
			name: 'Todoist',
			color: '#c02428',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'todoistApi',
				required: true,
			}
		],
		properties: [
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
						]
					},
				},
				default: '',
				description: 'The project you want to add the task to.',
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
						]
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
						]
					},
				},
				default: '',
				required: true,
				description: 'Task content',
			},
			{
				displayName: 'Options',
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
						]
					},
				},
				options: [
					{
						displayName: 'Priority',
						name: 'priority',
						type: 'number',
						typeOptions: {
							numberStepSize: 1,
							maxValue: 4,
							minValue: 1,
						},
						default: 1,
						description: 'Task priority from 1 (normal) to 4 (urgent).',
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
				]
			}
		]
	};


	methods = {
		loadOptions: {
			// Get all the available projects to display them to user so that he can
			// select them easily
			async getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let projects;
				try {
					projects = await todoistApiRequest.call(this, '/projects', 'GET');
				} catch (err) {
					throw new Error(`Todoist Error: ${err}`);
				}
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

			// Get all the available labels to display them to user so that he can
			// select them easily
			async getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let labels;
				try {
					labels = await todoistApiRequest.call(this, '/labels', 'GET');
				} catch (err) {
					throw new Error(`Todoist Error: ${err}`);
				}
				for (const label of labels) {
					const labelName = label.name;
					const labelId = label.id;

					returnData.push({
						name: labelName,
						value: labelId,
					});
				}

				return returnData;
			}
		}
	};

	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {

		const resource = this.getNodeParameter('resource') as string;
		const opeation = this.getNodeParameter('operation') as string;
		let response;

		if (resource === 'task' && opeation === 'create') {
			//https://developer.todoist.com/rest/v1/#create-a-new-task
			const content = this.getNodeParameter('content') as string;
			const projectId = this.getNodeParameter('project') as number;
			const labels = this.getNodeParameter('labels') as number[];
			const options = this.getNodeParameter('options') as IDataObject;

			const body: IBodyCreateTask = {
				content,
				project_id: projectId,
				priority: (options.priority!) ? parseInt(options.priority as string, 10) : 1,
			};

			if (options.dueDateTime) {
				body.due_datetime = options.dueDateTime as string;
			}

			if (options.dueString) {
				body.due_string = options.dueString as string;
			}

			if (labels !== undefined && labels.length !== 0) {
				body.label_ids = labels;
			}

			try {
				response = await todoistApiRequest.call(this, '/tasks', 'POST', body);
			} catch (err) {
				throw new Error(`Todoist Error: ${err}`);
			}
		}

		return {
			json: response
		};
	}
}
