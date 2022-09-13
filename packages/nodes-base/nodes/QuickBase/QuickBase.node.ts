/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	getFieldsObject,
	quickbaseApiRequest,
	quickbaseApiRequestAllItems,
} from './GenericFunctions';

import { fieldFields, fieldOperations } from './FieldDescription';

import { fileFields, fileOperations } from './FileDescription';

import { recordFields, recordOperations } from './RecordDescription';

import { reportFields, reportOperations } from './ReportDescription';

export class QuickBase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Quick Base',
		name: 'quickbase',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:quickbase.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Integrate with the Quick Base RESTful API',
		defaults: {
			name: 'Quick Base',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'quickbaseApi',
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
						name: 'Field',
						value: 'field',
					},
					{
						name: 'File',
						value: 'file',
					},
					{
						name: 'Record',
						value: 'record',
					},
					{
						name: 'Report',
						value: 'report',
					},
				],
				default: 'record',
			},
			...fieldOperations,
			...fieldFields,
			...fileOperations,
			...fileFields,
			...recordOperations,
			...recordFields,
			...reportOperations,
			...reportFields,
		],
	};

	methods = {
		loadOptions: {
			async getTableFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const tableId = this.getCurrentNodeParameter('tableId') as string;
				const fields = await quickbaseApiRequest.call(this, 'GET', '/fields', {}, { tableId });
				for (const field of fields) {
					returnData.push({
						name: field.label,
						value: field.id,
					});
				}
				return returnData;
			},
			async getUniqueTableFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const tableId = this.getCurrentNodeParameter('tableId') as string;
				const fields = await quickbaseApiRequest.call(this, 'GET', '/fields', {}, { tableId });
				for (const field of fields) {
					//upsert can be achived just with fields that are set as unique and are no the primary key
					if (field.unique === true && field.properties.primaryKey === false) {
						returnData.push({
							name: field.label,
							value: field.id,
						});
					}
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		const headers: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		if (resource === 'field') {
			if (operation === 'getAll') {
				for (let i = 0; i < length; i++) {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					const tableId = this.getNodeParameter('tableId', i) as string;

					const options = this.getNodeParameter('options', i) as IDataObject;

					const qs: IDataObject = {
						tableId,
					};

					Object.assign(qs, options);

					responseData = await quickbaseApiRequest.call(this, 'GET', '/fields', {}, qs);

					if (returnAll === false) {
						const limit = this.getNodeParameter('limit', i) as number;

						responseData = responseData.splice(0, limit);
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}
		}

		if (resource === 'file') {
			if (operation === 'delete') {
				for (let i = 0; i < length; i++) {
					const tableId = this.getNodeParameter('tableId', i) as string;

					const recordId = this.getNodeParameter('recordId', i) as string;

					const fieldId = this.getNodeParameter('fieldId', i) as string;

					const versionNumber = this.getNodeParameter('versionNumber', i) as string;

					responseData = await quickbaseApiRequest.call(
						this,
						'DELETE',
						`/files/${tableId}/${recordId}/${fieldId}/${versionNumber}`,
					);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}

			if (operation === 'download') {
				for (let i = 0; i < length; i++) {
					const tableId = this.getNodeParameter('tableId', i) as string;

					const recordId = this.getNodeParameter('recordId', i) as string;

					const fieldId = this.getNodeParameter('fieldId', i) as string;

					const versionNumber = this.getNodeParameter('versionNumber', i) as string;

					const newItem: INodeExecutionData = {
						json: items[i].json,
						binary: {},
					};

					if (items[i].binary !== undefined) {
						// Create a shallow copy of the binary data so that the old
						// data references which do not get changed still stay behind
						// but the incoming data does not get changed.
						Object.assign(newItem.binary!, items[i].binary);
					}

					items[i] = newItem;

					const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', i) as string;

					responseData = await quickbaseApiRequest.call(
						this,
						'GET',
						`/files/${tableId}/${recordId}/${fieldId}/${versionNumber}`,
						{},
						{},
						{ json: false, resolveWithFullResponse: true },
					);

					//content-disposition': 'attachment; filename="dog-puppy-on-garden-royalty-free-image-1586966191.jpg"',
					const contentDisposition = responseData.headers['content-disposition'];

					const data = Buffer.from(responseData.body as string, 'base64');

					items[i].binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(
						data as unknown as Buffer,
						contentDisposition.split('=')[1],
					);
				}

				return this.prepareOutputData(items);
			}
		}

		if (resource === 'record') {
			if (operation === 'create') {
				const tableId = this.getNodeParameter('tableId', 0) as string;

				const simple = this.getNodeParameter('simple', 0) as boolean;

				const data: IDataObject[] = [];

				const options = this.getNodeParameter('options', 0) as IDataObject;

				for (let i = 0; i < length; i++) {
					const record: IDataObject = {};

					const columns = this.getNodeParameter('columns', i) as string;

					const columnList = columns.split(',').map((column) => column.trim());
					if (options.useFieldIDs === true) {
						for (const key of Object.keys(items[i].json)) {
							record[key] = { value: items[i].json[key] };
						}
					} else {
						const { fieldsLabelKey } = await getFieldsObject.call(this, tableId);
						for (const key of Object.keys(items[i].json)) {
							if (fieldsLabelKey.hasOwnProperty(key) && columnList.includes(key)) {
								record[fieldsLabelKey[key].toString()] = { value: items[i].json[key] };
							}
						}
					}

					data.push(record);
				}

				const body: IDataObject = {
					data,
					to: tableId,
				};

				// If no fields are set return at least the record id
				// 3 == Default Quickbase RecordID #
				body.fieldsToReturn = [3];

				if (options.fields) {
					body.fieldsToReturn = options.fields as string[];
				}

				responseData = await quickbaseApiRequest.call(this, 'POST', '/records', body);

				if (simple === true) {
					const { data: records } = responseData;
					responseData = [];

					for (const record of records) {
						const data: IDataObject = {};
						for (const [key, value] of Object.entries(record)) {
							data[key] = (value as IDataObject).value;
						}
						responseData.push(data);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: 0 } },
				);

				returnData.push(...executionData);
			}

			if (operation === 'delete') {
				for (let i = 0; i < length; i++) {
					const tableId = this.getNodeParameter('tableId', i) as string;

					const where = this.getNodeParameter('where', i) as string;

					const body: IDataObject = {
						from: tableId,
						where,
					};

					responseData = await quickbaseApiRequest.call(this, 'DELETE', '/records', body);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}

			if (operation === 'getAll') {
				for (let i = 0; i < length; i++) {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					const tableId = this.getNodeParameter('tableId', i) as string;

					const options = this.getNodeParameter('options', i) as IDataObject;

					const body: IDataObject = {
						from: tableId,
					};

					Object.assign(body, options);

					if (options.sortByUi) {
						const sort = (options.sortByUi as IDataObject).sortByValues as IDataObject[];
						body.sortBy = sort;
						delete body.sortByUi;
					}

					// if (options.groupByUi) {
					// 	const group = (options.groupByUi as IDataObject).groupByValues as IDataObject[];
					// 	body.groupBy = group;
					// 	delete body.groupByUi;
					// }

					if (returnAll) {
						responseData = await quickbaseApiRequestAllItems.call(
							this,
							'POST',
							'/records/query',
							body,
							qs,
						);
					} else {
						body.options = { top: this.getNodeParameter('limit', i) as number };

						responseData = await quickbaseApiRequest.call(this, 'POST', '/records/query', body, qs);

						const { data: records, fields } = responseData;
						responseData = [];

						const fieldsIdKey: { [key: string]: string } = {};

						for (const field of fields) {
							fieldsIdKey[field.id] = field.label;
						}

						for (const record of records) {
							const data: IDataObject = {};
							for (const [key, value] of Object.entries(record)) {
								data[fieldsIdKey[key]] = (value as IDataObject).value;
							}
							responseData.push(data);
						}
					}
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}

			if (operation === 'update') {
				const tableId = this.getNodeParameter('tableId', 0) as string;

				const { fieldsLabelKey, fieldsIdKey } = await getFieldsObject.call(this, tableId);

				const simple = this.getNodeParameter('simple', 0) as boolean;

				const updateKey = this.getNodeParameter('updateKey', 0) as string;

				const data: IDataObject[] = [];

				const options = this.getNodeParameter('options', 0) as IDataObject;

				for (let i = 0; i < length; i++) {
					const record: IDataObject = {};

					const columns = this.getNodeParameter('columns', i) as string;

					const columnList = columns.split(',').map((column) => column.trim());

					if (options.useFieldIDs === true) {
						for (const key of Object.keys(items[i].json)) {
							record[key] = { value: items[i].json[key] };
						}
					} else {
						const { fieldsLabelKey } = await getFieldsObject.call(this, tableId);
						for (const key of Object.keys(items[i].json)) {
							if (fieldsLabelKey.hasOwnProperty(key) && columnList.includes(key)) {
								record[fieldsLabelKey[key].toString()] = { value: items[i].json[key] };
							}
						}
					}

					if (items[i].json[updateKey] === undefined) {
						throw new NodeOperationError(
							this.getNode(),
							`The update key ${updateKey} could not be found in the input`,
							{ itemIndex: i },
						);
					}

					data.push(record);
				}

				const body: IDataObject = {
					data,
					to: tableId,
				};

				// If no fields are set return at least the record id
				// 3 == Default Quickbase RecordID #
				//body.fieldsToReturn = [fieldsLabelKey['Record ID#']];

				if (options.fields) {
					body.fieldsToReturn = options.fields as string[];
				}

				responseData = await quickbaseApiRequest.call(this, 'POST', '/records', body);

				if (simple === true) {
					const { data: records } = responseData;
					responseData = [];

					for (const record of records) {
						const data: IDataObject = {};
						for (const [key, value] of Object.entries(record)) {
							data[fieldsIdKey[key]] = (value as IDataObject).value;
						}
						responseData.push(data);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: 0 } },
				);

				returnData.push(...executionData);
			}

			if (operation === 'upsert') {
				const tableId = this.getNodeParameter('tableId', 0) as string;

				const simple = this.getNodeParameter('simple', 0) as boolean;

				const updateKey = this.getNodeParameter('updateKey', 0) as string;

				const mergeFieldId = this.getNodeParameter('mergeFieldId', 0) as string;

				const data: IDataObject[] = [];

				const options = this.getNodeParameter('options', 0) as IDataObject;

				for (let i = 0; i < length; i++) {
					const record: IDataObject = {};

					const columns = this.getNodeParameter('columns', i) as string;

					const columnList = columns.split(',').map((column) => column.trim());

					if (options.useFieldIDs === true) {
						for (const key of Object.keys(items[i].json)) {
							record[key] = { value: items[i].json[key] };
						}
					} else {
						const { fieldsLabelKey } = await getFieldsObject.call(this, tableId);
						for (const key of Object.keys(items[i].json)) {
							if (fieldsLabelKey.hasOwnProperty(key) && columnList.includes(key)) {
								record[fieldsLabelKey[key].toString()] = { value: items[i].json[key] };
							}
						}
					}

					if (items[i].json[updateKey] === undefined) {
						throw new NodeOperationError(
							this.getNode(),
							`The update key ${updateKey} could not be found in the input`,
							{ itemIndex: i },
						);
					}

					record[mergeFieldId] = { value: items[i].json[updateKey] };

					data.push(record);
				}

				const body: IDataObject = {
					data,
					to: tableId,
					mergeFieldId,
				};

				// If no fields are set return at least the record id
				// 3 == Default Quickbase RecordID #
				body.fieldsToReturn = [3];

				if (options.fields) {
					body.fieldsToReturn = options.fields as string[];
				}

				responseData = await quickbaseApiRequest.call(this, 'POST', '/records', body);

				if (simple === true) {
					const { data: records } = responseData;
					responseData = [];

					for (const record of records) {
						const data: IDataObject = {};
						for (const [key, value] of Object.entries(record)) {
							data[key] = (value as IDataObject).value;
						}
						responseData.push(data);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: 0 } },
				);

				returnData.push(...executionData);
			}
		}

		if (resource === 'report') {
			if (operation === 'run') {
				for (let i = 0; i < length; i++) {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					const tableId = this.getNodeParameter('tableId', i) as string;

					const reportId = this.getNodeParameter('reportId', i) as string;

					qs.tableId = tableId;

					if (returnAll) {
						responseData = await quickbaseApiRequestAllItems.call(
							this,
							'POST',
							`/reports/${reportId}/run`,
							{},
							qs,
						);
					} else {
						qs.top = this.getNodeParameter('limit', i) as number;

						responseData = await quickbaseApiRequest.call(
							this,
							'POST',
							`/reports/${reportId}/run`,
							{},
							qs,
						);

						const { data: records, fields } = responseData;
						responseData = [];

						const fieldsIdKey: { [key: string]: string } = {};

						for (const field of fields) {
							fieldsIdKey[field.id] = field.label;
						}

						for (const record of records) {
							const data: IDataObject = {};
							for (const [key, value] of Object.entries(record)) {
								data[fieldsIdKey[key]] = (value as IDataObject).value;
							}
							responseData.push(data);
						}
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}

			if (operation === 'get') {
				for (let i = 0; i < length; i++) {
					const reportId = this.getNodeParameter('reportId', i) as string;

					const tableId = this.getNodeParameter('tableId', i) as string;

					qs.tableId = tableId;

					responseData = await quickbaseApiRequest.call(
						this,
						'GET',
						`/reports/${reportId}`,
						{},
						qs,
					);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);

					returnData.push(...executionData);
				}
			}
		}

		return this.prepareOutputData(returnData);
	}
}
