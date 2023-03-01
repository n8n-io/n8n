import type { IExecuteFunctions } from 'n8n-core';

import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import type { OptionsWithUri } from 'request';

import {
	gristApiRequest,
	parseAutoMappedInputs,
	parseDefinedFields,
	parseFilterProperties,
	parseSortProperties,
	throwOnZeroDefinedFields,
} from './GenericFunctions';

import { operationFields } from './OperationDescription';

import type {
	FieldsToSend,
	GristColumns,
	GristCreateRowPayload,
	GristCredentials,
	GristGetAllOptions,
	GristUpdateRowPayload,
	SendingOptions,
} from './types';

export class Grist implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Grist',
		name: 'grist',
		icon: 'file:grist.svg',
		subtitle: '={{$parameter["operation"]}}',
		group: ['input'],
		version: 1,
		description: 'Consume the Grist API',
		defaults: {
			name: 'Grist',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'gristApi',
				required: true,
				testedBy: 'gristApiTest',
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

				const { columns } = (await gristApiRequest.call(this, 'GET', endpoint)) as GristColumns;
				return columns.map(({ id }) => ({ name: id, value: id }));
			},
		},

		credentialTest: {
			async gristApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const { apiKey, planType, customSubdomain, selfHostedUrl } =
					credential.data as GristCredentials;

				const endpoint = '/orgs';

				const gristapiurl =
					planType === 'free'
						? `https://docs.getgrist.com/api${endpoint}`
						: planType === 'paid'
						? `https://${customSubdomain}.getgrist.com/api${endpoint}`
						: `${selfHostedUrl}/api${endpoint}`;

				const options: OptionsWithUri = {
					headers: {
						Authorization: `Bearer ${apiKey}`,
					},
					method: 'GET',
					uri: gristapiurl,
					qs: { limit: 1 },
					json: true,
				};

				try {
					await this.helpers.request(options);
					return {
						status: 'OK',
						message: 'Authentication successful',
					};
				} catch (error) {
					return {
						status: 'Error',
						message: error.message,
					};
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let responseData;
		const returnData: INodeExecutionData[] = [];

		const operation = this.getNodeParameter('operation', 0);

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
						const inputsToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());
						const fields = parseAutoMappedInputs(incomingKeys, inputsToIgnore, items[i].json);
						body.records.push({ fields });
					} else if (dataToSend === 'defineInNode') {
						const { properties } = this.getNodeParameter('fieldsToSend', i, []) as FieldsToSend;
						throwOnZeroDefinedFields.call(this, properties);
						body.records.push({ fields: parseDefinedFields(properties) });
					}

					const docId = this.getNodeParameter('docId', 0) as string;
					const tableId = this.getNodeParameter('tableId', 0) as string;
					const endpoint = `/docs/${docId}/tables/${tableId}/records`;

					responseData = await gristApiRequest.call(this, 'POST', endpoint, body);
					responseData = {
						id: responseData.records[0].id,
						...body.records[0].fields,
					};
				} else if (operation === 'delete') {
					// ----------------------------------
					//            delete
					// ----------------------------------

					// https://support.getgrist.com/api/#tag/data/paths/~1docs~1{docId}~1tables~1{tableId}~1data~1delete/post

					const docId = this.getNodeParameter('docId', 0) as string;
					const tableId = this.getNodeParameter('tableId', 0) as string;
					const endpoint = `/docs/${docId}/tables/${tableId}/data/delete`;

					const rawRowIds = (this.getNodeParameter('rowId', i) as string).toString();
					const body = rawRowIds
						.split(',')
						.map((c) => c.trim())
						.map(Number);

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
						const incomingKeys = Object.keys(items[i].json);
						const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
						const inputsToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());
						const fields = parseAutoMappedInputs(incomingKeys, inputsToIgnore, items[i].json);
						body.records.push({ id: Number(rowId), fields });
					} else if (dataToSend === 'defineInNode') {
						const { properties } = this.getNodeParameter('fieldsToSend', i, []) as FieldsToSend;
						throwOnZeroDefinedFields.call(this, properties);
						const fields = parseDefinedFields(properties);
						body.records.push({ id: Number(rowId), fields });
					}

					const docId = this.getNodeParameter('docId', 0) as string;
					const tableId = this.getNodeParameter('tableId', 0) as string;
					const endpoint = `/docs/${docId}/tables/${tableId}/records`;

					await gristApiRequest.call(this, 'PATCH', endpoint, body);
					responseData = {
						id: rowId,
						...body.records[0].fields,
					};
				} else if (operation === 'getAll') {
					// ----------------------------------
					//             getAll
					// ----------------------------------

					// https://support.getgrist.com/api/#tag/records

					const docId = this.getNodeParameter('docId', 0) as string;
					const tableId = this.getNodeParameter('tableId', 0) as string;
					const endpoint = `/docs/${docId}/tables/${tableId}/records`;

					const qs: IDataObject = {};

					const returnAll = this.getNodeParameter('returnAll', i);

					if (!returnAll) {
						qs.limit = this.getNodeParameter('limit', i);
					}

					const { sort, filter } = this.getNodeParameter(
						'additionalOptions',
						i,
					) as GristGetAllOptions;

					if (sort?.sortProperties.length) {
						qs.sort = parseSortProperties(sort.sortProperties);
					}

					if (filter?.filterProperties.length) {
						const parsed = parseFilterProperties(filter.filterProperties);
						qs.filter = JSON.stringify(parsed);
					}

					responseData = await gristApiRequest.call(this, 'GET', endpoint, {}, qs);
					responseData = responseData.records.map((data: IDataObject) => {
						return { id: data.id, ...(data.fields as object) };
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);

					continue;
				}
				throw error;
			}
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		}

		return this.prepareOutputData(returnData);
	}
}
