/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryData,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
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
		icon: 'file:nocodb.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Read, update, write and delete data from NocoDB',
		defaults: {
			name: 'NocoDB',
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
				noDataExpression: true,
				options: [
					{
						name: 'Row',
						value: 'row',
					},
				],
				default: 'row',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
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
						action: 'Create a row',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a row',
						action: 'Delete a row',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve a row',
						action: 'Get a row',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Retrieve all rows',
						action: 'Get all rows',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a row',
						action: 'Update a row',
					},
				],
				default: 'get',
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
		const table = this.getNodeParameter('table', 0) as string;

		let returnAll = false;
		let endpoint = '';
		let requestMethod = '';

		let qs: IDataObject = {};

		if (resource === 'row') {

			if (operation === 'create') {

				requestMethod = 'POST';
				endpoint = `/nc/${projectId}/api/v1/${table}/bulk`;

				const body: IDataObject[] = [];

				for (let i = 0; i < items.length; i++) {
					const newItem: IDataObject = {};
					const dataToSend = this.getNodeParameter('dataToSend', i) as 'defineBelow' | 'autoMapInputData';

					if (dataToSend === 'autoMapInputData') {
						const incomingKeys = Object.keys(items[i].json);
						const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
						const inputDataToIgnore = rawInputsToIgnore.split(',').map(c => c.trim());
						for (const key of incomingKeys) {
							if (inputDataToIgnore.includes(key)) continue;
							newItem[key] = items[i].json[key];
						}
					} else {
						const fields = this.getNodeParameter('fieldsUi.fieldValues', i, []) as Array<{
							fieldName: string;
							binaryData: boolean;
							fieldValue?: string;
							binaryProperty?: string;
						}>;

						for (const field of fields) {
							if (!field.binaryData) {
								newItem[field.fieldName] = field.fieldValue;
							} else if (field.binaryProperty) {
								if (!items[i].binary) {
									throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', { itemIndex: i });
								}
								const binaryPropertyName = field.binaryProperty;
								if (binaryPropertyName && !items[i].binary![binaryPropertyName]) {
									throw new NodeOperationError(this.getNode(), `Binary property ${binaryPropertyName} does not exist on item!`, { itemIndex: i });
								}
								const binaryData = items[i].binary![binaryPropertyName] as IBinaryData;
								const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

								const formData = {
									file: {
										value: dataBuffer,
										options: {
											filename: binaryData.fileName,
											contentType: binaryData.mimeType,
										},
									},
									json: JSON.stringify({
										api: 'xcAttachmentUpload',
										project_id: projectId,
										dbAlias: 'db',
										args: {},
									}),
								};
								const qs = { project_id: projectId };

								responseData = await apiRequest.call(this, 'POST', '/dashboard', {}, qs, undefined, { formData });
								newItem[field.fieldName] = JSON.stringify([responseData]);
							}
						}
					}
					body.push(newItem);
				}
				try {
					responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

					// Calculate ID manually and add to return data
					let id = responseData[0];
					for (let i = body.length - 1; i >= 0; i--) {
						body[i].id = id--;
					}

					returnData.push(...body);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ error: error.toString() });
					}
					throw new NodeApiError(this.getNode(), error);
				}
			} else if (operation === 'delete') {

				requestMethod = 'DELETE';
				endpoint = `/nc/${projectId}/api/v1/${table}/bulk`;
				const body: IDataObject[] = [];

				for (let i = 0; i < items.length; i++) {
					const id = this.getNodeParameter('id', i) as string;
					body.push({ id });
				}
				try {
					responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
					returnData.push(...items.map(item => item.json));
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ error: error.toString() });
					}
					throw new NodeApiError(this.getNode(), error);
				}
			} else if (operation === 'getAll') {
				const data = [];
				const downloadAttachments = this.getNodeParameter('downloadAttachments', 0) as boolean;
				try {
					for (let i = 0; i < items.length; i++) {
						requestMethod = 'GET';
						endpoint = `/nc/${projectId}/api/v1/${table}`;

						returnAll = this.getNodeParameter('returnAll', 0) as boolean;
						qs = this.getNodeParameter('options', i, {}) as IDataObject;

						if (qs.sort) {
							const properties = (qs.sort as IDataObject).property as Array<{ field: string, direction: string }>;
							qs.sort = properties.map(prop => `${prop.direction === 'asc' ? '' : '-'}${prop.field}`).join(',');
						}

						if (qs.fields) {
							qs.fields = (qs.fields as IDataObject[]).join(',');
						}

						if (returnAll === true) {
							responseData = await apiRequestAllItems.call(this, requestMethod, endpoint, {}, qs);
						} else {
							qs.limit = this.getNodeParameter('limit', 0) as number;
							responseData = await apiRequest.call(this, requestMethod, endpoint, {}, qs);
						}

						returnData.push.apply(returnData, responseData);

						if (downloadAttachments === true) {
							const downloadFieldNames = (this.getNodeParameter('downloadFieldNames', 0) as string).split(',');
							const response = await downloadRecordAttachments.call(this, responseData, downloadFieldNames);
							data.push(...response);
						}
					}

					if (downloadAttachments) {
						return [data];
					}

				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ error: error.toString() });
					}
					throw error;
				}
			} else if (operation === 'get') {

				requestMethod = 'GET';
				const newItems: INodeExecutionData[] = [];

				for (let i = 0; i < items.length; i++) {
					try {
						const id = this.getNodeParameter('id', i) as string;
						endpoint = `/nc/${projectId}/api/v1/${table}/${id}`;
						responseData = await apiRequest.call(this, requestMethod, endpoint, {}, qs);
						const newItem: INodeExecutionData = { json: responseData };

						const downloadAttachments = this.getNodeParameter('downloadAttachments', i) as boolean;

						if (downloadAttachments === true) {
							const downloadFieldNames = (this.getNodeParameter('downloadFieldNames', i) as string).split(',');
							const data = await downloadRecordAttachments.call(this, [responseData], downloadFieldNames);
							newItem.binary = data[0].binary;
						}

						newItems.push(newItem);
					} catch (error) {
						if (this.continueOnFail()) {
							newItems.push({ json: { error: error.toString() } });
							continue;
						}
						throw new NodeApiError(this.getNode(), error);
					}
				}
				return this.prepareOutputData(newItems);

			} else if (operation === 'update') {

				requestMethod = 'PUT';
				endpoint = `/nc/${projectId}/api/v1/${table}/bulk`;

				const body: IDataObject[] = [];

				for (let i = 0; i < items.length; i++) {

					const id = this.getNodeParameter('id', i) as string;
					const newItem: IDataObject = { id };
					const dataToSend = this.getNodeParameter('dataToSend', i) as 'defineBelow' | 'autoMapInputData';

					if (dataToSend === 'autoMapInputData') {
						const incomingKeys = Object.keys(items[i].json);
						const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
						const inputDataToIgnore = rawInputsToIgnore.split(',').map(c => c.trim());
						for (const key of incomingKeys) {
							if (inputDataToIgnore.includes(key)) continue;
							newItem[key] = items[i].json[key];
						}
					} else {
						const fields = this.getNodeParameter('fieldsUi.fieldValues', i, []) as Array<{
							fieldName: string;
							upload: boolean;
							fieldValue?: string;
							binaryProperty?: string;
						}>;

						for (const field of fields) {
							if (!field.upload) {
								newItem[field.fieldName] = field.fieldValue;
							} else if (field.binaryProperty) {
								if (!items[i].binary) {
									throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', { itemIndex: i });
								}
								const binaryPropertyName = field.binaryProperty;
								if (binaryPropertyName && !items[i].binary![binaryPropertyName]) {
									throw new NodeOperationError(this.getNode(), `Binary property ${binaryPropertyName} does not exist on item!`, { itemIndex: i });
								}
								const binaryData = items[i].binary![binaryPropertyName] as IBinaryData;
								const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

								const formData = {
									file: {
										value: dataBuffer,
										options: {
											filename: binaryData.fileName,
											contentType: binaryData.mimeType,
										},
									},
									json: JSON.stringify({
										api: 'xcAttachmentUpload',
										project_id: projectId,
										dbAlias: 'db',
										args: {},
									}),
								};
								const qs = { project_id: projectId };

								responseData = await apiRequest.call(this, 'POST', '/dashboard', {}, qs, undefined, { formData });
								newItem[field.fieldName] = JSON.stringify([responseData]);
							}
						}
					}
					body.push(newItem);
				}

				try {
					responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
					returnData.push(...body);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ error: error.toString() });
					}
					throw new NodeApiError(this.getNode(), error);
				}
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
