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
	apiRequest,
	apiRequestAllItems,
	downloadRecordAttachments,
} from './GenericFunctions';

import {
	operationFields
} from './OperationDescription';

export class NocoDB implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'NocoDB',
		name: 'nocoDb',
		icon: 'file:nocodb.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Read, update, write and delete data from NocoDB',
		defaults: {
			name: 'NocoDB',
			color: '#0989ff',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'nocoDb',
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
						name: 'Row',
						value: 'row',
					},
				],
				default: 'row',
				description: 'The Resource to operate on',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'row',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a row',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a row',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Retrieve all rows',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve a row',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a row',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},
			...operationFields,
		],
	};

	

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const projectId = this.getNodeParameter('projectId', 0) as string;
		const table = encodeURI(this.getNodeParameter('table', 0) as string);

		let returnAll = false;
		let endpoint = '';
		let requestMethod = '';

		const body: IDataObject = {};
		let qs: IDataObject = {};

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'row') {

					if (operation === 'create') {

						requestMethod = 'POST';
						endpoint = `/nc/${projectId}/api/v1/${table}`;

						const body: IDataObject = {};

						const dataToSend = this.getNodeParameter('dataToSend', 0) as 'defineBelow' | 'autoMapInputData';

						if (dataToSend === 'autoMapInputData') {
							const incomingKeys = Object.keys(items[i].json);
							const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
							const inputDataToIgnore = rawInputsToIgnore.split(',').map(c => c.trim());

							for (const key of incomingKeys) {
								if (inputDataToIgnore.includes(key)) continue;
								body[key] = items[i].json[key];
							}
						} else {
							const fields = this.getNodeParameter('fieldsUi.fieldValues', i, []) as Array<{
								fieldName: string;
								fieldValue: string;
							}>;

							for (const field of fields) {
								body[field.fieldName] = field.fieldValue;
							}
						}

						responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
						returnData.push(responseData);

					} else if (operation === 'delete') {

						const id = this.getNodeParameter('id', i) as string;
						requestMethod = 'DELETE';
						endpoint = `/nc/${projectId}/api/v1/${table}/${id}`;

						responseData = await apiRequest.call(this, requestMethod, endpoint, {}, qs);
						responseData = { success: true };
						returnData.push(responseData);

					} else if (operation === 'getAll') {

						requestMethod = 'GET';
						endpoint = `/nc/${projectId}/api/v1/${table}`;

						returnAll = this.getNodeParameter('returnAll', 0) as boolean;
						const downloadAttachments = this.getNodeParameter('downloadAttachments', 0) as boolean;
						qs = this.getNodeParameter('options', 0, {}) as IDataObject;

						if ( qs.sort ) {
							const properties = (qs.sort as IDataObject).property as Array<{field: string, direction: string}>;
							qs.sort = properties.map(prop => `${prop.direction === 'asc' ? '':'-'}${prop.field}`).join(',');
						}

						if ( qs.fields ) {
							qs.fields = (qs.fields as IDataObject[]).join(',');
						}

						if (returnAll === true) {
							responseData = await apiRequestAllItems.call(this, requestMethod, endpoint, body, qs);

						} else {
							qs.limit = this.getNodeParameter('limit', 0) as number;
							responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
						}

						returnData.push.apply(returnData, responseData);

						if (downloadAttachments === true) {
							const downloadFieldNames = (this.getNodeParameter('downloadFieldNames', 0) as string).split(',');
							const data = await downloadRecordAttachments.call(this, responseData, downloadFieldNames);
							return [data];
						}

					} else if (operation === 'get') {

						const id = this.getNodeParameter('id', i) as string;
						requestMethod = 'GET';
						endpoint = `/nc/${projectId}/api/v1/${table}/${id}`;

						responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
						returnData.push(responseData);

					} else if (operation === 'update') {

						const id = this.getNodeParameter('id', i) as string;
						requestMethod = 'PUT';
						endpoint = `/nc/${projectId}/api/v1/${table}/${id}`;

						const dataToSend = this.getNodeParameter('dataToSend', 0) as 'defineBelow' | 'autoMapInputData';

						if (dataToSend === 'autoMapInputData') {
							const incomingKeys = Object.keys(items[i].json);
							const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
							const inputDataToIgnore = rawInputsToIgnore.split(',').map(c => c.trim());

							for (const key of incomingKeys) {
								if (inputDataToIgnore.includes(key)) continue;
								body[key] = items[i].json[key];
							}
						} else {
							const fields = this.getNodeParameter('fieldsUi.fieldValues', i, []) as Array<{
								fieldName: string;
								fieldValue: string;
							}>;
							for (const field of fields) {
								body[field.fieldName] = field.fieldValue;
							}
						}

						responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = { success: true };
						returnData.push(responseData);
					} else {
						throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.toString() });
					continue;
				}
				throw error;
			}

		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
