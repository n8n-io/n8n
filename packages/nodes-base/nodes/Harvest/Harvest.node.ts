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
				],
				default: 'timeEntry',
				description: 'The resource to operate on.',
			},

			// operations
			...timeEntryOperations,

			// fields
			...timeEntryFields
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

			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}

}
