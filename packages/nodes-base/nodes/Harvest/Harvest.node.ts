import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';

import { harvestApiRequest, harvestApiRequestAllItems } from './GenericFunctions';
import { timeEntryOperations, timeEntryFields } from './TimeEntryDescription';
import { clientOperations, clientFields } from './ClientDescription';
import { companyOperations } from './CompanyDescription';
import { contactOperations, contactFields } from './ContactDescription';
import { expenseOperations, expenseFields } from './ExpenseDescription';
import { invoiceOperations, invoiceFields } from './InvoiceDescription';
import { projectOperations, projectFields } from './ProjectDescription';
import { taskOperations, taskFields } from './TaskDescription';
import { userOperations, userFields } from './UserDescription';
import { estimateOperations, estimateFields } from './EstimateDescription';

/**
 * fetch All resource using paginated calls
 */
async function getAllResource(this: IExecuteFunctions, resource: string, i: number) {
	const endpoint = resource;
	const qs: IDataObject = {};
	const requestMethod = 'GET';

	qs.per_page = 100;

	const additionalFields = this.getNodeParameter('filters', i) as IDataObject;
	const returnAll = this.getNodeParameter('returnAll', i) as boolean;
	Object.assign(qs, additionalFields);

	let responseData: IDataObject = {};
	if(returnAll) {
		responseData[resource] = await harvestApiRequestAllItems.call(this, requestMethod, qs, endpoint, resource);
	} else {
		const limit = this.getNodeParameter('limit', i) as string;
		qs.per_page = limit;
		responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
	}
	return responseData[resource] as IDataObject[];
}

export class Harvest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Harvest',
		name: 'harvest',
		icon: 'file:harvest.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Access data on Harvest',
		defaults: {
			name: 'Harvest',
			color: '#22BB44',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'harvestApi',
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
						name: 'Client',
						value: 'clients',
					},
					{
						name: 'Company',
						value: 'companies',
					},
					{
						name: 'Contact',
						value: 'contacts',
					},
					{
						name: 'Estimates',
						value: 'estimates',
					},
					{
						name: 'Expense',
						value: 'expenses',
					},
					{
						name: 'Invoice',
						value: 'invoices',
					},
					{
						name: 'Project',
						value: 'projects',
					},
					{
						name: 'Task',
						value: 'tasks',
					},
					{
						name: 'Time Entries',
						value: 'time_entries',
					},
					{
						name: 'User',
						value: 'users',
					},
				],
				default: 'tasks',
				description: 'The resource to operate on.',
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

			// fields
			...clientFields,
			...contactFields,
			...estimateFields,
			...expenseFields,
			...invoiceFields,
			...projectFields,
			...taskFields,
			...timeEntryFields,
			...userFields
		]
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
			body = {};
			qs = {};

			if (resource === 'time_entries') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `${resource}/${id}`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------
					const responseData: IDataObject[] = await getAllResource.call(this, resource, i);
					returnData.push.apply(returnData, responseData);

				} else if (operation === 'createByStartEnd') {
					// ----------------------------------
					//         createByStartEnd
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = resource;

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
					endpoint = resource;

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
					endpoint = `${resource}/${id}`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);
				} else if (operation === 'deleteExternal') {
					// ----------------------------------
					//         deleteExternal
					// ----------------------------------

					requestMethod = 'DELETE';
					const id = this.getNodeParameter('id', i) as string;
					endpoint = `${resource}/${id}/external_reference`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);

				} else if (operation === 'restartTime') {
					// ----------------------------------
					//         restartTime
					// ----------------------------------

					requestMethod = 'PATCH';
					const id = this.getNodeParameter('id', i) as string;
					endpoint = `${resource}/${id}/restart`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);

				} else if (operation === 'stopTime') {
					// ----------------------------------
					//         stopTime
					// ----------------------------------

					requestMethod = 'PATCH';
					const id = this.getNodeParameter('id', i) as string;
					endpoint = `${resource}/${id}/stop`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);

				} else if (operation === 'update') {
					// ----------------------------------
					//         update
					// ----------------------------------

					requestMethod = 'PATCH';
					const id = this.getNodeParameter('id', i) as string;
					endpoint = `${resource}/${id}`;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					Object.assign(body, updateFields);
					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
					returnData.push(responseData);

				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}

			} else if (resource === 'clients') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `${resource}/${id}`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					const responseData: IDataObject[] = await getAllResource.call(this, resource, i);
					returnData.push.apply(returnData, responseData);

				} else if (operation === 'delete') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					requestMethod = 'DELETE';
					const id = this.getNodeParameter('id', i) as string;
					endpoint = `${resource}/${id}`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);
				} else {
					throw new Error(`The resource "${resource}" is not known!`);
				}
			} else if (resource === 'projects') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `${resource}/${id}`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					const responseData: IDataObject[] = await getAllResource.call(this, resource, i);
					returnData.push.apply(returnData, responseData);

				}   else if (operation === 'create') {
					// ----------------------------------
					//         create
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = resource;

					body.client_id = this.getNodeParameter('client_id', i) as string;
					body.name = this.getNodeParameter('name', i) as string;
					body.is_billable = this.getNodeParameter('is_billable', i) as string;
					body.bill_by = this.getNodeParameter('bill_by', i) as string;
					body.budget_by = this.getNodeParameter('budget_by', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(body, additionalFields);

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
					returnData.push(responseData);

				}  else if (operation === 'update') {
					// ----------------------------------
					//         update
					// ----------------------------------

					requestMethod = 'PATCH';
					const id = this.getNodeParameter('id', i) as string;
					endpoint = `${resource}/${id}`;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					Object.assign(body, updateFields);
					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
					returnData.push(responseData);

				}  else if (operation === 'delete') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					requestMethod = 'DELETE';
					const id = this.getNodeParameter('id', i) as string;
					endpoint = `${resource}/${id}`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);
				} else {
					throw new Error(`The resource "${resource}" is not known!`);
				}
			} else if (resource === 'users') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `${resource}/${id}`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					const responseData: IDataObject[] = await getAllResource.call(this, resource, i);
					returnData.push.apply(returnData, responseData);

				} else if (operation === 'me') {
					// ----------------------------------
					//         me
					// ----------------------------------

					requestMethod = 'GET';

					endpoint = `${resource}/me`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);

				} else if (operation === 'create') {
					// ----------------------------------
					//         createByDuration
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = resource;

					body.first_name = this.getNodeParameter('first_name', i) as string;
					body.last_name = this.getNodeParameter('last_name', i) as string;
					body.email = this.getNodeParameter('email', i) as string;


					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(body, additionalFields);

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
					returnData.push(responseData);

				}  else if (operation === 'update') {
					// ----------------------------------
					//         createByDuration
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = resource;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					Object.assign(qs, updateFields);

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
					returnData.push(responseData);

				}  else if (operation === 'delete') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					requestMethod = 'DELETE';
					const id = this.getNodeParameter('id', i) as string;
					endpoint = `${resource}/${id}`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);
				}  else {
					throw new Error(`The resource "${resource}" is not known!`);
				}
			} else if (resource === 'contacts') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `${resource}/${id}`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					const responseData: IDataObject[] = await getAllResource.call(this, resource, i);
					returnData.push.apply(returnData, responseData);

				} else if (operation === 'delete') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					requestMethod = 'DELETE';
					const id = this.getNodeParameter('id', i) as string;
					endpoint = `${resource}/${id}`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);
				}  else {
					throw new Error(`The resource "${resource}" is not known!`);
				}
			} else if (resource === 'companies') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					endpoint = `company`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);

				} else {
					throw new Error(`The resource "${resource}" is not known!`);
				}
			} else if (resource === 'tasks') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `${resource}/${id}`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					const responseData: IDataObject[] = await getAllResource.call(this, resource, i);
					returnData.push.apply(returnData, responseData);

				}  else if (operation === 'delete') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					requestMethod = 'DELETE';
					const id = this.getNodeParameter('id', i) as string;
					endpoint = `${resource}/${id}`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);
				} else {
					throw new Error(`The resource "${resource}" is not known!`);
				}
			} else if (resource === 'invoices') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `${resource}/${id}`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					const responseData: IDataObject[] = await getAllResource.call(this, resource, i);
					returnData.push.apply(returnData, responseData);

				}  else if (operation === 'create') {
					// ----------------------------------
					//         create
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = resource;

					body.client_id = this.getNodeParameter('client_id', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(body, additionalFields);

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
					returnData.push(responseData);

				}  else if (operation === 'update') {
					// ----------------------------------
					//         createByDuration
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = resource;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					Object.assign(qs, updateFields);

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint, body);
					returnData.push(responseData);

				}  else if (operation === 'delete') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					requestMethod = 'DELETE';
					const id = this.getNodeParameter('id', i) as string;
					endpoint = `${resource}/${id}`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);
				}  else {
					throw new Error(`The resource "${resource}" is not known!`);
				}
			} else if (resource === 'expenses') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `${resource}/${id}`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					const responseData: IDataObject[] = await getAllResource.call(this, resource, i);
					returnData.push.apply(returnData, responseData);

				} else if (operation === 'delete') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					requestMethod = 'DELETE';
					const id = this.getNodeParameter('id', i) as string;
					endpoint = `${resource}/${id}`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);
				}  else {
					throw new Error(`The resource "${resource}" is not known!`);
				}
			} else if (resource === 'estimates') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `${resource}/${id}`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					const responseData: IDataObject[] = await getAllResource.call(this, resource, i);
					returnData.push.apply(returnData, responseData);

				} else if (operation === 'delete') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					requestMethod = 'DELETE';
					const id = this.getNodeParameter('id', i) as string;
					endpoint = `${resource}/${id}`;

					const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
					returnData.push(responseData);
				}  else {
					throw new Error(`The resource "${resource}" is not known!`);
				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}

}
