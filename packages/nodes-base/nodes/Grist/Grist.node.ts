import {
	IExecuteFunctions
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	gristApiRequest,
	parseAutoMappedInputs,
	parseDefinedFields,
	parseFilterProperties,
	parseSortProperties,
	throwOnExcessItems,
	throwOnZeroDefinedFields,
} from './GenericFunctions';

import {
	operationFields,
} from './OperationDescription';

import {
	SendingOptions,
	GristColumns,
	GristCreateRowPayload,
	GristGetAllOptions,
	GristUpdateRowPayload,
	FieldsToSend,
} from './types';

export class Grist implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Grist',
		name: 'grist',
		icon: 'file:grist.svg',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		group: ['input'],
		version: 1,
		description: 'Consume the Grist API',
		defaults: {
			name: 'Grist',
			color: '#394650',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'gristApi',
				required: true,
			},
		],
		properties: operationFields,
	};

	methods = {
		loadOptions: {
			async getTableColumns(this: ILoadOptionsFunctions) {
				const docId = this.getNodeParameter('docId', 0) as string;
				const tableId = this.getNodeParameter('tableId', 0) as string;
				const endpoint = `/docs/${docId}/tables/${tableId}/columns`;

				const { columns } = await gristApiRequest.call(this, 'GET', endpoint) as GristColumns;
				return columns.map(({ id }) => ({ name: id, value: id }));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let responseData;
		const returnData: IDataObject[] = [];

		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {

			try {

				if (operation === 'create') {

					// ----------------------------------
					//             create
					// ----------------------------------

					// https://support.getgrist.com/api/#tag/records/paths/~1docs~1{docId}~1tables~1{tableId}~1records/post

					const body = { records: [] } as GristCreateRowPayload;

					const dataToSend = this.getNodeParameter('dataToSend', 0) as SendingOptions;

					if (dataToSend === 'autoMapInputs') {

						const incomingKeys = Object.keys(items[i].json);
						const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
						const inputsToIgnore = rawInputsToIgnore.split(',').map(c => c.trim());
						const fields = parseAutoMappedInputs(incomingKeys, inputsToIgnore, items[i].json);
						body.records.push({ fields });

					} else if (dataToSend === 'defineInNode') {

						const { properties } = this.getNodeParameter('fieldsToSend', i, []) as FieldsToSend;
						throwOnZeroDefinedFields.call(this, properties);
						body.records.push({ fields: parseDefinedFields(properties) });

					}

					const docId = this.getNodeParameter('docId', i) as string;
					const tableId = this.getNodeParameter('tableId', i) as string;
					const endpoint = `/docs/${docId}/tables/${tableId}/records`;

					responseData = await gristApiRequest.call(this, 'POST', endpoint, body);
					responseData = responseData.records;

				} else if (operation === 'delete') {

					// ----------------------------------
					//            delete
					// ----------------------------------

					// https://support.getgrist.com/api/#tag/data/paths/~1docs~1{docId}~1tables~1{tableId}~1data~1delete/post

					const docId = this.getNodeParameter('docId', i) as string;
					const tableId = this.getNodeParameter('tableId', i) as string;
					const endpoint = `/docs/${docId}/tables/${tableId}/data/delete`;

					const rawRowId = this.getNodeParameter('rowId', i) as string;
					const body = rawRowId.split(',').map(v => Number(v));

					await gristApiRequest.call(this, 'POST', endpoint, body);
					responseData = { success: true };

				} else if (operation === 'update') {

					// ----------------------------------
					//            update
					// ----------------------------------

					// https://support.getgrist.com/api/#tag/records/paths/~1docs~1{docId}~1tables~1{tableId}~1records/patch

					const body = { records: [] } as GristUpdateRowPayload;

					const rowId = this.getNodeParameter('rowId', i) as string;
					const dataToSend = this.getNodeParameter('dataToSend', 0) as SendingOptions;

					if (dataToSend === 'autoMapInputs') {

						throwOnExcessItems.call(this, i);
						const incomingKeys = Object.keys(items[i].json);
						const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
						const inputsToIgnore = rawInputsToIgnore.split(',').map(c => c.trim());
						const fields = parseAutoMappedInputs(incomingKeys, inputsToIgnore, items[i].json);
						body.records.push({ id: Number(rowId), fields });

					} else if (dataToSend === 'defineInNode') {

						const { properties } = this.getNodeParameter('fieldsToSend', i, []) as FieldsToSend;
						throwOnZeroDefinedFields.call(this, properties);
						const fields = parseDefinedFields(properties);
						body.records.push({ id: Number(rowId), fields });

					}

					const docId = this.getNodeParameter('docId', i) as string;
					const tableId = this.getNodeParameter('tableId', i) as string;
					const endpoint = `/docs/${docId}/tables/${tableId}/records`;

					await gristApiRequest.call(this, 'PATCH', endpoint, body);
					responseData = { success: true };

				} else if (operation === 'getAll') {

					// ----------------------------------
					//             getAll
					// ----------------------------------

					// https://support.getgrist.com/api/#tag/records

					const docId = this.getNodeParameter('docId', i) as string;
					const tableId = this.getNodeParameter('tableId', i) as string;
					const endpoint = `/docs/${docId}/tables/${tableId}/records`;

					const qs: IDataObject = {};

					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					if (!returnAll) {
						qs.limit = this.getNodeParameter('limit', i) as number;
					}

					const { sort, filter } = this.getNodeParameter('additionalOptions', i) as GristGetAllOptions;

					if (sort?.sortProperties.length) {
						qs.sort = parseSortProperties(sort.sortProperties);
					}

					if (filter?.filterProperties.length) {
						const parsed = parseFilterProperties(filter.filterProperties);
						qs.filter = JSON.stringify(parsed);
					}

					responseData = await gristApiRequest.call(this, 'GET', endpoint, {}, qs);
					responseData = responseData.records;
				}

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
