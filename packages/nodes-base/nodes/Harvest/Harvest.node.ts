import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	clientFields,
	clientOperations,
} from './ClientDescription';

import {
	contactFields,
	contactOperations,
} from './ContactDescription';

import {
	companyOperations,
} from './CompanyDescription';

import {
	estimateFields,
	estimateOperations,
} from './EstimateDescription';

import {
	expenseFields,
	expenseOperations,
} from './ExpenseDescription';

import {
	getAllResource,
	harvestApiRequest,
} from './GenericFunctions';

import {
	invoiceFields,
	invoiceOperations,
} from './InvoiceDescription';

import {
	projectFields,
	projectOperations,
} from './ProjectDescription';

import {
	taskFields,
	taskOperations,
} from './TaskDescription';

import {
	timeEntryFields,
	timeEntryOperations,
} from './TimeEntryDescription';

import {
	userFields,
	userOperations,
} from './UserDescription';

export class Harvest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Harvest',
		name: 'harvest',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:harvest.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Access data on Harvest',
		defaults: {
			name: 'Harvest',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'harvestApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'accessToken',
						],
					},
				},
			},
			{
				name: 'harvestOAuth2Api',
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
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
			},


			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [

					{
						name: 'Client',
						value: 'client',
					},
					{
						name: 'Company',
						value: 'company',
					},
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Estimate',
						value: 'estimate',
					},
					{
						name: 'Expense',
						value: 'expense',
					},
					{
						name: 'Invoice',
						value: 'invoice',
					},
					{
						name: 'Project',
						value: 'project',
					},
					{
						name: 'Task',
						value: 'task',
					},
					{
						name: 'Time Entry',
						value: 'timeEntry',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'task',
			},

			// operations
			...clientOperations,
			...companyOperations,
			...contactOperations,
			...estimateOperations,
			...expenseOperations,
			...invoiceOperations,
			...projectOperations,
			...taskOperations,
			...timeEntryOperations,
			...userOperations,

			{
				displayName: 'Account Name or ID',
				name: 'accountId',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getAccounts',
				},
				default: '',
			},

			// fields
			...clientFields,
			...contactFields,
			...estimateFields,
			...expenseFields,
			...invoiceFields,
			...projectFields,
			...taskFields,
			...timeEntryFields,
			...userFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available accounts to display them to user so that he can
			// select them easily
			async getAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { accounts } = await harvestApiRequest.call(this, 'GET', {}, '', {}, {}, 'https://id.getharvest.com/api/v2/accounts');
				for (const account of accounts) {
					const accountName = account.name;
					const accountId = account.id;
					returnData.push({
						name: accountName,
						value: accountId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let endpoint = '';
		let requestMethod = '';
		let body: IDataObject | Buffer;
		let qs: IDataObject;

		for (let i = 0; i < items.length; i++) {
			try {
				body = {};
				qs = {};

				if (resource === 'timeEntry') {
					if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						requestMethod = 'GET';
						const id = this.getNodeParameter('id', i) as string;

						endpoint = `time_entries/${id}`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);

					} else if (operation === 'getAll') {
						// ----------------------------------
						//         getAll
						// ----------------------------------
						const responseData: IDataObject[] = await getAllResource.call(this, 'time_entries', i);
						returnData.push.apply(returnData, responseData);

					} else if (operation === 'createByStartEnd') {
						// ----------------------------------
						//         createByStartEnd
						// ----------------------------------

						requestMethod = 'POST';
						endpoint = 'time_entries';

						body.project_id = this.getNodeParameter('projectId', i) as string;
						body.task_id = this.getNodeParameter('taskId', i) as string;
						body.spent_date = this.getNodeParameter('spentDate', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						Object.assign(body, additionalFields);

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
						returnData.push(responseData);

					} else if (operation === 'createByDuration') {
						// ----------------------------------
						//         createByDuration
						// ----------------------------------

						requestMethod = 'POST';
						endpoint = 'time_entries';

						body.project_id = this.getNodeParameter('projectId', i) as string;
						body.task_id = this.getNodeParameter('taskId', i) as string;
						body.spent_date = this.getNodeParameter('spentDate', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						Object.assign(body, additionalFields);

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
						returnData.push(responseData);

					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'DELETE';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `time_entries/${id}`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} else if (operation === 'deleteExternal') {
						// ----------------------------------
						//         deleteExternal
						// ----------------------------------

						requestMethod = 'DELETE';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `time_entries/${id}/external_reference`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);

					} else if (operation === 'restartTime') {
						// ----------------------------------
						//         restartTime
						// ----------------------------------

						requestMethod = 'PATCH';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `time_entries/${id}/restart`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);

					} else if (operation === 'stopTime') {
						// ----------------------------------
						//         stopTime
						// ----------------------------------

						requestMethod = 'PATCH';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `time_entries/${id}/stop`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);

					} else if (operation === 'update') {
						// ----------------------------------
						//         update
						// ----------------------------------

						requestMethod = 'PATCH';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `time_entries/${id}`;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						Object.assign(body, updateFields);
						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
						returnData.push(responseData);

					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`, { itemIndex: i });
					}

				} else if (resource === 'client') {
					if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						requestMethod = 'GET';
						const id = this.getNodeParameter('id', i) as string;

						endpoint = `clients/${id}`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);

					} else if (operation === 'getAll') {
						// ----------------------------------
						//         getAll
						// ----------------------------------

						const responseData: IDataObject[] = await getAllResource.call(this, 'clients', i);
						returnData.push.apply(returnData, responseData);

					} else if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						requestMethod = 'POST';
						endpoint = 'clients';

						body.name = this.getNodeParameter('name', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						Object.assign(body, additionalFields);

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
						returnData.push(responseData);

					} else if (operation === 'update') {
						// ----------------------------------
						//         update
						// ----------------------------------

						requestMethod = 'PATCH';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `clients/${id}`;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						Object.assign(qs, updateFields);

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
						returnData.push(responseData);

					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'DELETE';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `clients/${id}`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} else {
						throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, { itemIndex: i });
					}
				} else if (resource === 'project') {
					if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						requestMethod = 'GET';
						const id = this.getNodeParameter('id', i) as string;

						endpoint = `projects/${id}`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);

					} else if (operation === 'getAll') {
						// ----------------------------------
						//         getAll
						// ----------------------------------

						const responseData: IDataObject[] = await getAllResource.call(this, 'projects', i);
						returnData.push.apply(returnData, responseData);

					} else if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						requestMethod = 'POST';
						endpoint = 'projects';

						body.client_id = this.getNodeParameter('clientId', i) as string;
						body.name = this.getNodeParameter('name', i) as string;
						body.is_billable = this.getNodeParameter('isBillable', i) as string;
						body.bill_by = this.getNodeParameter('billBy', i) as string;
						body.budget_by = this.getNodeParameter('budgetBy', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						Object.assign(body, additionalFields);

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
						returnData.push(responseData);

					} else if (operation === 'update') {
						// ----------------------------------
						//         update
						// ----------------------------------

						requestMethod = 'PATCH';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `projects/${id}`;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						Object.assign(body, updateFields);
						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
						returnData.push(responseData);

					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'DELETE';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `projects/${id}`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} else {
						throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, { itemIndex: i });
					}
				} else if (resource === 'user') {
					if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						requestMethod = 'GET';
						const id = this.getNodeParameter('id', i) as string;

						endpoint = `users/${id}`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);

					} else if (operation === 'getAll') {
						// ----------------------------------
						//         getAll
						// ----------------------------------

						const responseData: IDataObject[] = await getAllResource.call(this, 'users', i);
						returnData.push.apply(returnData, responseData);

					} else if (operation === 'me') {
						// ----------------------------------
						//         me
						// ----------------------------------

						requestMethod = 'GET';

						endpoint = `users/me`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);

					} else if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						requestMethod = 'POST';
						endpoint = 'users';

						body.first_name = this.getNodeParameter('firstName', i) as string;
						body.last_name = this.getNodeParameter('lastName', i) as string;
						body.email = this.getNodeParameter('email', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						Object.assign(body, additionalFields);

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
						returnData.push(responseData);

					} else if (operation === 'update') {
						// ----------------------------------
						//         update
						// ----------------------------------

						requestMethod = 'PATCH';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `users/${id}`;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						Object.assign(qs, updateFields);

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
						returnData.push(responseData);

					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'DELETE';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `users/${id}`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} else {
						throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, { itemIndex: i });
					}
				} else if (resource === 'contact') {
					if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						requestMethod = 'GET';
						const id = this.getNodeParameter('id', i) as string;

						endpoint = `contacts/${id}`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);

					} else if (operation === 'getAll') {
						// ----------------------------------
						//         getAll
						// ----------------------------------

						const responseData: IDataObject[] = await getAllResource.call(this, 'contacts', i);
						returnData.push.apply(returnData, responseData);

					} else if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						requestMethod = 'POST';
						endpoint = 'contacts';

						body.client_id = this.getNodeParameter('clientId', i) as string;
						body.first_name = this.getNodeParameter('firstName', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						Object.assign(body, additionalFields);

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
						returnData.push(responseData);

					} else if (operation === 'update') {
						// ----------------------------------
						//         update
						// ----------------------------------

						requestMethod = 'PATCH';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `contacts/${id}`;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						Object.assign(qs, updateFields);

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
						returnData.push(responseData);

					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'DELETE';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `contacts/${id}`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} else {
						throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, { itemIndex: i });
					}
				} else if (resource === 'company') {
					if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						requestMethod = 'GET';
						endpoint = `company`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);

					} else {
						throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, { itemIndex: i });
					}
				} else if (resource === 'task') {
					if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						requestMethod = 'GET';
						const id = this.getNodeParameter('id', i) as string;

						endpoint = `tasks/${id}`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);

					} else if (operation === 'getAll') {
						// ----------------------------------
						//         getAll
						// ----------------------------------

						const responseData: IDataObject[] = await getAllResource.call(this, 'tasks', i);
						returnData.push.apply(returnData, responseData);

					} else if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						requestMethod = 'POST';
						endpoint = 'tasks';

						body.name = this.getNodeParameter('name', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						Object.assign(body, additionalFields);

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
						returnData.push(responseData);

					} else if (operation === 'update') {
						// ----------------------------------
						//         update
						// ----------------------------------

						requestMethod = 'PATCH';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `tasks/${id}`;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						Object.assign(qs, updateFields);

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
						returnData.push(responseData);

					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'DELETE';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `tasks/${id}`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} else {
						throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, { itemIndex: i });
					}
				} else if (resource === 'invoice') {
					if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						requestMethod = 'GET';
						const id = this.getNodeParameter('id', i) as string;

						endpoint = `invoices/${id}`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);

					} else if (operation === 'getAll') {
						// ----------------------------------
						//         getAll
						// ----------------------------------

						const responseData: IDataObject[] = await getAllResource.call(this, 'invoices', i);
						returnData.push.apply(returnData, responseData);

					} else if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						requestMethod = 'POST';
						endpoint = 'invoices';

						body.client_id = this.getNodeParameter('clientId', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						Object.assign(body, additionalFields);

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
						returnData.push(responseData);

					} else if (operation === 'update') {
						// ----------------------------------
						//         update
						// ----------------------------------

						requestMethod = 'PATCH';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `invoices/${id}`;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						Object.assign(qs, updateFields);

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
						returnData.push(responseData);

					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'DELETE';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `invoices/${id}`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} else {
						throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, { itemIndex: i });
					}
				} else if (resource === 'expense') {
					if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						requestMethod = 'GET';
						const id = this.getNodeParameter('id', i) as string;

						endpoint = `expenses/${id}`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);

					} else if (operation === 'getAll') {
						// ----------------------------------
						//         getAll
						// ----------------------------------

						const responseData: IDataObject[] = await getAllResource.call(this, 'expenses', i);
						returnData.push.apply(returnData, responseData);

					} else if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						requestMethod = 'POST';
						endpoint = 'expenses';

						body.project_id = this.getNodeParameter('projectId', i) as string;
						body.expense_category_id = this.getNodeParameter('expenseCategoryId', i) as string;
						body.spent_date = this.getNodeParameter('spentDate', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						Object.assign(body, additionalFields);

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
						returnData.push(responseData);

					} else if (operation === 'update') {
						// ----------------------------------
						//         update
						// ----------------------------------

						requestMethod = 'PATCH';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `expenses/${id}`;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						Object.assign(qs, updateFields);

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
						returnData.push(responseData);

					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'DELETE';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `expenses/${id}`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} else {
						throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, { itemIndex: i });
					}
				} else if (resource === 'estimate') {
					if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						requestMethod = 'GET';
						const id = this.getNodeParameter('id', i) as string;

						endpoint = `estimates/${id}`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);

					} else if (operation === 'getAll') {
						// ----------------------------------
						//         getAll
						// ----------------------------------

						const responseData: IDataObject[] = await getAllResource.call(this, 'estimates', i);
						returnData.push.apply(returnData, responseData);

					} else if (operation === 'create') {
						// ----------------------------------
						//         create
						// ----------------------------------

						requestMethod = 'POST';
						endpoint = 'estimates';

						body.client_id = this.getNodeParameter('clientId', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						Object.assign(body, additionalFields);

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
						returnData.push(responseData);

					} else if (operation === 'update') {
						// ----------------------------------
						//         update
						// ----------------------------------

						requestMethod = 'PATCH';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `estimates/${id}`;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						Object.assign(qs, updateFields);

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
						returnData.push(responseData);

					} else if (operation === 'delete') {
						// ----------------------------------
						//         delete
						// ----------------------------------

						requestMethod = 'DELETE';
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `estimates/${id}`;

						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} else {
						throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, { itemIndex: i });
					}
				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, { itemIndex: i });
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
