import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	serviceNowApiRequest,
	serviceNowRequestAllItems,
} from './GenericFunctions';

import {
	tableRecordFields,
	tableRecordOperations,
} from './TableRecordDescription';

import {
	incidentFields,
	incidentOperations,
} from './IncidentDescription';

import {
	userFields,
	userOperations,
} from './UserDescription';

export class ServiceNow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Service Now',
		name: 'serviceNow',
		icon: 'file:servicenow.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Service Now API',
		defaults: {
			name: 'Service Now',
			color: '#81b5a1',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'serviceNowOAuth2Api',
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

				],
				default: 'user',
				description: 'Resource to consume.',
			},

			// TABLE RECORD
			...tableRecordOperations,
			...tableRecordFields,
			// INCIDENT
			...incidentOperations,
			...incidentFields,
			// USER
			...userOperations,
			...userFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the table column to display them to user
			async getTableColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const tableName = this.getNodeParameter('tableName') as string;
				const qs = {
					sysparm_query: `name=${tableName}`,
					sysparm_fields: 'column_label,element'
				}
				const response = await serviceNowApiRequest.call(this, 'GET', `/now/table/sys_dictionary`, {}, qs);
				for (const column of response.result) {
					if(column.element){
						returnData.push({
							name: column.column_label,
							value: column.element,
						});
					}
				}
				returnData.sort((a, b) => {
					if (a.name < b.name) { return -1; }
					if (a.name > b.name) { return 1; }
					return 0;
				});
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		let responseData = {};
		let qs: IDataObject;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {

			if (resource === 'tableRecord') {

				if (operation === 'create') {

					const tableName = this.getNodeParameter('tableName', i) as string;
					const json = this.getNodeParameter('json', i) as boolean;
					let body = {};
					if (json) {
						const jsonData = this.getNodeParameter('jsonData', i) as string;
						body = JSON.parse(jsonData);
					} else {
						const inputFields = this.getNodeParameter('inputFields', i) as {
							field: IDataObject[]
						};
						body = inputFields.field.reduce((obj,field) => {
							obj[field.column as string] = field.value;
							return obj;
						},{});
					}

					const response = await serviceNowApiRequest.call(this, 'POST', `/now/table/${tableName}`, body)
					responseData = response.result;

				} else if (operation === 'delete') {

					const tableName = this.getNodeParameter('tableName', i) as string;
					const id = this.getNodeParameter('id', i) as string;
					responseData = await serviceNowApiRequest.call(this, 'DELETE', `/now/table/${tableName}/${id}`)
					responseData = {success : true};

				} else if (operation === 'get') {

					const tableName = this.getNodeParameter('tableName', i) as string;
					const id = this.getNodeParameter('id', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					qs = additionalFields;

					const response = await serviceNowApiRequest.call(this, 'GET', `/now/table/${tableName}/${id}`, {}, qs)
					responseData = response.result;

				} else if (operation === 'getAll') {

					const tableName = this.getNodeParameter('tableName', i) as string;

					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					qs = additionalFields;
					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i) as number;
						qs.sysparm_limit = limit;
						const response = await serviceNowApiRequest.call(this, 'GET', `/now/table/${tableName}`, {}, qs);
						responseData = response.result;
					} else {
						responseData = await serviceNowRequestAllItems.call(this, 'GET', `/now/table/${tableName}`, {}, qs);
					}


				} else if (operation === 'update') {

					const tableName = this.getNodeParameter('tableName', i) as string;
					const id = this.getNodeParameter('id', i) as string;
					const json = this.getNodeParameter('json', i) as boolean;
					let body = {};
					if (json) {
						const jsonData = this.getNodeParameter('jsonData', i) as string;
						body = JSON.parse(jsonData);
					} else {
						const updateFields = this.getNodeParameter('updateFields', i) as {
							field: IDataObject[]
						};
						body = updateFields.field.reduce((obj,field) => {
							obj[field.column as string] = field.value;
							return obj;
						},{});
					}

					const response = await serviceNowApiRequest.call(this, 'PATCH', `/now/table/${tableName}/${id}`, body)
					responseData = response.result;

				} else {
					throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
				}
			} else if (resource === 'incident') {

				if (operation === 'create') {

					const short_description = this.getNodeParameter('short_description', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body = {
						short_description,
						...additionalFields,
					}

					const response = await serviceNowApiRequest.call(this, 'POST', `/now/table/incident`, body)
					responseData = response.result;

				} else if (operation === 'delete') {

					const id = this.getNodeParameter('id', i) as string;
					responseData = await serviceNowApiRequest.call(this, 'DELETE', `/now/table/incident/${id}`)
					responseData = {success : true};

				} else if (operation === 'get') {

					const id = this.getNodeParameter('id', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					qs = additionalFields;

					const response = await serviceNowApiRequest.call(this, 'GET', `/now/table/incident/${id}`, {}, qs)
					responseData = response.result;

				} else if (operation === 'getAll') {

					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					qs = additionalFields;
					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i) as number;
						qs.sysparm_limit = limit;
						const response = await serviceNowApiRequest.call(this, 'GET', `/now/table/incident`, {}, qs);
						responseData = response.result;
					} else {
						responseData = await serviceNowRequestAllItems.call(this, 'GET', `/now/table/incident`, {}, qs);
					}

				} else if (operation === 'update') {

					const id = this.getNodeParameter('id', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					let body = updateFields;

					const response = await serviceNowApiRequest.call(this, 'PATCH', `/now/table/incident/${id}`, body)
					responseData = response.result;

				} else {
					throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
				}
			}  else if (resource === 'user') {

				if (operation === 'create') {

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body = additionalFields;

					if (body.roles) {
						body.roles = (body.roles as string).split(',');
					}

					const response = await serviceNowApiRequest.call(this, 'POST', `/now/table/sys_user`, body)
					responseData = response.result;

				} else if (operation === 'delete') {

					const id = this.getNodeParameter('id', i) as string;
					responseData = await serviceNowApiRequest.call(this, 'DELETE', `/now/table/sys_user/${id}`)
					responseData = {success : true};

				} else if (operation === 'get') {

					const getOption = this.getNodeParameter('getOption', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					qs = additionalFields;

					if (getOption === 'id') {
						const id = this.getNodeParameter('id', i) as string;
						const response = await serviceNowApiRequest.call(this, 'GET', `/now/table/sys_user/${id}`, {}, qs)
						responseData = response.result;
					} else {
						const user_name = this.getNodeParameter('user_name', i) as string;
						qs.sysparm_query = `user_name=${user_name}`;
						qs.sysparm_limit = 1;
						const response = await serviceNowApiRequest.call(this, 'GET', `/now/table/sys_user`, {}, qs)
						responseData = response.result;
					}

				} else if (operation === 'getAll') {

					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					qs = additionalFields;
					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i) as number;
						qs.sysparm_limit = limit;
						const response = await serviceNowApiRequest.call(this, 'GET', `/now/table/sys_user`, {}, qs);
						responseData = response.result;
					} else {
						responseData = await serviceNowRequestAllItems.call(this, 'GET', `/now/table/sys_user`, {}, qs);
					}

				} else if (operation === 'update') {

					const id = this.getNodeParameter('id', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					let body = updateFields;

					if (body.roles) {
						body.roles = (body.roles as string).split(',');
					}

					const response = await serviceNowApiRequest.call(this, 'PATCH', `/now/table/sys_user/${id}`, body)
					responseData = response.result;

				} else {
					throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
				}
			} else {
				throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
