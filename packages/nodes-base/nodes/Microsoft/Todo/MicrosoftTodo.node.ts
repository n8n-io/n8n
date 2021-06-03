import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	microsoftApiRequest,
	microsoftApiRequestAllItems,
} from './GenericFunctions';

import {
	linkedResourceFields,
	linkedResourceOperations,
} from './LinkedResourceDescription';

import {
	taskFields,
	taskOperations,
} from './TaskDescription';

import {
	taskListFields,
	taskListOperations,
} from './TaskListDescription';


export class MicrosoftTodo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Todo',
		name: 'microsoftTodo',
		icon: 'file:todo.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Microsoft Todo API.',
		defaults: {
			name: 'Microsoft Todo',
			color: '#0078D7',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'microsoftTodoOAuth2Api',
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
						name: 'Linked Resource',
						value: 'linkedResource',
					},
					{
						name: 'Task',
						value: 'task',
					},
					{
						name: 'Task List',
						value: 'taskList',
					},
				],
				default: 'task',
				description: 'The resource to operate on.',
			},
			...linkedResourceOperations,
			...linkedResourceFields,
			...taskOperations,
			...taskFields,
			...taskListOperations,
			...taskListFields,
		],
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

				if (resource === 'linkedResource') {
					// https://docs.microsoft.com/en-us/graph/api/todotask-post-linkedresources?view=graph-rest-1.0&tabs=http
					if (operation === 'create') {

						const taskListId = this.getNodeParameter('taskListId', i) as string;
						const taskId = this.getNodeParameter('taskId', i) as string;
						const body: IDataObject = {
							applicationName:  this.getNodeParameter('applicationName', i) as string,
							...this.getNodeParameter('additionalFields', i) as IDataObject[],
						};

						responseData = await microsoftApiRequest.call(this, 'POST', `/todo/lists/${taskListId}/tasks/${taskId}/linkedResources`, body, qs);

					// https://docs.microsoft.com/en-us/graph/api/linkedresource-delete?view=graph-rest-1.0&tabs=http
					} else if (operation === 'delete') {

						const taskListId = this.getNodeParameter('taskListId', i) as string;
						const taskId = this.getNodeParameter('taskId', i) as string;
						const linkedResourceId = this.getNodeParameter('linkedResourceId', i) as string;

						responseData = await microsoftApiRequest.call(this, 'DELETE', `/todo/lists/${taskListId}/tasks/${taskId}/linkedResources/${linkedResourceId}`, undefined, qs);
						responseData = { success: true };

						// https://docs.microsoft.com/en-us/graph/api/linkedresource-get?view=graph-rest-1.0&tabs=http
					} else if (operation === 'get') {

						const taskListId = this.getNodeParameter('taskListId', i) as string;
						const taskId = this.getNodeParameter('taskId', i) as string;
						const linkedResourceId = this.getNodeParameter('linkedResourceId', i) as string;

						responseData = await microsoftApiRequest.call(this, 'GET', `/todo/lists/${taskListId}/tasks/${taskId}/linkedResources/${linkedResourceId}`, undefined, qs);

					// https://docs.microsoft.com/en-us/graph/api/todotask-list-linkedresources?view=graph-rest-1.0&tabs=http
					} else if (operation === 'getAll') {

						const taskListId = this.getNodeParameter('taskListId', i) as string;
						const taskId = this.getNodeParameter('taskId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll === true) {
							responseData = await microsoftApiRequestAllItems.call(this, 'value', 'GET', `/todo/lists/${taskListId}/tasks/${taskId}/linkedResources`, undefined, qs);
						} else {
							qs['$top'] = this.getNodeParameter('limit', i) as number;
							responseData = await microsoftApiRequest.call(this, 'GET', `/todo/lists/${taskListId}/tasks/${taskId}/linkedResources`, undefined, qs);
							responseData = responseData.value;
						}

					// https://docs.microsoft.com/en-us/graph/api/linkedresource-update?view=graph-rest-1.0&tabs=http
					} else if (operation === 'update') {

						const taskListId = this.getNodeParameter('taskListId', i) as string;
						const taskId = this.getNodeParameter('taskId', i) as string;
						const linkedResourceId = this.getNodeParameter('linkedResourceId', i) as string;

						const body: IDataObject = {
							applicationName:  this.getNodeParameter('applicationName', i) as string,
							...this.getNodeParameter('updateFields', i) as IDataObject[],
						};

						responseData = await microsoftApiRequest.call(this, 'PATCH', `/todo/lists/${taskListId}/tasks/${taskId}/linkedResources/${linkedResourceId}`, body, qs);


					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported!`);
					}
				} else if (resource === 'task') {

					// https://docs.microsoft.com/en-us/graph/api/todotasklist-post-tasks?view=graph-rest-1.0&tabs=http
					if (operation === 'create') {

						const taskListId = this.getNodeParameter('taskListId', i) as string;
						const body: IDataObject = {
							title:  this.getNodeParameter('title', i) as string,
							...this.getNodeParameter('additionalFields', i) as IDataObject[],
						};

						if (body.bodyUI) {
							body.body = (body.bodyUI as IDataObject).body;
							delete body.bodyUI;
						}
						responseData = await microsoftApiRequest.call(this, 'POST', `/todo/lists/${taskListId}/tasks`, body, qs);

					// https://docs.microsoft.com/en-us/graph/api/todotask-delete?view=graph-rest-1.0&tabs=http
					} else if (operation === 'delete') {

						const taskListId = this.getNodeParameter('taskListId', i) as string;
						const taskId = this.getNodeParameter('taskId', i) as string;

						responseData = await microsoftApiRequest.call(this, 'DELETE', `/todo/lists/${taskListId}/tasks/${taskId}`, undefined, qs);
						responseData = { success: true };

						// https://docs.microsoft.com/en-us/graph/api/todotask-get?view=graph-rest-1.0&tabs=http
					} else if (operation === 'get') {

						const taskListId = this.getNodeParameter('taskListId', i) as string;
						const taskId = this.getNodeParameter('taskId', i) as string;

						responseData = await microsoftApiRequest.call(this, 'GET', `/todo/lists/${taskListId}/tasks/${taskId}`, undefined, qs);

					// https://docs.microsoft.com/en-us/graph/api/todotasklist-list-tasks?view=graph-rest-1.0&tabs=http
					} else if (operation === 'getAll') {

						const taskListId = this.getNodeParameter('taskListId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll === true) {
							responseData = await microsoftApiRequestAllItems.call(this, 'value', 'GET', `/todo/lists/${taskListId}/tasks/`, undefined, qs);
						} else {
							qs['$top'] = this.getNodeParameter('limit', i) as number;
							responseData = await microsoftApiRequest.call(this, 'GET', `/todo/lists/${taskListId}/tasks/`, undefined, qs);
							responseData = responseData.value;
						}

					// https://docs.microsoft.com/en-us/graph/api/todotask-update?view=graph-rest-1.0&tabs=http
					} else if (operation === 'update') {

						const taskListId = this.getNodeParameter('taskListId', i) as string;
						const taskId = this.getNodeParameter('taskId', i) as string;
						const body: IDataObject = {
							title:  this.getNodeParameter('title', i) as string,
							...this.getNodeParameter('updateFields', i) as IDataObject[],
						};

						if (body.bodyUI) {
							body.body = (body.bodyUI as IDataObject).body;
							delete body.bodyUI;
						}

						responseData = await microsoftApiRequest.call(this, 'PATCH', `/todo/lists/${taskListId}/tasks/${taskId}`, body, qs);

					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported!`);
					}

				} else if (resource === 'taskList' ) {

					// https://docs.microsoft.com/en-us/graph/api/todo-post-lists?view=graph-rest-1.0&tabs=http
					if (operation === 'create') {

						const body = {
							displayName:  this.getNodeParameter('displayName', i) as string,
						};

						responseData = await microsoftApiRequest.call(this, 'POST', '/todo/lists/', body, qs);

					// https://docs.microsoft.com/en-us/graph/api/todotasklist-delete?view=graph-rest-1.0&tabs=http
					} else if (operation === 'delete') {

						const taskListId = this.getNodeParameter('taskListId', i) as string;
						responseData = await microsoftApiRequest.call(this, 'DELETE', `/todo/lists/${taskListId}`, undefined, qs);
						responseData = { success: true };

						//https://docs.microsoft.com/en-us/graph/api/todotasklist-get?view=graph-rest-1.0&tabs=http
					} else if (operation === 'get') {

						const taskListId = this.getNodeParameter('taskListId', i) as string;
						responseData = await microsoftApiRequest.call(this, 'GET', `/todo/lists/${taskListId}`, undefined, qs);

					// https://docs.microsoft.com/en-us/graph/api/todo-list-lists?view=graph-rest-1.0&tabs=http
					} else if (operation === 'getAll') {

						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						if (returnAll === true) {
							responseData = await microsoftApiRequestAllItems.call(this, 'value', 'GET', '/todo/lists', undefined, qs);
						} else {
							qs['$top'] = this.getNodeParameter('limit', i) as number;
							responseData = await microsoftApiRequest.call(this, 'GET', '/todo/lists', undefined, qs);
							responseData = responseData.value;
						}

					// https://docs.microsoft.com/en-us/graph/api/todotasklist-update?view=graph-rest-1.0&tabs=http
					} else if (operation === 'update') {

						const taskListId = this.getNodeParameter('taskListId', i) as string;
						const body = {
							displayName : this.getNodeParameter('displayName', i) as string,
						};

						responseData = await microsoftApiRequest.call(this, 'PATCH', `/todo/lists/${taskListId}`, body, qs);

					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported!`);
					}

				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
				Array.isArray(responseData)
					? returnData.push(...responseData)
					: returnData.push(responseData);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
