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
	googleApiRequest,
	googleApiRequestAllItems,
} from './GenericFunctions';

import {
	taskFields,
	taskOperations,
} from './TaskDescription';

export class GoogleTasks implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Tasks',
		name: 'googleTasks',
		icon: 'file:googleTasks.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Google Tasks API',
		defaults: {
			name: 'Google Tasks',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleTasksOAuth2Api',
				required: true,
			},
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
					},
				],
				default: 'task',
				description: 'The resource to operate on.',
			},
			...taskOperations,
			...taskFields,
		],
	};
	methods = {
		loadOptions: {
			// Get all the tasklists to display them to user so that he can select them easily

			async getTasks(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const tasks = await googleApiRequestAllItems.call(
					this,
					'items',
					'GET',
					'/tasks/v1/users/@me/lists',
				);
				for (const task of tasks) {
					const taskName = task.title;
					const taskId = task.id;
					returnData.push({
						name: taskName,
						value: taskId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		let body: IDataObject = {};
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'task') {
					if (operation === 'create') {
						body = {};
						//https://developers.google.com/tasks/v1/reference/tasks/insert
						const taskId = this.getNodeParameter('task', i) as string;
						body.title = this.getNodeParameter('title', i) as string;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;

						if (additionalFields.parent) {
							qs.parent = additionalFields.parent as string;
						}
						if (additionalFields.previous) {
							qs.previous = additionalFields.previous as string;
						}

						if (additionalFields.status) {
							body.status = additionalFields.status as string;
						}

						if (additionalFields.notes) {
							body.notes = additionalFields.notes as string;
						}
						if (additionalFields.dueDate) {
							body.due = additionalFields.dueDate as string;
						}

						if (additionalFields.completed) {
							body.completed = additionalFields.completed as string;
						}

						if (additionalFields.deleted) {
							body.deleted = additionalFields.deleted as boolean;
						}

						responseData = await googleApiRequest.call(
							this,
							'POST',
							`/tasks/v1/lists/${taskId}/tasks`,
							body,
							qs,
						);
					}
					if (operation === 'delete') {
						//https://developers.google.com/tasks/v1/reference/tasks/delete
						const taskListId = this.getNodeParameter('task', i) as string;
						const taskId = this.getNodeParameter('taskId', i) as string;

						responseData = await googleApiRequest.call(
							this,
							'DELETE',
							`/tasks/v1/lists/${taskListId}/tasks/${taskId}`,
							{},
						);
						responseData = { success: true };
					}
					if (operation === 'get') {
						//https://developers.google.com/tasks/v1/reference/tasks/get
						const taskListId = this.getNodeParameter('task', i) as string;
						const taskId = this.getNodeParameter('taskId', i) as string;
						responseData = await googleApiRequest.call(
							this,
							'GET',
							`/tasks/v1/lists/${taskListId}/tasks/${taskId}`,
							{},
							qs,
						);
					}
					if (operation === 'getAll') {
						//https://developers.google.com/tasks/v1/reference/tasks/list
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const taskListId = this.getNodeParameter('task', i) as string;
						const options = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;
						if (options.completedMax) {
							qs.completedMax = options.completedMax as string;
						}
						if (options.completedMin) {
							qs.completedMin = options.completedMin as string;
						}
						if (options.dueMin) {
							qs.dueMin = options.dueMin as string;
						}
						if (options.dueMax) {
							qs.dueMax = options.dueMax as string;
						}
						if (options.showCompleted) {
							qs.showCompleted = options.showCompleted as boolean;
						}
						if (options.showDeleted) {
							qs.showDeleted = options.showDeleted as boolean;
						}
						if (options.showHidden) {
							qs.showHidden = options.showHidden as boolean;
						}
						if (options.updatedMin) {
							qs.updatedMin = options.updatedMin as string;
						}

						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'items',
								'GET',
								`/tasks/v1/lists/${taskListId}/tasks`,
								{},
								qs,
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i) as number;
							responseData = await googleApiRequest.call(
								this,
								'GET',
								`/tasks/v1/lists/${taskListId}/tasks`,
								{},
								qs,
							);
							responseData = responseData.items;
						}
					}
					if (operation === 'update') {
						body = {};
						//https://developers.google.com/tasks/v1/reference/tasks/patch
						const taskListId = this.getNodeParameter('task', i) as string;
						const taskId = this.getNodeParameter('taskId', i) as string;
						const updateFields = this.getNodeParameter(
							'updateFields',
							i,
						) as IDataObject;

						if (updateFields.previous) {
							qs.previous = updateFields.previous as string;
						}

						if (updateFields.status) {
							body.status = updateFields.status as string;
						}

						if (updateFields.notes) {
							body.notes = updateFields.notes as string;
						}

						if (updateFields.title) {
							body.title = updateFields.title as string;
						}

						if (updateFields.dueDate) {
							body.due = updateFields.dueDate as string;
						}

						if (updateFields.completed) {
							body.completed = updateFields.completed as string;
						}

						if (updateFields.deleted) {
							body.deleted = updateFields.deleted as boolean;
						}

						responseData = await googleApiRequest.call(
							this,
							'PATCH',
							`/tasks/v1/lists/${taskListId}/tasks/${taskId}`,
							body,
							qs,
						);
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else if (responseData !== undefined) {
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
