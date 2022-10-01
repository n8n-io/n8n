import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import {
	IBinaryData,
	IDataObject,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeOperationError,
} from 'n8n-workflow';

import {
	mapEndpoint,
	serviceNowApiRequest,
	serviceNowDownloadAttachment,
	serviceNowRequestAllItems,
	sortData,
} from './GenericFunctions';

import { attachmentFields, attachmentOperations } from './AttachmentDescription';

import { businessServiceFields, businessServiceOperations } from './BusinessServiceDescription';

import {
	configurationItemsFields,
	configurationItemsOperations,
} from './ConfigurationItemsDescription';

import { departmentFields, departmentOperations } from './DepartmentDescription';

import { dictionaryFields, dictionaryOperations } from './DictionaryDescription';

import { incidentFields, incidentOperations } from './IncidentDescription';

import { tableRecordFields, tableRecordOperations } from './TableRecordDescription';

import { userFields, userOperations } from './UserDescription';

import { userGroupFields, userGroupOperations } from './UserGroupDescription';

import { userRoleFields, userRoleOperations } from './UserRoleDescription';

export class ServiceNow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ServiceNow',
		name: 'serviceNow',
		icon: 'file:servicenow.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume ServiceNow API',
		defaults: {
			name: 'ServiceNow',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'serviceNowOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
			{
				name: 'serviceNowBasicApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['basicAuth'],
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
						name: 'Basic Auth',
						value: 'basicAuth',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'oAuth2',
				description: 'Authentication method to use',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Attachment',
						value: 'attachment',
					},
					{
						name: 'Business Service',
						value: 'businessService',
					},
					{
						name: 'Configuration Item',
						value: 'configurationItems',
					},
					{
						name: 'Department',
						value: 'department',
					},
					{
						name: 'Dictionary',
						value: 'dictionary',
					},
					{
						name: 'Incident',
						value: 'incident',
					},
					{
						name: 'Table Record',
						value: 'tableRecord',
					},
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'User Group',
						value: 'userGroup',
					},
					{
						name: 'User Role',
						value: 'userRole',
					},
				],
				default: 'user',
			},
			// ATTACHMENT SERVICE
			...attachmentOperations,
			...attachmentFields,
			// BUSINESS SERVICE
			...businessServiceOperations,
			...businessServiceFields,
			// CONFIGURATION ITEMS
			...configurationItemsOperations,
			...configurationItemsFields,
			// DEPARTMENT
			...departmentOperations,
			...departmentFields,
			// DICTIONARY
			...dictionaryOperations,
			...dictionaryFields,
			// INCIDENT
			...incidentOperations,
			...incidentFields,
			// TABLE RECORD
			...tableRecordOperations,
			...tableRecordFields,
			// USER
			...userOperations,
			...userFields,
			// USER GROUP
			...userGroupOperations,
			...userGroupFields,
			// USER ROLE
			...userRoleOperations,
			...userRoleFields,
		],
	};

	methods = {
		loadOptions: {
			async getTables(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const response = await serviceNowApiRequest.call(
					this,
					'GET',
					`/now/doc/table/schema`,
					{},
					{},
				);
				for (const table of response.result) {
					returnData.push({
						name: table.label,
						value: table.value,
						description: table.value,
					});
				}
				return sortData(returnData);
			},
			// Get all the table column to display them to user
			async getColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const resource = this.getNodeParameter('resource', 0) as string;
				const operation = this.getNodeParameter('operation', 0) as string;
				const returnData: INodePropertyOptions[] = [];
				let tableName;
				if (resource === 'tableRecord') {
					tableName = this.getNodeParameter('tableName') as string;
				} else {
					tableName = mapEndpoint(resource, operation);
				}

				const qs = {
					sysparm_query: `name=${tableName}`,
					sysparm_fields: 'column_label,element',
				};
				const response = await serviceNowApiRequest.call(
					this,
					'GET',
					`/now/table/sys_dictionary`,
					{},
					qs,
				);
				for (const column of response.result) {
					if (column.element) {
						returnData.push({
							name: column.column_label,
							value: column.element,
						});
					}
				}
				return sortData(returnData);
			},
			async getBusinessServices(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs = {
					sysparm_fields: 'name,sys_id',
				};
				const response = await serviceNowApiRequest.call(
					this,
					'GET',
					`/now/table/cmdb_ci_service`,
					{},
					qs,
				);

				for (const column of response.result) {
					returnData.push({
						name: column.name,
						value: column.sys_id,
					});
				}
				return sortData(returnData);
			},
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const resource = this.getNodeParameter('resource', 0) as string;
				const operation = this.getNodeParameter('operation', 0) as string;

				const qs = {
					sysparm_fields: 'sys_id,user_name',
				};
				if (resource === 'incident' && operation === 'create') {
					const additionalFields = this.getNodeParameter('additionalFields') as IDataObject;
					const group = additionalFields.assignment_group;

					const response = await serviceNowRequestAllItems.call(
						this,
						'GET',
						'/now/table/sys_user_grmember',
						{},
						{
							sysparm_query: `group=${group}^`,
						},
					);

					for (const column of response) {
						if (column.user) {
							const responseData = await serviceNowApiRequest.call(
								this,
								'GET',
								`/now/table/sys_user/${column.user.value}`,
								{},
								{},
							);
							const user = responseData.result;

							returnData.push({
								name: user.user_name,
								value: user.sys_id,
							});
						}
					}
				} else {
					const response = await serviceNowRequestAllItems.call(
						this,
						'GET',
						'/now/table/sys_user',
						{},
						qs,
					);

					for (const column of response) {
						if (column.user_name) {
							returnData.push({
								name: column.user_name,
								value: column.sys_id,
							});
						}
					}
				}
				return sortData(returnData);
			},
			async getAssignmentGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs = {
					sysparm_fields: 'sys_id,name',
				};
				const response = await serviceNowRequestAllItems.call(
					this,
					'GET',
					'/now/table/sys_user_group',
					{},
					qs,
				);

				for (const column of response) {
					if (column.name) {
						returnData.push({
							name: column.name,
							value: column.sys_id,
						});
					}
				}
				return sortData(returnData);
			},
			async getUserRoles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs = {
					sysparm_fields: 'sys_id,name',
				};
				const response = await serviceNowRequestAllItems.call(
					this,
					'GET',
					'/now/table/sys_user_role',
					{},
					qs,
				);

				for (const column of response) {
					if (column.name) {
						returnData.push({
							name: column.name,
							value: column.sys_id,
						});
					}
				}
				return sortData(returnData);
			},
			async getConfigurationItems(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs = {
					sysparm_fields: 'sys_id,name,sys_class_name',
				};
				const response = await serviceNowRequestAllItems.call(
					this,
					'GET',
					'/now/table/cmdb_ci',
					{},
					qs,
				);

				for (const column of response) {
					if (column.name) {
						returnData.push({
							name: column.name,
							value: column.sys_id,
							description: column.sys_class_name,
						});
					}
				}
				return sortData(returnData);
			},
			async getIncidentCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs = {
					sysparm_fields: 'label,value',
					sysparm_query: 'element=category^name=incident',
				};
				const response = await serviceNowRequestAllItems.call(
					this,
					'GET',
					'/now/table/sys_choice',
					{},
					qs,
				);

				for (const column of response) {
					returnData.push({
						name: column.label,
						value: column.value,
					});
				}
				return sortData(returnData);
			},
			async getIncidentSubcategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const operation = this.getNodeParameter('operation');
				let category;
				if (operation === 'update') {
					const updateFields = this.getNodeParameter('updateFields') as IDataObject;
					category = updateFields.category;
				} else {
					const additionalFields = this.getNodeParameter('additionalFields') as IDataObject;
					category = additionalFields.category;
				}
				const qs = {
					sysparm_fields: 'label,value',
					sysparm_query: `name=incident^element=subcategory^dependent_value=${category}`,
				};
				const response = await serviceNowRequestAllItems.call(
					this,
					'GET',
					'/now/table/sys_choice',
					{},
					qs,
				);

				for (const column of response) {
					returnData.push({
						name: column.label,
						value: column.value,
					});
				}

				return sortData(returnData);
			},
			async getIncidentStates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs = {
					sysparm_fields: 'label,value',
					sysparm_query: 'element=state^name=incident',
				};
				const response = await serviceNowRequestAllItems.call(
					this,
					'GET',
					'/now/table/sys_choice',
					{},
					qs,
				);

				for (const column of response) {
					returnData.push({
						name: column.label,
						value: column.value,
					});
				}
				return sortData(returnData);
			},
			async getIncidentResolutionCodes(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs = {
					sysparm_fields: 'label,value',
					sysparm_query: 'element=close_code^name=incident',
				};
				const response = await serviceNowRequestAllItems.call(
					this,
					'GET',
					'/now/table/sys_choice',
					{},
					qs,
				);

				for (const column of response) {
					returnData.push({
						name: column.label,
						value: column.value,
					});
				}
				return sortData(returnData);
			},
			async getIncidentHoldReasons(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs = {
					sysparm_fields: 'label,value',
					sysparm_query: 'element=hold_reason^name=incident',
				};
				const response = await serviceNowRequestAllItems.call(
					this,
					'GET',
					'/now/table/sys_choice',
					{},
					qs,
				);

				for (const column of response) {
					returnData.push({
						name: column.label,
						value: column.value,
					});
				}
				return sortData(returnData);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let responseData = {};
		let qs: IDataObject;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			try {
				// https://developer.servicenow.com/dev.do#!/reference/api/rome/rest/c_AttachmentAPI
				if (resource === 'attachment') {
					if (operation === 'get') {
						const attachmentsSysId = this.getNodeParameter('attachmentId', i) as string;
						const download = this.getNodeParameter('download', i) as boolean;
						const endpoint = `/now/attachment/${attachmentsSysId}`;

						const response = await serviceNowApiRequest.call(this, 'GET', endpoint, {});
						const fileMetadata = response.result;

						responseData = {
							json: fileMetadata,
						};

						if (download) {
							const outputField = this.getNodeParameter('outputField', i) as string;
							responseData = {
								...responseData,
								binary: {
									[outputField]: await serviceNowDownloadAttachment.call(
										this,
										endpoint,
										fileMetadata.file_name,
										fileMetadata.content_type,
									),
								},
							};
						}
					} else if (operation === 'getAll') {
						const download = this.getNodeParameter('download', i) as boolean;
						const tableName = this.getNodeParameter('tableName', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const options = this.getNodeParameter('options', i) as IDataObject;

						qs = {} as IDataObject;

						qs.sysparm_query = `table_name=${tableName}`;

						if (options.queryFilter) {
							qs.sysparm_query = `${qs.sysparm_query}^${options.queryFilter}`;
						}

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.sysparm_limit = limit;
							const response = await serviceNowApiRequest.call(
								this,
								'GET',
								'/now/attachment',
								{},
								qs,
							);
							responseData = response.result;
						} else {
							responseData = await serviceNowRequestAllItems.call(
								this,
								'GET',
								'/now/attachment',
								{},
								qs,
							);
						}

						if (download) {
							const outputField = this.getNodeParameter('outputField', i) as string;
							const responseDataWithAttachments: IDataObject[] = [];

							for (const data of responseData as IDataObject[]) {
								responseDataWithAttachments.push({
									json: data,
									binary: {
										[outputField]: await serviceNowDownloadAttachment.call(
											this,
											`/now/attachment/${data.sys_id}`,
											data.file_name as string,
											data.content_type as string,
										),
									},
								});
							}

							responseData = responseDataWithAttachments;
						} else {
							responseData = (responseData as IDataObject[]).map((data) => ({ json: data }));
						}
					} else if (operation === 'upload') {
						const tableName = this.getNodeParameter('tableName', i) as string;
						const recordId = this.getNodeParameter('id', i) as string;
						const inputDataFieldName = this.getNodeParameter('inputDataFieldName', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;

						let binaryData: IBinaryData;

						if (items[i].binary && items[i].binary![inputDataFieldName]) {
							binaryData = items[i].binary![inputDataFieldName];
						} else {
							throw new NodeOperationError(
								this.getNode(),
								`No binary data property "${inputDataFieldName}" does not exists on item!`,
								{ itemIndex: i },
							);
						}

						const headers: IDataObject = {
							'Content-Type': binaryData.mimeType,
						};

						const qs: IDataObject = {
							table_name: tableName,
							table_sys_id: recordId,
							file_name: binaryData.fileName
								? binaryData.fileName
								: `${inputDataFieldName}.${binaryData.fileExtension}`,
							...options,
						};

						const body = (await this.helpers.getBinaryDataBuffer(i, inputDataFieldName)) as Buffer;

						const response = await serviceNowApiRequest.call(
							this,
							'POST',
							'/now/attachment/file',
							body,
							qs,
							'',
							{ headers },
						);
						responseData = response.result;
					} else if (operation === 'delete') {
						const attachmentsSysId = this.getNodeParameter('attachmentId', i) as string;
						await serviceNowApiRequest.call(this, 'DELETE', `/now/attachment/${attachmentsSysId}`);
						responseData = { success: true };
					}
				} else if (resource === 'businessService') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						qs = this.getNodeParameter('options', i) as IDataObject;

						if (qs.sysparm_fields && typeof qs.sysparm_fields !== 'string') {
							qs.sysparm_fields = (qs.sysparm_fields as string[]).join(',');
						}

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.sysparm_limit = limit;
							const response = await serviceNowApiRequest.call(
								this,
								'GET',
								'/now/table/cmdb_ci_service',
								{},
								qs,
							);
							responseData = response.result;
						} else {
							responseData = await serviceNowRequestAllItems.call(
								this,
								'GET',
								'/now/table/cmdb_ci_service',
								{},
								qs,
							);
						}
					}
				} else if (resource === 'configurationItems') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						qs = this.getNodeParameter('options', i) as IDataObject;

						if (qs.sysparm_fields && typeof qs.sysparm_fields !== 'string') {
							qs.sysparm_fields = (qs.sysparm_fields as string[]).join(',');
						}

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.sysparm_limit = limit;
							const response = await serviceNowApiRequest.call(
								this,
								'GET',
								'/now/table/cmdb_ci',
								{},
								qs,
							);
							responseData = response.result;
						} else {
							responseData = await serviceNowRequestAllItems.call(
								this,
								'GET',
								'/now/table/cmdb_ci',
								{},
								qs,
							);
						}
					}
				} else if (resource === 'department') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						qs = this.getNodeParameter('options', i) as IDataObject;

						if (qs.sysparm_fields && typeof qs.sysparm_fields !== 'string') {
							qs.sysparm_fields = (qs.sysparm_fields as string[]).join(',');
						}

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.sysparm_limit = limit;
							const response = await serviceNowApiRequest.call(
								this,
								'GET',
								'/now/table/cmn_department',
								{},
								qs,
							);
							responseData = response.result;
						} else {
							responseData = await serviceNowRequestAllItems.call(
								this,
								'GET',
								'/now/table/cmn_department',
								{},
								qs,
							);
						}
					}
				} else if (resource === 'dictionary') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						qs = this.getNodeParameter('options', i) as IDataObject;

						if (qs.sysparm_fields && typeof qs.sysparm_fields !== 'string') {
							qs.sysparm_fields = (qs.sysparm_fields as string[]).join(',');
						}

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.sysparm_limit = limit;
							const response = await serviceNowApiRequest.call(
								this,
								'GET',
								'/now/table/sys_dictionary',
								{},
								qs,
							);
							responseData = response.result;
						} else {
							responseData = await serviceNowRequestAllItems.call(
								this,
								'GET',
								'/now/table/sys_dictionary',
								{},
								qs,
							);
						}
					}
				} else if (resource === 'incident') {
					if (operation === 'create') {
						const shortDescription = this.getNodeParameter('short_description', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body = {
							short_description: shortDescription,
							...additionalFields,
						};

						const response = await serviceNowApiRequest.call(
							this,
							'POST',
							`/now/table/incident`,
							body,
						);
						responseData = response.result;
					} else if (operation === 'delete') {
						const id = this.getNodeParameter('id', i) as string;
						responseData = await serviceNowApiRequest.call(
							this,
							'DELETE',
							`/now/table/incident/${id}`,
						);
						responseData = { success: true };
					} else if (operation === 'get') {
						const id = this.getNodeParameter('id', i) as string;
						qs = this.getNodeParameter('options', i) as IDataObject;

						if (qs.sysparm_fields && typeof qs.sysparm_fields !== 'string') {
							qs.sysparm_fields = (qs.sysparm_fields as string[]).join(',');
						}

						const response = await serviceNowApiRequest.call(
							this,
							'GET',
							`/now/table/incident/${id}`,
							{},
							qs,
						);
						responseData = response.result;
					} else if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						qs = this.getNodeParameter('options', i) as IDataObject;

						if (qs.sysparm_fields && typeof qs.sysparm_fields !== 'string') {
							qs.sysparm_fields = (qs.sysparm_fields as string[]).join(',');
						}

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.sysparm_limit = limit;
							const response = await serviceNowApiRequest.call(
								this,
								'GET',
								`/now/table/incident`,
								{},
								qs,
							);
							responseData = response.result;
						} else {
							responseData = await serviceNowRequestAllItems.call(
								this,
								'GET',
								`/now/table/incident`,
								{},
								qs,
							);
						}
					} else if (operation === 'update') {
						const id = this.getNodeParameter('id', i) as string;
						const body = this.getNodeParameter('updateFields', i) as IDataObject;

						const response = await serviceNowApiRequest.call(
							this,
							'PATCH',
							`/now/table/incident/${id}`,
							body,
						);
						responseData = response.result;
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'tableRecord') {
					if (operation === 'create') {
						const tableName = this.getNodeParameter('tableName', i) as string;
						const dataToSend = this.getNodeParameter('dataToSend', i) as string;
						let body = {};

						if (dataToSend === 'mapInput') {
							const inputsToIgnore = (this.getNodeParameter('inputsToIgnore', i) as string)
								.split(',')
								.map((field) => field.trim());
							body = Object.entries(items[i].json)
								.filter(([key]) => !inputsToIgnore.includes(key))
								.reduce((obj, [key, val]) => Object.assign(obj, { [key]: val }), {});
						} else if (dataToSend === 'columns') {
							const fieldsToSend = this.getNodeParameter('fieldsToSend', i) as {
								field: IDataObject[];
							};
							body = fieldsToSend.field.reduce((obj, field) => {
								obj[field.column as string] = field.value;
								return obj;
							}, {});
						}

						const response = await serviceNowApiRequest.call(
							this,
							'POST',
							`/now/table/${tableName}`,
							body,
						);
						responseData = response.result;
					} else if (operation === 'delete') {
						const tableName = this.getNodeParameter('tableName', i) as string;
						const id = this.getNodeParameter('id', i) as string;
						responseData = await serviceNowApiRequest.call(
							this,
							'DELETE',
							`/now/table/${tableName}/${id}`,
						);
						responseData = { success: true };
					} else if (operation === 'get') {
						const tableName = this.getNodeParameter('tableName', i) as string;
						const id = this.getNodeParameter('id', i) as string;
						qs = this.getNodeParameter('options', i) as IDataObject;

						if (qs.sysparm_fields && typeof qs.sysparm_fields !== 'string') {
							qs.sysparm_fields = (qs.sysparm_fields as string[]).join(',');
						}

						const response = await serviceNowApiRequest.call(
							this,
							'GET',
							`/now/table/${tableName}/${id}`,
							{},
							qs,
						);
						responseData = response.result;
					} else if (operation === 'getAll') {
						const tableName = this.getNodeParameter('tableName', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						qs = this.getNodeParameter('options', i) as IDataObject;

						if (qs.sysparm_fields && typeof qs.sysparm_fields !== 'string') {
							qs.sysparm_fields = (qs.sysparm_fields as string[]).join(',');
						}

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.sysparm_limit = limit;
							const response = await serviceNowApiRequest.call(
								this,
								'GET',
								`/now/table/${tableName}`,
								{},
								qs,
							);
							responseData = response.result;
						} else {
							responseData = await serviceNowRequestAllItems.call(
								this,
								'GET',
								`/now/table/${tableName}`,
								{},
								qs,
							);
						}
					} else if (operation === 'update') {
						const tableName = this.getNodeParameter('tableName', i) as string;
						const id = this.getNodeParameter('id', i) as string;
						const dataToSend = this.getNodeParameter('dataToSend', i) as string;
						let body = {};

						if (dataToSend === 'mapInput') {
							const inputsToIgnore = (this.getNodeParameter('inputsToIgnore', i) as string)
								.split(',')
								.map((field) => field.trim());
							body = Object.entries(items[i].json)
								.filter(([key]) => !inputsToIgnore.includes(key))
								.reduce((obj, [key, val]) => Object.assign(obj, { [key]: val }), {});
						} else if (dataToSend === 'columns') {
							const fieldsToSend = this.getNodeParameter('fieldsToSend', i) as {
								field: IDataObject[];
							};
							body = fieldsToSend.field.reduce((obj, field) => {
								obj[field.column as string] = field.value;
								return obj;
							}, {});
						}

						const response = await serviceNowApiRequest.call(
							this,
							'PATCH',
							`/now/table/${tableName}/${id}`,
							body,
						);
						responseData = response.result;
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'user') {
					if (operation === 'create') {
						const body = this.getNodeParameter('additionalFields', i) as IDataObject;

						const response = await serviceNowApiRequest.call(
							this,
							'POST',
							'/now/table/sys_user',
							body,
						);
						responseData = response.result;
					} else if (operation === 'delete') {
						const id = this.getNodeParameter('id', i) as string;
						responseData = await serviceNowApiRequest.call(
							this,
							'DELETE',
							`/now/table/sys_user/${id}`,
						);
						responseData = { success: true };
					} else if (operation === 'get') {
						const getOption = this.getNodeParameter('getOption', i) as string;
						qs = this.getNodeParameter('options', i) as IDataObject;

						if (qs.sysparm_fields && typeof qs.sysparm_fields !== 'string') {
							qs.sysparm_fields = (qs.sysparm_fields as string[]).join(',');
						}

						if (getOption === 'id') {
							const id = this.getNodeParameter('id', i) as string;
							const response = await serviceNowApiRequest.call(
								this,
								'GET',
								`/now/table/sys_user/${id}`,
								{},
								qs,
							);
							responseData = response.result;
						} else {
							const userName = this.getNodeParameter('user_name', i) as string;
							qs.sysparm_query = `user_name=${userName}`;
							qs.sysparm_limit = 1;
							const response = await serviceNowApiRequest.call(
								this,
								'GET',
								'/now/table/sys_user',
								{},
								qs,
							);
							responseData = response.result;
						}
					} else if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						qs = this.getNodeParameter('options', i) as IDataObject;

						if (qs.sysparm_fields && typeof qs.sysparm_fields !== 'string') {
							qs.sysparm_fields = (qs.sysparm_fields as string[]).join(',');
						}

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.sysparm_limit = limit;
							const response = await serviceNowApiRequest.call(
								this,
								'GET',
								'/now/table/sys_user',
								{},
								qs,
							);
							responseData = response.result;
						} else {
							responseData = await serviceNowRequestAllItems.call(
								this,
								'GET',
								'/now/table/sys_user',
								{},
								qs,
							);
						}
					} else if (operation === 'update') {
						const id = this.getNodeParameter('id', i) as string;
						const body = this.getNodeParameter('updateFields', i) as IDataObject;

						const response = await serviceNowApiRequest.call(
							this,
							'PATCH',
							`/now/table/sys_user/${id}`,
							body,
						);
						responseData = response.result;
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'userGroup') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						qs = this.getNodeParameter('options', i) as IDataObject;

						if (qs.sysparm_fields && typeof qs.sysparm_fields !== 'string') {
							qs.sysparm_fields = (qs.sysparm_fields as string[]).join(',');
						}

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.sysparm_limit = limit;
							const response = await serviceNowApiRequest.call(
								this,
								'GET',
								'/now/table/sys_user_group',
								{},
								qs,
							);
							responseData = response.result;
						} else {
							responseData = await serviceNowRequestAllItems.call(
								this,
								'GET',
								'/now/table/sys_user_group',
								{},
								qs,
							);
						}
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else if (resource === 'userRole') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						qs = this.getNodeParameter('options', i) as IDataObject;

						if (qs.sysparm_fields && typeof qs.sysparm_fields !== 'string') {
							qs.sysparm_fields = (qs.sysparm_fields as string[]).join(',');
						}

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							qs.sysparm_limit = limit;
							const response = await serviceNowApiRequest.call(
								this,
								'GET',
								'/now/table/sys_user_role',
								{},
								qs,
							);
							responseData = response.result;
						} else {
							responseData = await serviceNowRequestAllItems.call(
								this,
								'GET',
								'/now/table/sys_user_role',
								{},
								qs,
							);
						}
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, {
						itemIndex: i,
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}

				throw error;
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		}

		if (resource === 'attachment') {
			if (operation === 'get' || operation === 'getAll') {
				return this.prepareOutputData(returnData as INodeExecutionData[]);
			}
		}
		return this.prepareOutputData(returnData);
	}
}
