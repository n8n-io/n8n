import {
	type IExecuteFunctions,
	type ICredentialsDecrypted,
	type ICredentialTestFunctions,
	type IDataObject,
	type INodeCredentialTestResult,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IRequestOptions,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

import { generatePairedItemData } from '@utils/utilities';

import {
	decodeRow,
	describeTable,
	encodeRow,
	getColumns,
	getDocId,
	getMappingColumns,
	getMappingColumnsWithRowId,
	getTableColumns,
	gristApiRequest,
	gristBaseUrl,
	parseAutoMappedInputs,
	parseDefinedFields,
	parseFilterProperties,
	parseSortProperties,
	searchDocs,
	searchTables,
	splitRow,
	throwOnZeroDefinedFields,
} from './GenericFunctions';
import { operationFields } from './OperationDescription';
import type {
	FieldsToSend,
	GristCreateRowPayload,
	GristCredentials,
	GristGetAllOptions,
	GristTable,
	GristUpdateRowPayload,
	GristUpsertRowPayload,
	SendingOptions,
} from './types';

export class Grist implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Grist',
		name: 'grist',
		icon: 'file:grist.svg',
		subtitle: '={{$parameter["operation"]}}',
		group: ['input'],
		version: [1, 2],
		description: 'Consume the Grist API',
		defaults: {
			name: 'Grist',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'gristApi',
				required: true,
				testedBy: 'gristApiTest',
				displayOptions: {
					show: {
						authentication: ['apiKey'],
					},
				},
			},
			{
				name: 'gristOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
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
						name: 'API Key',
						value: 'apiKey',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'apiKey',
			},
			...operationFields,
		],
	};

	methods = {
		loadOptions: {
			getTableColumns,
		},

		listSearch: {
			searchDocs,
			searchTables,
		},

		resourceMapping: {
			getMappingColumns,
			getMappingColumnsWithRowId,
		},

		credentialTest: {
			async gristApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as GristCredentials;

				const options: IRequestOptions = {
					headers: {
						Authorization: `Bearer ${credentials.apiKey}`,
					},
					method: 'GET',
					uri: `${gristBaseUrl(credentials)}/api/orgs`,
					json: true,
				};

				try {
					// A valid token can still grant zero accessible orgs (e.g. nothing shared); treat
					// that as a failing test rather than a misleading success.
					const orgs = await this.helpers.request(options);
					if (!Array.isArray(orgs) || orgs.length === 0) {
						return {
							status: 'Error',
							message: 'Connected, but no Grist organizations are accessible to this account.',
						};
					}
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
		const nodeVersion = this.getNode().typeVersion;

		const getDocAndTable = () => ({
			docId: getDocId.call(this, this.getNodeParameter('docId', 0)),
			tableId: this.getNodeParameter('tableId', 0, '', { extractValue: true }) as string,
		});

		// All items use the same table.
		let table: GristTable | undefined;
		const getTable = async (docId: string, tableId: string) => {
			table ??= describeTable(await getColumns.call(this, docId, tableId));
			return table;
		};

		const getMappedRow = async (
			i: number,
			docId: string,
			tableId: string,
		): Promise<IDataObject> => {
			if (this.getNodeParameter('columns.mappingMode', i) === 'autoMapInputData') {
				// Grist rejects the whole write for an unknown column.
				const target = await getTable(docId, tableId);
				return Object.fromEntries(
					Object.entries(items[i].json).filter(([key]) => key === 'id' || target.columns.has(key)),
				);
			}
			// The mapper stores null until a column has a value, and a fallback only replaces undefined.
			return (this.getNodeParameter('columns.value', i, {}) as IDataObject | null) ?? {};
		};

		// Without a value to match on, Grist can change the wrong rows.
		const getMatchingColumns = (i: number, row: IDataObject): string[] => {
			const matchingColumns = this.getNodeParameter('columns.matchingColumns', i, []) as string[];
			if (!matchingColumns.length) {
				throw new NodeOperationError(this.getNode(), 'Select a column to match on', {
					itemIndex: i,
				});
			}
			const unset = matchingColumns.filter((column) => row[column] == null);
			if (unset.length) {
				throw new NodeOperationError(this.getNode(), 'No value for the column to match on', {
					itemIndex: i,
					description: `Set a value for ${unset.join(', ')}`,
				});
			}
			// A row ID that is not a number becomes NaN, which matches no row and hides the bad value.
			if (matchingColumns.includes('id')) {
				const rowId = typeof row.id === 'string' ? row.id.trim() : row.id;
				if (rowId === '' || !Number.isFinite(Number(rowId))) {
					throw new NodeOperationError(
						this.getNode(),
						`The row ID to match on is not a number: ${String(row.id)}`,
						{ itemIndex: i },
					);
				}
			}
			return matchingColumns;
		};

		// Returns the record to send, and the values it sets or matches on for the item's output.
		const getMatchedRecord = async (i: number, docId: string, tableId: string) => {
			const row = await getMappedRow(i, docId, tableId);
			const matchingColumns = getMatchingColumns(i, row);
			const target = await getTable(docId, tableId);
			const { require, fields } = splitRow(row, target, matchingColumns);
			return {
				record: { require: encodeRow(require, target), fields: encodeRow(fields, target) },
				sent: { ...require, ...fields },
			};
		};

		// Grist returns null on older versions, and an empty list when nothing matched.
		const withRowId = (id: number | undefined, sent: IDataObject): IDataObject =>
			id === undefined ? sent : { id, ...sent };

		if (operation === 'upsert') {
			// ----------------------------------
			//            upsert
			// ----------------------------------

			// https://support.getgrist.com/api/#tag/records/operation/replaceRecords

			try {
				const body: GristUpsertRowPayload = { records: [] };
				const { docId, tableId } = getDocAndTable();
				const sent: IDataObject[] = [];

				// Process all input items and batch them
				for (let i = 0; i < items.length; i++) {
					if (nodeVersion >= 2) {
						const matched = await getMatchedRecord(i, docId, tableId);
						body.records.push(matched.record);
						sent.push(matched.sent);
						continue;
					}

					const { properties: upsertCriteriaProperties } = this.getNodeParameter(
						'upsertCriteria',
						i,
						[],
					) as FieldsToSend;
					throwOnZeroDefinedFields.call(this, upsertCriteriaProperties);
					const require = parseDefinedFields(upsertCriteriaProperties);

					const dataToSend = this.getNodeParameter('dataToSend', 0) as SendingOptions;

					let fields: { [key: string]: any } = {};

					if (dataToSend === 'autoMapInputs') {
						const incomingKeys = Object.keys(items[i].json);
						const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
						const inputsToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());
						fields = parseAutoMappedInputs(incomingKeys, inputsToIgnore, items[i].json);
					} else if (dataToSend === 'defineInNode') {
						const { properties } = this.getNodeParameter('fieldsToSend', i, []) as FieldsToSend;
						throwOnZeroDefinedFields.call(this, properties);
						fields = parseDefinedFields(properties);
					}

					body.records.push({ require, fields });
					sent.push(fields);
				}

				const endpoint = `/docs/${docId}/tables/${tableId}/records`;

				const qs: IDataObject = {};
				const onMany = this.getNodeParameter('onMany', 0, 'first') as string;
				if (onMany !== 'first') {
					qs.onmany = onMany;
				}

				const response = (await gristApiRequest.call(this, 'PUT', endpoint, body, qs)) as {
					recordIds?: number[][];
				} | null;

				for (let i = 0; i < items.length; i++) {
					returnData.push({
						json: withRowId(response?.recordIds?.[i]?.[0], sent[i]),
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const itemData = generatePairedItemData(items.length);
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData },
					);
					returnData.push(...executionErrorData);
				} else {
					throw error;
				}
			}

			return [returnData];
		}

		for (let i = 0; i < items.length; i++) {
			try {
				const { docId, tableId } = getDocAndTable();

				if (operation === 'create' && nodeVersion >= 2) {
					const endpoint = `/docs/${docId}/tables/${tableId}/records`;
					const target = await getTable(docId, tableId);
					const { fields } = splitRow(await getMappedRow(i, docId, tableId), target);
					const body: GristCreateRowPayload = { records: [{ fields: encodeRow(fields, target) }] };

					responseData = await gristApiRequest.call(this, 'POST', endpoint, body);
					responseData = { id: responseData.records[0].id, ...fields };
				} else if (operation === 'create') {
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

					const endpoint = `/docs/${docId}/tables/${tableId}/data/delete`;

					const rawRowIds = (this.getNodeParameter('rowId', i) as string).toString();
					const body = rawRowIds
						.split(',')
						.map((c) => c.trim())
						.map(Number);

					await gristApiRequest.call(this, 'POST', endpoint, body);
					responseData = { success: true };
				} else if (operation === 'update' && nodeVersion >= 2) {
					const endpoint = `/docs/${docId}/tables/${tableId}/records`;
					const matched = await getMatchedRecord(i, docId, tableId);
					const body: GristUpsertRowPayload = { records: [matched.record] };

					const response = (await gristApiRequest.call(this, 'PUT', endpoint, body, {
						noadd: true,
					})) as { recordIds?: number[][] } | null;
					// When no row matches, Grist returns success and updates nothing.
					const updated = response?.recordIds?.[0];
					if (updated?.length === 0) {
						throw new NodeOperationError(this.getNode(), 'No row matches the columns to match on', {
							itemIndex: i,
						});
					}
					responseData = withRowId(updated?.[0], matched.sent);
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
					const records = responseData.records as Array<{ id: number; fields: IDataObject }>;
					// Only arrays need decoding, so skip the column request when there are none.
					const mayHoldList =
						nodeVersion >= 2 &&
						records.some(({ fields }) => Object.values(fields).some(Array.isArray));
					const target = mayHoldList ? await getTable(docId, tableId) : undefined;
					responseData = records.map(({ id, fields }) => ({
						id,
						...(target ? decodeRow(fields, target) : fields),
					}));
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push.apply(returnData, executionData);

					continue;
				}
				throw error;
			}
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push.apply(returnData, executionData);
		}

		return [returnData];
	}
}
