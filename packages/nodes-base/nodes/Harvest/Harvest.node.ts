import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';

import { harvestApiRequest } from './GenericFunctions';
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
						name: 'Time Entries',
						value: 'timeEntry',
					},
					{
						name: "Client",
						value: "client"
					},
					{
						name: "Project",
						value: "project"
					},
					{
						name: "Contact",
						value: "contact"
					},
					{
						name: "Company",
						value: "company"
					},
					{
						name: "Invoice",
						value: "invoice"
					},
					{
						name: "Task",
						value: "task"
					},
					{
						name: "User",
						value: "user"
					},
					{
						name: "Expense",
						value: "expense"
					},
					{
						name: "Estimates",
						value: "estimate"
					}
				],
				default: 'user',
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

			if (resource === 'timeEntry') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `time_entries/${id}`;

					try {
						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					requestMethod = 'GET';

					endpoint = 'time_entries';

					const additionalFields = this.getNodeParameter('filters', i) as IDataObject;
					const limit = this.getNodeParameter('limit', i) as string;
					qs.per_page = limit;
					Object.assign(qs, additionalFields);

					try {
						let responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push.apply(returnData, responseData.time_entries as IDataObject[]);
					} catch (error) {
						throw error;
					}

				} else if (operation === 'createByStartEnd') {
					// ----------------------------------
					//         createByStartEnd
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = 'time_entries';

					const createFields = this.getNodeParameter('createFields', i) as IDataObject;

					Object.assign(qs, createFields);

					try {
						let responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}

				} else if (operation === 'createByDuration') {
					// ----------------------------------
					//         createByDuration
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = 'time_entries';

					const createFields = this.getNodeParameter('createFields', i) as IDataObject;

					Object.assign(qs, createFields);

					try {
						let responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}

				} else if (operation === 'delete') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					requestMethod = 'DELETE';
					const id = this.getNodeParameter('id', i) as string;
					endpoint = `time_entries/${id}`;

					try {
						let responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}
				} else if (operation === 'deleteExternal') {
					// ----------------------------------
					//         deleteExternal
					// ----------------------------------

					requestMethod = 'DELETE';
					const id = this.getNodeParameter('id', i) as string;
					endpoint = `time_entries/${id}/external_reference`;

					try {
						let responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}

				} else if (operation === 'restartTime') {
					// ----------------------------------
					//         restartTime
					// ----------------------------------

					requestMethod = 'PATCH';
					const id = this.getNodeParameter('id', i) as string;
					endpoint = `time_entries/${id}/restart`;

					try {
						let responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}

				} else if (operation === 'stopTime') {
					// ----------------------------------
					//         stopTime
					// ----------------------------------

					requestMethod = 'PATCH';
					const id = this.getNodeParameter('id', i) as string;
					endpoint = `time_entries/${id}/stop`;

					try {
						let responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}

				} else if (operation === 'update') {
					// ----------------------------------
					//         update
					// ----------------------------------

					requestMethod = 'PATCH';
					const id = this.getNodeParameter('id', i) as string;
					endpoint = `time_entries/${id}`;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					Object.assign(qs, updateFields);
					try {
						let responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}

				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}

			} else if (resource === 'client') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `clients/${id}`;

					try {
						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					requestMethod = 'GET';

					endpoint = 'clients';

					const additionalFields = this.getNodeParameter('filters', i) as IDataObject;
					const limit = this.getNodeParameter('limit', i) as string;
					qs.per_page = limit;
					Object.assign(qs, additionalFields);

					try {
						let responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push.apply(returnData, responseData.clients as IDataObject[]);
					} catch (error) {
						throw error;
					}

				} else {
					throw new Error(`The resource "${resource}" is not known!`);
				}
			} else if (resource === 'project') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `projects/${id}`;

					try {
						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					requestMethod = 'GET';

					endpoint = 'projects';

					const additionalFields = this.getNodeParameter('filters', i) as IDataObject;
					const limit = this.getNodeParameter('limit', i) as string;
					qs.per_page = limit;
					Object.assign(qs, additionalFields);

					try {
						let responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push.apply(returnData, responseData.projects as IDataObject[]);
					} catch (error) {
						throw error;
					}

				} else {
					throw new Error(`The resource "${resource}" is not known!`);
				}
			} else if (resource === 'user') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `users/${id}`;

					try {
						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					requestMethod = 'GET';

					endpoint = 'users';

					const additionalFields = this.getNodeParameter('filters', i) as IDataObject;
					const limit = this.getNodeParameter('limit', i) as string;
					qs.per_page = limit;
					Object.assign(qs, additionalFields);

					try {
						let responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push.apply(returnData, responseData.users as IDataObject[]);
					} catch (error) {
						throw error;
					}

				} else if (operation === 'me') {
					// ----------------------------------
					//         me
					// ----------------------------------

					requestMethod = 'GET';

					endpoint = 'users/me';

					try {
						let responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}

				} else {
					throw new Error(`The resource "${resource}" is not known!`);
				}
			} else if (resource === 'contact') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `contacts/${id}`;

					try {
						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					requestMethod = 'GET';

					endpoint = 'contacts';

					const additionalFields = this.getNodeParameter('filters', i) as IDataObject;
					const limit = this.getNodeParameter('limit', i) as string;
					qs.per_page = limit;
					Object.assign(qs, additionalFields);

					try {
						let responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push.apply(returnData, responseData.contacts as IDataObject[]);
					} catch (error) {
						throw error;
					}

				} else {
					throw new Error(`The resource "${resource}" is not known!`);
				}
			} else if (resource === 'company') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					endpoint = `company`;

					try {
						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}

				} else {
					throw new Error(`The resource "${resource}" is not known!`);
				}
			} else if (resource === 'task') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `tasks/${id}`;

					try {
						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					requestMethod = 'GET';

					endpoint = 'tasks';

					const additionalFields = this.getNodeParameter('filters', i) as IDataObject;
					const limit = this.getNodeParameter('limit', i) as string;
					qs.per_page = limit;
					Object.assign(qs, additionalFields);

					try {
						let responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push.apply(returnData, responseData.companies as IDataObject[]);
					} catch (error) {
						throw error;
					}

				} else {
					throw new Error(`The resource "${resource}" is not known!`);
				}
			} else if (resource === 'invoice') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `invoices/${id}`;

					try {
						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					requestMethod = 'GET';

					endpoint = 'invoices';

					const additionalFields = this.getNodeParameter('filters', i) as IDataObject;
					const limit = this.getNodeParameter('limit', i) as string;
					qs.per_page = limit;
					Object.assign(qs, additionalFields);

					try {
						let responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push.apply(returnData, responseData.invoices as IDataObject[]);
					} catch (error) {
						throw error;
					}

				} else {
					throw new Error(`The resource "${resource}" is not known!`);
				}
			} else if (resource === 'expense') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `expenses/${id}`;

					try {
						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					requestMethod = 'GET';

					endpoint = 'expenses';

					const additionalFields = this.getNodeParameter('filters', i) as IDataObject;
					const limit = this.getNodeParameter('limit', i) as string;
					qs.per_page = limit;
					Object.assign(qs, additionalFields);

					try {
						let responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push.apply(returnData, responseData.expenses as IDataObject[]);
					} catch (error) {
						throw error;
					}

				} else {
					throw new Error(`The resource "${resource}" is not known!`);
				}
			} else if (resource === 'estimate') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					const id = this.getNodeParameter('id', i) as string;

					endpoint = `estimates/${id}`;

					try {
						const responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData);
					} catch (error) {
						throw error;
					}

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					requestMethod = 'GET';

					endpoint = 'estimates';

					const additionalFields = this.getNodeParameter('filters', i) as IDataObject;
					const limit = this.getNodeParameter('limit', i) as string;
					qs.per_page = limit;
					Object.assign(qs, additionalFields);

					try {
						let responseData = await harvestApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push.apply(returnData, responseData.estimates as IDataObject[]);
					} catch (error) {
						throw error;
					}

				} else {
					throw new Error(`The resource "${resource}" is not known!`);
				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}

}
