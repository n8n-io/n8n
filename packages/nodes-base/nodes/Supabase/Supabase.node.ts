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
	superbaseApiRequest,
} from './GenericFunctions';

import {
	rowFields,
	rowOperations,
} from './RowDescription';

export type FieldsUiValues = Array<{
	fieldId: string;
	fieldValue: string;
}>;

export class Supabase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Supabase',
		name: 'supabase',
		icon: 'file:supabase.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Add, get, delete and update data in a table',
		defaults: {
			name: 'Supabase',
			color: '#ea5929',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'supabaseApi',
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
			},
			...rowOperations,
			...rowFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		if (resource === 'row') {
			if (operation === 'create') {
				const records: IDataObject[] = [];
				const tableId = this.getNodeParameter('tableId', 0) as string;
				for (let i = 0; i < length; i++) {
					const record: IDataObject = {};
					const dataToSend = this.getNodeParameter('dataToSend', 0) as 'defineBelow' | 'autoMapInputData';

					if (dataToSend === 'autoMapInputData') {
						const incomingKeys = Object.keys(items[i].json);
						const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
						const inputDataToIgnore = rawInputsToIgnore.split(',').map(c => c.trim());

						for (const key of incomingKeys) {
							if (inputDataToIgnore.includes(key)) continue;
							record[key] = items[i].json[key];
						}
					} else {
						const fields = this.getNodeParameter('fieldsUi.fieldValues', i, []) as FieldsUiValues;
						for (const field of fields) {
							record[`${field.fieldId}`] = field.fieldValue;
						}
					}
					records.push(record);
				}
				const endpoint = `/${tableId}`;
				const createdRow = await superbaseApiRequest.call(this, 'POST', endpoint, records);
				returnData.push(...createdRow);
			}

			if (operation === 'update') {
				const tableId = this.getNodeParameter('tableId', 0) as string;
				const filterType = this.getNodeParameter('filterType', 0) as string;
				let endpoint = `/${tableId}`;
				for (let i = 0; i < length; i++) {

					if (filterType === 'manual') {
						const matchType = this.getNodeParameter('matchType', 0) as string;
						const keys = this.getNodeParameter('filters.conditions', i, []) as IDataObject[];
						if (matchType === 'allFilters') {
							const data = keys.reduce((obj, value) => Object.assign(obj, { [`${value.keyName}`]: `${value.condition}.${value.keyValue}` }), {});
							Object.assign(qs, data);
						}
						if (matchType === 'anyFilter') {
							const data = keys.map((key) => `${key.keyName}.${key.condition}.${key.keyValue}`);
							Object.assign(qs, { or: `(${data.join(',')})` });
						}
					}

					if (filterType === 'string') {
						const filterString = this.getNodeParameter('filterString', i) as string;
						endpoint = `${endpoint}?${encodeURI(filterString)}`;
					}

					const record: IDataObject = {};
					const dataToSend = this.getNodeParameter('dataToSend', 0) as 'defineBelow' | 'autoMapInputData';

					if (dataToSend === 'autoMapInputData') {
						const incomingKeys = Object.keys(items[i].json);
						const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
						const inputDataToIgnore = rawInputsToIgnore.split(',').map(c => c.trim());

						for (const key of incomingKeys) {
							if (inputDataToIgnore.includes(key)) continue;
							record[key] = items[i].json[key];
						}
					} else {
						const fields = this.getNodeParameter('fieldsUi.fieldValues', i, []) as FieldsUiValues;
						for (const field of fields) {
							record[`${field.fieldId}`] = field.fieldValue;
						}
					}
					const updatedRow = await superbaseApiRequest.call(this, 'PATCH', endpoint, record, qs);
					returnData.push(...updatedRow);
				}
			}

			if (operation === 'getAll') {
				const tableId = this.getNodeParameter('tableId', 0) as string;
				const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
				const filterType = this.getNodeParameter('filterType', 0) as string;
				let endpoint = `/${tableId}`;
				for (let i = 0; i < length; i++) {

					if (filterType === 'manual') {
						const matchType = this.getNodeParameter('matchType', 0) as string;
						const keys = this.getNodeParameter('filters.conditions', i, []) as IDataObject[];
						if (matchType === 'allFilters') {
							const data = keys.reduce((obj, value) => Object.assign(obj, { [`${value.keyName}`]: `${value.condition}.${value.keyValue}` }), {});
							Object.assign(qs, data);
						}
						if (matchType === 'anyFilter') {
							const data = keys.map((key) => `${key.keyName}.${key.condition}.${key.keyValue}`);
							Object.assign(qs, { or: `(${data.join(',')})` });
						}
					}

					if (filterType === 'string') {
						const filterString = this.getNodeParameter('filterString', i) as string;
						endpoint = `${endpoint}?${encodeURI(filterString)}`;
					}

					if (returnAll === false) {
						qs.limit = this.getNodeParameter('limit', 0) as number;
					}
					const rows = await superbaseApiRequest.call(this, 'GET', endpoint, {}, qs);
					returnData.push(...rows);
				}
			}

			if (operation === 'delete') {
				const tableId = this.getNodeParameter('tableId', 0) as string;
				const filterType = this.getNodeParameter('filterType', 0) as string;
				let endpoint = `/${tableId}`;
				for (let i = 0; i < length; i++) {

					if (filterType === 'manual') {
						const matchType = this.getNodeParameter('matchType', 0) as string;
						const keys = this.getNodeParameter('filters.conditions', i, []) as IDataObject[];
						
						if (!keys.length) {
							throw new NodeOperationError(this.getNode(), 'At least one filter must be defined');
						}

						if (matchType === 'allFilters') {
							const data = keys.reduce((obj, value) => Object.assign(obj, { [`${value.keyName}`]: `${value.condition}.${value.keyValue}` }), {});
							Object.assign(qs, data);
						}
						if (matchType === 'anyFilter') {
							const data = keys.map((key) => `${key.keyName}.${key.condition}.${key.keyValue}`);
							Object.assign(qs, { or: `(${data.join(',')})` });
						}
					}

					if (filterType === 'string') {
						const filterString = this.getNodeParameter('filterString', i) as string;
						endpoint = `${endpoint}?${encodeURI(filterString)}`;
					}
	
					const rows = await superbaseApiRequest.call(this, 'DELETE', endpoint, {}, qs);
					returnData.push(...rows);
				}
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}