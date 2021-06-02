import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	microsoftApiRequest,
	microsoftApiRequestAllItems,
} from './GenericFunctions';

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
			if (resource === 'linkedResource') {

			} else if (resource === 'task') {

			} else if (resource === 'taskList' ) {

				if (operation === 'getAll') {

					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll === true) {
						responseData = await microsoftApiRequestAllItems.call(this, 'value', 'GET', '/todo/lists', undefined, qs);
					} else {
						qs['$top'] = this.getNodeParameter('limit', i) as number;
						responseData = await microsoftApiRequest.call(this, 'GET', '/todo/lists', undefined, qs);
						responseData = responseData.value;
					}

				} else if (operation === 'delete') {

					const taskListId = this.getNodeParameter('taskListId', i) as string;
					responseData = await microsoftApiRequest.call(this, 'DELETE', `/todo/lists/${taskListId}`, undefined, qs);

				} else if (operation === 'get') {

					const taskListId = this.getNodeParameter('taskListId', i) as string;
					responseData = await microsoftApiRequest.call(this, 'GET', `/todo/lists/${taskListId}`, undefined, qs);

				} else if (operation === 'create') {

					const body = {
						displayName:  this.getNodeParameter('displayName', i) as string,
					};

					responseData = await microsoftApiRequest.call(this, 'POST', '/todo/lists/', body, qs);

				} else if (operation === 'update') {

					const taskListId = this.getNodeParameter('taskListId', i) as string;
					const body = {
						displayName : this.getNodeParameter('displayName', i) as string,
					};

					responseData = await microsoftApiRequest.call(this, 'PATCH', `/todo/lists/${taskListId}`, body, qs);

				}

			}
			Array.isArray(responseData)
					? returnData.push(...responseData)
					: returnData.push(responseData);
		}
			return [this.helpers.returnJsonArray(returnData)];

	}
}
