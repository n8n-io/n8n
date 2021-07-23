import {
	BINARY_ENCODING,
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

		let qs: IDataObject = {};

		if (resource === 'row') {

			if (operation === 'create') {

				requestMethod = 'POST';
				endpoint = `/nc/${projectId}/api/v1/${table}/bulk`;

				const body: IDataObject[] = [];

				for (let i = 0; i < items.length; i++) {
					try {
						const newItem: IDataObject = {};
						const dataToSend = this.getNodeParameter('dataToSend', 0) as 'defineBelow' | 'autoMapInputData';

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
								fieldValue: string;
							}>;

							for (const field of fields) {
								newItem[field.fieldName] = field.fieldValue;
							}
						}
						const uploadAttachments = this.getNodeParameter('uploadAttachments', i) as boolean;
						if (uploadAttachments) {
							const attachments = this.getNodeParameter('attachmentsUi.attachmentValues', i, []) as Array<{
								binaryProperty: string;
								rowFields: string;
							}>;

							if (!items[i].binary) {
								throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
							}

							for (const attachment of attachments) {
								const binaryPropertyName = attachment.binaryProperty;
								if (binaryPropertyName && !items[i].binary![binaryPropertyName]) {
									throw new NodeOperationError(this.getNode(), `Binary property ${binaryPropertyName} does not exist on item!`);
								}
								const fields = attachment.rowFields.split(',');
								const binaryData = items[i].binary![binaryPropertyName] as IBinaryData;

								const formData = {
									file: {
										value: Buffer.from(binaryData.data, BINARY_ENCODING),
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

								for (const field of fields) {
									newItem[field] = JSON.stringify([responseData]);
								}
							}
						}
						body.push(newItem);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.toString() });
							continue;
						}
						throw new NodeOperationError(this.getNode(), error);
					}
				}
				try {
					responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
					returnData.push({lastAddedRowId: responseData[0]});
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
					body.push({id});
				}
				try {
					responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
					responseData = { success: true };
					returnData.push(responseData);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ error: error.toString() });
					}
					throw new NodeApiError(this.getNode(), error);
				}
			} else if (operation === 'getAll') {
				try {
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
						responseData = await apiRequestAllItems.call(this, requestMethod, endpoint, {}, qs);
					} else {
						qs.limit = this.getNodeParameter('limit', 0) as number;
						responseData = await apiRequest.call(this, requestMethod, endpoint, {}, qs);
					}

					returnData.push.apply(returnData, responseData);

					if (downloadAttachments === true) {
						const downloadFieldNames = (this.getNodeParameter('downloadFieldNames', 0) as string).split(',');
						const data = await downloadRecordAttachments.call(this, responseData, downloadFieldNames);
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
						const newItem: INodeExecutionData = {json: responseData};

						const downloadAttachments = this.getNodeParameter('downloadAttachments', i) as boolean;

						if (downloadAttachments === true) {
							const downloadFieldNames = (this.getNodeParameter('downloadFieldNames', i) as string).split(',');
							const data = await downloadRecordAttachments.call(this, [responseData], downloadFieldNames);
							newItem.binary = data[0].binary;
						}

						newItems.push(newItem) ;
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
					try {

						const id = this.getNodeParameter('id', i) as string;
						const newItem: IDataObject = {id};
						const dataToSend = this.getNodeParameter('dataToSend', 0) as 'defineBelow' | 'autoMapInputData';

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
								fieldValue: string;
							}>;
							for (const field of fields) {
								newItem[field.fieldName] = field.fieldValue;
							}
						}
						const uploadAttachments = this.getNodeParameter('uploadAttachments', i) as boolean;
						if (uploadAttachments) {
							const attachments = this.getNodeParameter('attachmentsUi.attachmentValues', i, []) as Array<{
								binaryProperty: string;
								rowFields: string;
							}>;

							if (!items[i].binary) {
								throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
							}

							for (const attachment of attachments) {
								const binaryPropertyName = attachment.binaryProperty;
								if (binaryPropertyName && !items[i].binary![binaryPropertyName]) {
									throw new NodeOperationError(this.getNode(), `Binary property ${binaryPropertyName} does not exist on item!`);
								}
								const fields = attachment.rowFields.split(',');
								const binaryData = items[i].binary![binaryPropertyName] as IBinaryData;

								const formData = {
									file: {
										value: Buffer.from(binaryData.data, BINARY_ENCODING),
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

								for (const field of fields) {
									newItem[field] = JSON.stringify([responseData]);
								}
							}
						}
						body.push(newItem);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({ error: error.toString() });
							continue;
						}
						throw new NodeOperationError(this.getNode(), error);
					}
				}
				try {
					responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
					responseData = { success: true };
					returnData.push(responseData);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ error: error.toString() });
					}
					throw new NodeApiError(this.getNode(), error);
				}
			} else {
				throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
			}
		} else {
			throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
