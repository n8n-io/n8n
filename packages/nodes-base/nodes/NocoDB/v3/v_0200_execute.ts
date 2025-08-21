/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { apiRequest, apiRequestAllItems, downloadRecordAttachments } from '../GenericFunctions';

export const V0200Execute = async (
	workflowNode: IExecuteFunctions,
): Promise<INodeExecutionData[][]> => {
	const items = workflowNode.getInputData();
	const returnData: IDataObject[] = [];
	let responseData;

	const version = workflowNode.getNodeParameter('version', 0) as number;
	const resource = workflowNode.getNodeParameter('resource', 0);
	const operation = workflowNode.getNodeParameter('operation', 0);

	let returnAll = false;
	let requestMethod: IHttpRequestMethods = 'GET';

	let qs: IDataObject = {};

	let endPoint = '';

	const baseId = workflowNode.getNodeParameter('projectId', 0, undefined, {
		extractValue: true,
	}) as string;
	const table = workflowNode.getNodeParameter('table', 0, undefined, {
		extractValue: true,
	}) as string;
	// TODO: use viewId;
	// const _viewId = workflowNode.getNodeParameter('viewId', 0, undefined, {
	// 	extractValue: true,
	// }) as string;

	if (resource === 'row') {
		if (operation === 'create') {
			requestMethod = 'POST';

			if (version === 1) {
				endPoint = `/nc/${baseId}/api/v1/${table}/bulk`;
			} else if (version === 2) {
				endPoint = `/api/v1/db/data/bulk/noco/${baseId}/${table}`;
			} else if (version === 3) {
				endPoint = `/api/v2/tables/${table}/records`;
			}

			const body: IDataObject[] = [];

			for (let i = 0; i < items.length; i++) {
				const newItem: IDataObject = {};
				const dataToSend = workflowNode.getNodeParameter('dataToSend', i) as
					| 'defineBelow'
					| 'autoMapInputData';

				if (dataToSend === 'autoMapInputData') {
					const incomingKeys = Object.keys(items[i].json);
					const rawInputsToIgnore = workflowNode.getNodeParameter('inputsToIgnore', i) as string;
					const inputDataToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());
					for (const key of incomingKeys) {
						if (inputDataToIgnore.includes(key)) continue;
						newItem[key] = items[i].json[key];
					}
				} else {
					const fields = workflowNode.getNodeParameter('fieldsUi.fieldValues', i, []) as Array<{
						fieldName: string;
						binaryData: boolean;
						fieldValue?: string;
						binaryProperty?: string;
					}>;

					for (const field of fields) {
						if (!field.binaryData) {
							newItem[field.fieldName] = field.fieldValue;
						} else if (field.binaryProperty) {
							const binaryPropertyName = field.binaryProperty;
							const binaryData = workflowNode.helpers.assertBinaryData(i, binaryPropertyName);
							const dataBuffer = await workflowNode.helpers.getBinaryDataBuffer(
								i,
								binaryPropertyName,
							);

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
									project_id: baseId,
									dbAlias: 'db',
									args: {},
								}),
							};

							let postUrl = '';
							if (version === 1) {
								postUrl = '/dashboard';
							} else if (version === 2) {
								postUrl = '/api/v1/db/storage/upload';
							} else if (version === 3) {
								postUrl = '/api/v2/storage/upload';
							}

							responseData = await apiRequest.call(
								workflowNode,
								'POST',
								postUrl,
								{},
								version === 3 ? { base_id: baseId } : { project_id: baseId },
								undefined,
								{
									formData,
								},
							);
							newItem[field.fieldName] = JSON.stringify(
								Array.isArray(responseData) ? responseData : [responseData],
							);
						}
					}
				}
				body.push(newItem);
			}
			try {
				responseData = await apiRequest.call(workflowNode, requestMethod, endPoint, body, qs);

				if (version === 3) {
					for (let i = body.length - 1; i >= 0; i--) {
						body[i] = { ...body[i], ...responseData[i] };
					}

					returnData.push(...body);
				} else {
					// Calculate ID manually and add to return data
					let id = responseData[0];
					for (let i = body.length - 1; i >= 0; i--) {
						body[i].id = id--;
					}

					returnData.push(...body);
				}
			} catch (error) {
				if (workflowNode.continueOnFail()) {
					returnData.push({ error: error.toString() });
				}
				throw new NodeApiError(workflowNode.getNode(), error as JsonObject);
			}
		}

		if (operation === 'delete') {
			requestMethod = 'DELETE';
			let primaryKey = 'id';

			if (version === 1) {
				endPoint = `/nc/${baseId}/api/v1/${table}/bulk`;
			} else if (version === 2) {
				endPoint = `/api/v1/db/data/bulk/noco/${baseId}/${table}`;

				primaryKey = workflowNode.getNodeParameter('primaryKey', 0) as string;
				if (primaryKey === 'custom') {
					primaryKey = workflowNode.getNodeParameter('customPrimaryKey', 0) as string;
				}
			} else if (version === 3) {
				endPoint = `/api/v2/tables/${table}/records`;

				primaryKey = workflowNode.getNodeParameter('primaryKey', 0) as string;
				if (primaryKey === 'custom') {
					primaryKey = workflowNode.getNodeParameter('customPrimaryKey', 0) as string;
				}
			}

			const body: IDataObject[] = [];

			for (let i = 0; i < items.length; i++) {
				const id = workflowNode.getNodeParameter('id', i) as string;
				body.push({ [primaryKey]: id });
			}

			try {
				responseData = (await apiRequest.call(
					workflowNode,
					requestMethod,
					endPoint,
					body,
					qs,
				)) as any[];
				if (version === 1) {
					returnData.push(...items.map((item) => item.json));
				} else if (version === 2) {
					returnData.push(
						...responseData.map((result: number, index: number) => {
							if (result === 0) {
								const errorMessage = `The row with the ID "${body[index].id}" could not be deleted. It probably doesn't exist.`;
								if (workflowNode.continueOnFail()) {
									return { error: errorMessage };
								}
								throw new NodeApiError(
									workflowNode.getNode(),
									{ message: errorMessage },
									{ message: errorMessage, itemIndex: index },
								);
							}
							return {
								success: true,
							};
						}),
					);
				} else if (version === 3) {
					returnData.push(...responseData);
				}
			} catch (error) {
				if (workflowNode.continueOnFail()) {
					returnData.push({ error: error.toString() });
				}
				throw new NodeApiError(workflowNode.getNode(), error as JsonObject);
			}
		}

		if (operation === 'getAll') {
			const data = [];
			const downloadAttachments = workflowNode.getNodeParameter(
				'downloadAttachments',
				0,
			) as boolean;
			try {
				for (let i = 0; i < items.length; i++) {
					requestMethod = 'GET';

					if (version === 1) {
						endPoint = `/nc/${baseId}/api/v1/${table}`;
					} else if (version === 2) {
						endPoint = `/api/v1/db/data/noco/${baseId}/${table}`;
					} else if (version === 3) {
						endPoint = `/api/v2/tables/${table}/records`;
					}

					returnAll = workflowNode.getNodeParameter('returnAll', 0);
					qs = workflowNode.getNodeParameter('options', i, {});

					if (qs.sort) {
						const properties = (qs.sort as IDataObject).property as Array<{
							field: string;
							direction: string;
						}>;
						qs.sort = properties
							.map((prop) => `${prop.direction === 'asc' ? '' : '-'}${prop.field}`)
							.join(',');
					}

					if (qs.fields) {
						qs.fields = (qs.fields as IDataObject[]).join(',');
					}

					if (returnAll) {
						responseData = await apiRequestAllItems.call(
							workflowNode,
							requestMethod,
							endPoint,
							{},
							qs,
						);
					} else {
						qs.limit = workflowNode.getNodeParameter('limit', 0);
						responseData = await apiRequest.call(workflowNode, requestMethod, endPoint, {}, qs);
						if (version === 2 || version === 3) {
							responseData = responseData.list;
						}
					}

					const executionData = workflowNode.helpers.constructExecutionMetaData(
						workflowNode.helpers.returnJsonArray(responseData as IDataObject),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);

					if (downloadAttachments) {
						const downloadFieldNames = (
							workflowNode.getNodeParameter('downloadFieldNames', 0) as string
						).split(',');
						const response = await downloadRecordAttachments.call(
							workflowNode,
							responseData as IDataObject[],
							downloadFieldNames,
							[{ item: i }],
						);
						data.push(...response);
					}
				}

				if (downloadAttachments) {
					return [data];
				}
			} catch (error) {
				if (workflowNode.continueOnFail()) {
					returnData.push({ json: { error: error.toString() } });
				} else {
					throw error;
				}
			}

			return [returnData as INodeExecutionData[]];
		}

		if (operation === 'get') {
			requestMethod = 'GET';
			const newItems: INodeExecutionData[] = [];

			for (let i = 0; i < items.length; i++) {
				try {
					const id = workflowNode.getNodeParameter('id', i) as string;

					if (version === 1) {
						endPoint = `/nc/${baseId}/api/v1/${table}/${id}`;
					} else if (version === 2) {
						endPoint = `/api/v1/db/data/noco/${baseId}/${table}/${id}`;
					} else if (version === 3) {
						endPoint = `/api/v2/tables/${table}/records/${id}`;
					}

					responseData = await apiRequest.call(workflowNode, requestMethod, endPoint, {}, qs);

					if (version === 2) {
						if (Object.keys(responseData as IDataObject).length === 0) {
							// Get did fail
							const errorMessage = `The row with the ID "${id}" could not be queried. It probably doesn't exist.`;
							if (workflowNode.continueOnFail()) {
								newItems.push({ json: { error: errorMessage } });
								continue;
							}
							throw new NodeApiError(
								workflowNode.getNode(),
								{ message: errorMessage },
								{ message: errorMessage, itemIndex: i },
							);
						}
					}

					const downloadAttachments = workflowNode.getNodeParameter(
						'downloadAttachments',
						i,
					) as boolean;

					if (downloadAttachments) {
						const downloadFieldNames = (
							workflowNode.getNodeParameter('downloadFieldNames', i) as string
						).split(',');
						const data = await downloadRecordAttachments.call(
							workflowNode,
							[responseData as IDataObject],
							downloadFieldNames,
							[{ item: i }],
						);
						const newItem = {
							binary: data[0].binary,
							json: {},
						};

						const executionData = workflowNode.helpers.constructExecutionMetaData(
							[newItem] as INodeExecutionData[],
							{ itemData: { item: i } },
						);

						newItems.push(...executionData);
					} else {
						const executionData = workflowNode.helpers.constructExecutionMetaData(
							workflowNode.helpers.returnJsonArray(responseData as IDataObject),
							{ itemData: { item: i } },
						);

						newItems.push(...executionData);
					}
				} catch (error) {
					if (workflowNode.continueOnFail()) {
						const executionData = workflowNode.helpers.constructExecutionMetaData(
							workflowNode.helpers.returnJsonArray({ error: error.toString() }),
							{ itemData: { item: i } },
						);

						newItems.push(...executionData);
						continue;
					}
					throw new NodeApiError(workflowNode.getNode(), error as JsonObject, { itemIndex: i });
				}
			}
			return [newItems];
		}

		if (operation === 'update') {
			requestMethod = 'PATCH';
			let primaryKey = 'id';

			if (version === 1) {
				endPoint = `/nc/${baseId}/api/v1/${table}/bulk`;
				requestMethod = 'PUT';
			} else if (version === 2) {
				endPoint = `/api/v1/db/data/bulk/noco/${baseId}/${table}`;

				primaryKey = workflowNode.getNodeParameter('primaryKey', 0) as string;
				if (primaryKey === 'custom') {
					primaryKey = workflowNode.getNodeParameter('customPrimaryKey', 0) as string;
				}
			} else if (version === 3) {
				endPoint = `/api/v2/tables/${table}/records`;
			}

			const body: IDataObject[] = [];

			for (let i = 0; i < items.length; i++) {
				const id = version === 3 ? null : (workflowNode.getNodeParameter('id', i) as string);
				const newItem: IDataObject = version === 3 ? {} : { [primaryKey]: id };
				const dataToSend = workflowNode.getNodeParameter('dataToSend', i) as
					| 'defineBelow'
					| 'autoMapInputData';

				if (dataToSend === 'autoMapInputData') {
					const incomingKeys = Object.keys(items[i].json);
					const rawInputsToIgnore = workflowNode.getNodeParameter('inputsToIgnore', i) as string;
					const inputDataToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());
					for (const key of incomingKeys) {
						if (inputDataToIgnore.includes(key)) continue;
						newItem[key] = items[i].json[key];
					}
				} else {
					const fields = workflowNode.getNodeParameter('fieldsUi.fieldValues', i, []) as Array<{
						fieldName: string;
						binaryData: boolean;
						fieldValue?: string;
						binaryProperty?: string;
					}>;

					for (const field of fields) {
						if (!field.binaryData) {
							newItem[field.fieldName] = field.fieldValue;
						} else if (field.binaryProperty) {
							const binaryPropertyName = field.binaryProperty;
							const binaryData = workflowNode.helpers.assertBinaryData(i, binaryPropertyName);
							const dataBuffer = await workflowNode.helpers.getBinaryDataBuffer(
								i,
								binaryPropertyName,
							);

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
									project_id: baseId,
									dbAlias: 'db',
									args: {},
								}),
							};
							let postUrl = '';
							if (version === 1) {
								postUrl = '/dashboard';
							} else if (version === 2) {
								postUrl = '/api/v1/db/storage/upload';
							} else if (version === 3) {
								postUrl = '/api/v2/storage/upload';
							}

							responseData = await apiRequest.call(
								workflowNode,
								'POST',
								postUrl,
								{},
								version === 3 ? { base_id: baseId } : { project_id: baseId },
								undefined,
								{
									formData,
								},
							);
							newItem[field.fieldName] = JSON.stringify(
								Array.isArray(responseData) ? responseData : [responseData],
							);
						}
					}
				}
				body.push(newItem);
			}

			try {
				responseData = (await apiRequest.call(
					workflowNode,
					requestMethod,
					endPoint,
					body,
					qs,
				)) as any[];

				if (version === 1) {
					returnData.push(...body);
				} else if (version === 2) {
					returnData.push(
						...responseData.map((result: number, index: number) => {
							if (result === 0) {
								const errorMessage = `The row with the ID "${body[index].id}" could not be updated. It probably doesn't exist.`;
								if (workflowNode.continueOnFail()) {
									return { error: errorMessage };
								}
								throw new NodeApiError(
									workflowNode.getNode(),
									{ message: errorMessage },
									{ message: errorMessage, itemIndex: index },
								);
							}
							return {
								success: true,
							};
						}),
					);
				} else if (version === 3) {
					for (let i = body.length - 1; i >= 0; i--) {
						body[i] = { ...body[i], ...responseData[i] };
					}

					returnData.push(...body);
				}
			} catch (error) {
				if (workflowNode.continueOnFail()) {
					returnData.push({ error: error.toString() });
				}
				throw new NodeApiError(workflowNode.getNode(), error as JsonObject);
			}
		}
	}
	return [workflowNode.helpers.returnJsonArray(returnData)];
};
