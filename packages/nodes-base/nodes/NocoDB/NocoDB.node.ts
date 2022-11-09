/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { IExecuteFunctions } from 'n8n-core';

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

import { apiRequest, apiRequestAllItems, downloadRecordAttachments } from './GenericFunctions';

import { operationFields } from './OperationDescription';

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
				displayOptions: {
					show: {
						authentication: ['nocoDb'],
					},
				},
			},
			{
				name: 'nocoDbApiToken',
				required: true,
				displayOptions: {
					show: {
						authentication: ['nocoDbApiToken'],
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
						name: 'User Token',
						value: 'nocoDb',
					},
					{
						name: 'API Token',
						value: 'nocoDbApiToken',
					},
				],
				default: 'nocoDb',
			},
			{
				displayName: 'API Version',
				name: 'version',
				type: 'options',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
				isNodeSetting: true,
				options: [
					{
						name: 'Before v0.90.0',
						value: 1,
					},
					{
						name: 'v0.90.0 Onwards',
						value: 2,
					},
				],
				default: 1,
			},
			{
				displayName: 'API Version',
				name: 'version',
				type: 'options',
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				isNodeSetting: true,
				options: [
					{
						name: 'Before v0.90.0',
						value: 1,
					},
					{
						name: 'v0.90.0 Onwards',
						value: 2,
					},
				],
				default: 2,
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
						resource: ['row'],
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
						name: 'Get Many',
						value: 'getAll',
						description: 'Retrieve many rows',
						action: 'Get many rows',
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

	methods = {
		loadOptions: {
			async getProjects(this: ILoadOptionsFunctions) {
				try {
					const requestMethod = 'GET';
					const endpoint = '/api/v1/db/meta/projects/';
					const responseData = await apiRequest.call(this, requestMethod, endpoint, {}, {});
					return responseData.list.map((i: IDataObject) => ({ name: i.title, value: i.id }));
				} catch (e) {
					throw new NodeOperationError(this.getNode(), `Error while fetching projects! (${e})`);
				}
			},
			// This only supports using the Project ID
			async getTables(this: ILoadOptionsFunctions) {
				const projectId = this.getNodeParameter('projectId', 0) as string;
				if (projectId) {
					try {
						const requestMethod = 'GET';
						const endpoint = `/api/v1/db/meta/projects/${projectId}/tables`;
						const responseData = await apiRequest.call(this, requestMethod, endpoint, {}, {});
						return responseData.list.map((i: IDataObject) => ({ name: i.title, value: i.id }));
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

		const version = this.getNodeParameter('version', 0) as number;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let returnAll = false;
		let requestMethod = '';

		let qs: IDataObject = {};

		let endPoint = '';

		const projectId = this.getNodeParameter('projectId', 0) as string;
		const table = this.getNodeParameter('table', 0) as string;

		if (resource === 'row') {
			if (operation === 'create') {
				requestMethod = 'POST';

				if (version === 1) {
					endPoint = `/nc/${projectId}/api/v1/${table}/bulk`;
				} else if (version === 2) {
					endPoint = `/api/v1/db/data/bulk/noco/${projectId}/${table}`;
				}

				const body: IDataObject[] = [];

				for (let i = 0; i < items.length; i++) {
					const newItem: IDataObject = {};
					const dataToSend = this.getNodeParameter('dataToSend', i) as
						| 'defineBelow'
						| 'autoMapInputData';

					if (dataToSend === 'autoMapInputData') {
						const incomingKeys = Object.keys(items[i].json);
						const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
						const inputDataToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());
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
									throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
										itemIndex: i,
									});
								}
								const binaryPropertyName = field.binaryProperty;
								if (binaryPropertyName && !items[i].binary![binaryPropertyName]) {
									throw new NodeOperationError(
										this.getNode(),
										`Binary property ${binaryPropertyName} does not exist on item!`,
										{ itemIndex: i },
									);
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

								let postUrl = '';
								if (version === 1) {
									postUrl = '/dashboard';
								} else if (version === 2) {
									postUrl = '/api/v1/db/storage/upload';
								}

								responseData = await apiRequest.call(this, 'POST', postUrl, {}, qs, undefined, {
									formData,
								});
								newItem[field.fieldName] = JSON.stringify([responseData]);
							}
						}
					}
					body.push(newItem);
				}
				try {
					responseData = await apiRequest.call(this, requestMethod, endPoint, body, qs);

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
			}

			if (operation === 'delete') {
				requestMethod = 'DELETE';
				if (version === 1) {
					endPoint = `/nc/${projectId}/api/v1/${table}/bulk`;
				} else if (version === 2) {
					endPoint = `/api/v1/db/data/bulk/noco/${projectId}/${table}`;
				}

				const body: IDataObject[] = [];

				for (let i = 0; i < items.length; i++) {
					const id = this.getNodeParameter('id', i) as string;
					body.push({ id });
				}

				try {
					responseData = await apiRequest.call(this, requestMethod, endPoint, body, qs);
					if (version === 1) {
						returnData.push(...items.map((item) => item.json));
					} else if (version === 2) {
						returnData.push(
							...responseData.map((result: number, index: number) => {
								if (result === 0) {
									const errorMessage = `The row with the ID "${body[index].id}" could not be deleted. It probably doesn't exist.`;
									if (this.continueOnFail()) {
										return { error: errorMessage };
									}
									throw new NodeApiError(
										this.getNode(),
										{ message: errorMessage },
										{ message: errorMessage, itemIndex: index },
									);
								}
								return {
									success: true,
								};
							}),
						);
					}
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ error: error.toString() });
					}
					throw new NodeApiError(this.getNode(), error);
				}
			}

			if (operation === 'getAll') {
				const data = [];
				const downloadAttachments = this.getNodeParameter('downloadAttachments', 0) as boolean;
				try {
						for (let i = 0; i < items.length; i++) {
								requestMethod = 'GET';

								if (version === 1) {
										endPoint = `/nc/${projectId}/api/v1/${table}`;
								} else if (version === 2) {
										endPoint = `/api/v1/db/data/noco/${projectId}/${table}`;
								}

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
										responseData = await apiRequestAllItems.call(this, requestMethod, endPoint, {}, qs);
								} else {
										qs.limit = this.getNodeParameter('limit', 0) as number;
										responseData = await apiRequest.call(this, requestMethod, endPoint, {}, qs);
										if (version === 2) {
												responseData = responseData.list;
										}
								}

								const executionData = this.helpers.constructExecutionMetaData(
									this.helpers.returnJsonArray(responseData),
									{ itemData: { item: i } },
								);
								returnData.push(...executionData);

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
								returnData.push({ json:{ error: error.toString() } });
						} else {
							throw error;
						}
				}

				return this.prepareOutputData(returnData as INodeExecutionData[]);
			}

			if (operation === 'get') {
				requestMethod = 'GET';
				const newItems: INodeExecutionData[] = [];

				for (let i = 0; i < items.length; i++) {
						try {
								const id = this.getNodeParameter('id', i) as string;

								if (version === 1) {
										endPoint = `/nc/${projectId}/api/v1/${table}/${id}`;
								}	else if (version === 2) {
										endPoint = `/api/v1/db/data/noco/${projectId}/${table}/${id}`;
								}

								responseData = await apiRequest.call(this, requestMethod, endPoint, {}, qs);

								if (version === 2 ) {
										if (Object.keys(responseData).length === 0) {
												// Get did fail
												const errorMessage = `The row with the ID "${id}" could not be queried. It probably doesn't exist.`;
												if (this.continueOnFail()) {
														newItems.push({ json: {error: errorMessage }});
														continue;
												}
												throw new NodeApiError(this.getNode(), { message: errorMessage }, { message: errorMessage, itemIndex: i });
										}
								}

								const downloadAttachments = this.getNodeParameter('downloadAttachments', i) as boolean;

								if (downloadAttachments === true) {
										const downloadFieldNames = (this.getNodeParameter('downloadFieldNames', i) as string).split(',');
										const data = await downloadRecordAttachments.call(this, [responseData], downloadFieldNames);
										const newItem = {
											binary: data[0].binary,
											json: {},
										};

										const executionData = this.helpers.constructExecutionMetaData(
											[newItem] as INodeExecutionData[],
											{ itemData: { item: i } },
										);

										newItems.push(...executionData);
								} else {
										const executionData = this.helpers.constructExecutionMetaData(
											this.helpers.returnJsonArray(responseData),
											{ itemData: { item: i } },
										);

										newItems.push(...executionData);
								}

						} catch (error) {
								if (this.continueOnFail()) {
									const executionData = this.helpers.constructExecutionMetaData(
										this.helpers.returnJsonArray({error: error.toString()}),
										{ itemData: { item: i } },
								);

								newItems.push(...executionData);
										continue;
								}
								throw new NodeApiError(this.getNode(), error, {itemIndex: i});
						}
				}
				return this.prepareOutputData(newItems);
			}

			if (operation === 'update') {
				let requestMethod = 'PATCH';

				if (version === 1) {
					endPoint = `/nc/${projectId}/api/v1/${table}/bulk`;
					requestMethod = 'PUT';
				} else if (version === 2) {
					endPoint = `/api/v1/db/data/bulk/noco/${projectId}/${table}`;
				}
				const body: IDataObject[] = [];

				for (let i = 0; i < items.length; i++) {
					const id = this.getNodeParameter('id', i) as string;
					const newItem: IDataObject = { id };
					const dataToSend = this.getNodeParameter('dataToSend', i) as
						| 'defineBelow'
						| 'autoMapInputData';

					if (dataToSend === 'autoMapInputData') {
						const incomingKeys = Object.keys(items[i].json);
						const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
						const inputDataToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());
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
									throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
										itemIndex: i,
									});
								}
								const binaryPropertyName = field.binaryProperty;
								if (binaryPropertyName && !items[i].binary![binaryPropertyName]) {
									throw new NodeOperationError(
										this.getNode(),
										`Binary property ${binaryPropertyName} does not exist on item!`,
										{ itemIndex: i },
									);
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
								let postUrl = '';
								if (version === 1) {
									postUrl = '/dashboard';
								} else if (version === 2) {
									postUrl = '/api/v1/db/storage/upload';
								}
								responseData = await apiRequest.call(this, 'POST', postUrl, {}, qs, undefined, {
									formData,
								});
								newItem[field.fieldName] = JSON.stringify([responseData]);
							}
						}
					}
					body.push(newItem);
				}

				try {
					responseData = await apiRequest.call(this, requestMethod, endPoint, body, qs);

					if (version === 1) {
						returnData.push(...body);
					} else if (version === 2) {
						returnData.push(
							...responseData.map((result: number, index: number) => {
								if (result === 0) {
									const errorMessage = `The row with the ID "${body[index].id}" could not be updated. It probably doesn't exist.`;
									if (this.continueOnFail()) {
										return { error: errorMessage };
									}
									throw new NodeApiError(
										this.getNode(),
										{ message: errorMessage },
										{ message: errorMessage, itemIndex: index },
									);
								}
								return {
									success: true,
								};
							}),
						);
					}
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
