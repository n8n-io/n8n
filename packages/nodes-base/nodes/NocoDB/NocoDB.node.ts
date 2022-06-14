import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryData,
	IDataObject,
	ILoadOptionsFunctions,
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
		version: [1, 2],
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
				displayName: 'API Version',
				name: 'apiVersion',
				type: 'options',
				displayOptions: {
					show: {
						'@version': [
							1,
						],
					},
				},
				isNodeSetting: true,
				options: [
					{
						name: 'Before v0.90.0',
						value: 'version1',
					},
					{
						name: 'v0.90.0 onwards',
						value: 'version2',
					},
				],
				default: 'version1',
			},
			{
				displayName: 'API Version',
				name: 'apiVersion',
				type: 'options',
				displayOptions: {
					show: {
						'@version': [
							2,
						],
					},
				},
				isNodeSetting: true,
				options: [
					{
						name: 'Before v0.90.0',
						value: 'version1',
					},
					{
						name: 'v0.90.0 onwards',
						value: 'version2',
					},
				],
				default: 'version2',
			},
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
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a row',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve a row',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Retrieve all rows',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a row',
					},
				],
				default: 'get',
			},
			...operationFields,
		],
	};

	methods = {
		loadOptions: {
			async getProjects(this: ILoadOptionsFunctions) {
				const credentials = await this.getCredentials('nocoDb');
				if (credentials === undefined) {
					throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
				}

				try {
					const requestMethod = 'GET';
					const endpoint = '/api/v1/db/meta/projects/';
					const responseData = await apiRequest.call(this, requestMethod, endpoint, {}, {});
					return responseData.list.map((i: IDataObject) => ({ name: i.title, value: JSON.stringify(i) }));
				} catch (e) {
					throw new NodeOperationError(this.getNode(), `Error while fetching projects! (${e})`);
				}

			},
			async getTables(this: ILoadOptionsFunctions) {
				const project = JSON.parse(this.getNodeParameter('project', 0) as string || 'null') as IDataObject;
				if (project) {
					const projectId = project.id;
					try {
						const requestMethod = 'GET';
						const endpoint = `/api/v1/db/meta/projects/${projectId}/tables`;
						const responseData = await apiRequest.call(this, requestMethod, endpoint, {}, {});
						return responseData.list.map((i: IDataObject) => ({ name: i.title, value: JSON.stringify(i) }));
					} catch (e) {
						throw new NodeOperationError(this.getNode(), `Error while fetching tables! (${e})`);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `No project selected!`);
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;

		const version = this.getNode().typeVersion as number;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let returnAll = false;
		let endpoint = '';
		let requestMethod = '';

		let qs: IDataObject = {};

		if (version === 1) {

			const projectId = this.getNodeParameter('projectId', 0) as string;
			const table = this.getNodeParameter('table', 0) as string;

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
										throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
									}
									const binaryPropertyName = field.binaryProperty;
									if (binaryPropertyName && !items[i].binary![binaryPropertyName]) {
										throw new NodeOperationError(this.getNode(), `Binary property ${binaryPropertyName} does not exist on item!`);
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
								binaryData: boolean;
								fieldValue?: string;
								binaryProperty?: string;
							}>;

							for (const field of fields) {
								if (!field.binaryData) {
									newItem[field.fieldName] = field.fieldValue;
								} else if (field.binaryProperty) {
									if (!items[i].binary) {
										throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
									}
									const binaryPropertyName = field.binaryProperty;
									if (binaryPropertyName && !items[i].binary![binaryPropertyName]) {
										throw new NodeOperationError(this.getNode(), `Binary property ${binaryPropertyName} does not exist on item!`);
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
		} else if (version === 2) {
			const project = JSON.parse(this.getNodeParameter('project', 0) as string || 'null') as IDataObject;
			const table = JSON.parse(this.getNodeParameter('table', 0) as string || 'null') as IDataObject;

			const projectName = project.title;
			const tableName = table.title;

			if (project && table) {
				if (resource === 'row') {
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = `/api/v1/db/data/noco/${projectName}/${tableName}`;

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
											throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
										}
										const binaryPropertyName = field.binaryProperty;
										if (binaryPropertyName && !items[i].binary![binaryPropertyName]) {
											throw new NodeOperationError(this.getNode(), `Binary property ${binaryPropertyName} does not exist on item!`);
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
											json: JSON.stringify({}),
										};
										const qs = { path: `noco/${projectName}/${tableName}/${field.fieldName}` };

										responseData = await apiRequest.call(this, 'POST', '/api/v1/db/storage/upload', {}, qs, undefined, { formData });
										newItem[field.fieldName] = JSON.stringify(responseData);
									}
								}
							}
							try {
								responseData = await apiRequest.call(this, requestMethod, endpoint, newItem, qs);
								returnData.push(responseData);
							} catch (error) {
								if (this.continueOnFail()) {
									returnData.push({ error: error.toString() });
								}
								throw new NodeApiError(this.getNode(), error);
							}
						}
					} else if (operation === 'delete') {
						for (let i = 0; i < items.length; i++) {
							const id = this.getNodeParameter('id', i) as string;

							requestMethod = 'DELETE';
							endpoint = `/api/v1/db/data/noco/${projectName}/${tableName}/${id}`;

							try {
								responseData = await apiRequest.call(this, requestMethod, endpoint, {}, qs);
							} catch (error) {
								if (this.continueOnFail()) {
									returnData.push({ error: error.toString() });
								}
								throw new NodeApiError(this.getNode(), error);
							}
						}
					} else if (operation === 'getAll') {
						const data = [];
						const downloadAttachments = this.getNodeParameter('downloadAttachments', 0) as boolean;
						try {
							for (let i = 0; i < items.length; i++) {
								requestMethod = 'GET';
								endpoint = `/api/v1/db/data/noco/${projectName}/${tableName}`;

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
									responseData = (await apiRequest.call(this, requestMethod, endpoint, {}, qs)).list;
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
						const newItems: INodeExecutionData[] = [];

						for (let i = 0; i < items.length; i++) {
							try {
								const id = this.getNodeParameter('id', i) as string;

								requestMethod = 'GET';
								endpoint = `/api/v1/db/data/noco/${projectName}/${tableName}/${id}`;

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
						for (let i = 0; i < items.length; i++) {
							const id = this.getNodeParameter('id', i) as string;
							const newItem: IDataObject = { id };
							const dataToSend = this.getNodeParameter('dataToSend', i) as 'defineBelow' | 'autoMapInputData';

							requestMethod = 'PATCH';
							endpoint = `/api/v1/db/data/noco/${projectName}/${tableName}/${id}`;

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
											throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
										}
										const binaryPropertyName = field.binaryProperty;
										if (binaryPropertyName && !items[i].binary![binaryPropertyName]) {
											throw new NodeOperationError(this.getNode(), `Binary property ${binaryPropertyName} does not exist on item!`);
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
											json: JSON.stringify({}),
										};
										const qs = { path: `noco/${projectName}/${tableName}/${field.fieldName}` };

										responseData = await apiRequest.call(this, 'POST', '/api/v1/db/storage/upload', {}, qs, undefined, { formData });
										newItem[field.fieldName] = JSON.stringify(responseData);
									}
								}
							}
							try {
								responseData = await apiRequest.call(this, requestMethod, endpoint, newItem, qs);
								returnData.push(responseData);
							} catch (error) {
								if (this.continueOnFail()) {
									returnData.push({ error: error.toString() });
								}
								throw new NodeApiError(this.getNode(), error);
							}
						}
					}
				}
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
