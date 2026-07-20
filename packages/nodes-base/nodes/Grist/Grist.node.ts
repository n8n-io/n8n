import {
	type IExecuteFunctions,
	type ICredentialsDecrypted,
	type ICredentialTestFunctions,
	type IDataObject,
	type INodeCredentialTestResult,
	type INodeExecutionData,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
	type IRequestOptions,
	NodeConnectionTypes,
	NodeOperationError,
	setSafeObjectProperty,
} from 'n8n-workflow';

import {
	getMappingColumns,
	getExecResourceId,
	getTableColumns,
	gristApiRequest,
	gristBaseUrl,
	parseAutoMappedInputs,
	parseDefinedFields,
	parseFilterProperties,
	parseSortProperties,
	searchDocs,
	searchTables,
	throwOnZeroDefinedFields,
} from './GenericFunctions';
import { operationFields } from './OperationDescription';
import type {
	FieldsToSend,
	GristCreateRowPayload,
	GristCredentials,
	GristGetAllOptions,
	GristUpdateRowPayload,
	GristUpsertRowPayload,
	SendingOptions,
} from './types';

const authentication: INodeProperties = {
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
};

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
				testedBy: 'gristApiTest',
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		properties: [authentication, ...operationFields],
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
		},

		credentialTest: {
			async gristApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as GristCredentials;
				// The credential-test context has no `requestOAuth2`, so use the stored access token
				// directly; an expired OAuth token can fail the test until the credential is next used.
				const token = credentials.oauthTokenData?.access_token ?? credentials.apiKey;

				const options: IRequestOptions = {
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: 'application/json',
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
		const version = this.getNode().typeVersion;

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'create') {
					// ----------------------------------
					//             create
					// ----------------------------------

					// https://support.getgrist.com/api/#tag/records/paths/~1docs~1{docId}~1tables~1{tableId}~1records/post

					const body = { records: [] } as GristCreateRowPayload;

					if (version >= 2) {
						const fields = this.getNodeParameter('columns.value', i, {}) as IDataObject;
						body.records.push({ fields });
					} else {
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
					}

					const docId = getExecResourceId.call(this, 'docId', i);
					const tableId = getExecResourceId.call(this, 'tableId', i);
					const endpoint = `/docs/${docId}/tables/${tableId}/records`;

					responseData = await gristApiRequest.call(this, 'POST', endpoint, body);
					responseData = {
						id: responseData.records[0].id,
						...body.records[0].fields,
					};
				} else if (operation === 'upsert') {
					// ----------------------------------
					//             upsert
					// ----------------------------------

					// https://support.getgrist.com/api/#tag/records/paths/~1docs~1{docId}~1tables~1{tableId}~1records/put

					const fields = this.getNodeParameter('columns.value', i, {}) as IDataObject;
					const matchingColumns = this.getNodeParameter(
						'columns.matchingColumns',
						i,
						[],
					) as string[];

					// Without a match key the require clause is empty, which lets Grist's upsert match an
					// unintended existing row and overwrite it. Require at least one column to match on.
					if (matchingColumns.length === 0) {
						throw new NodeOperationError(
							this.getNode(),
							'Select at least one column to match on for the Create or Update operation',
							{ itemIndex: i },
						);
					}

					const require = matchingColumns.reduce<IDataObject>((acc, key) => {
						setSafeObjectProperty(acc, key, fields[key]);
						return acc;
					}, {});

					const body: GristUpsertRowPayload = { records: [{ require, fields }] };

					const docId = getExecResourceId.call(this, 'docId', i);
					const tableId = getExecResourceId.call(this, 'tableId', i);
					const endpoint = `/docs/${docId}/tables/${tableId}/records`;

					await gristApiRequest.call(this, 'PUT', endpoint, body);
					responseData = { ...fields };
				} else if (operation === 'delete') {
					// ----------------------------------
					//            delete
					// ----------------------------------

					// https://support.getgrist.com/api/#tag/data/paths/~1docs~1{docId}~1tables~1{tableId}~1data~1delete/post

					const docId = getExecResourceId.call(this, 'docId', i);
					const tableId = getExecResourceId.call(this, 'tableId', i);
					const endpoint = `/docs/${docId}/tables/${tableId}/data/delete`;

					const rawRowIds = (this.getNodeParameter('rowId', i) as string).toString();
					const body = rawRowIds
						.split(',')
						.map((c) => c.trim())
						.map(Number);

					await gristApiRequest.call(this, 'POST', endpoint, body);
					// `deleted` is the n8n convention; `success` kept (incl. v1) for backward compat.
					responseData = { deleted: true, success: true };
				} else if (operation === 'update') {
					// ----------------------------------
					//            update
					// ----------------------------------

					// https://support.getgrist.com/api/#tag/records/paths/~1docs~1{docId}~1tables~1{tableId}~1records/patch

					const body = { records: [] } as GristUpdateRowPayload;

					const rowId = this.getNodeParameter('rowId', i) as string;

					if (version >= 2) {
						const fields = this.getNodeParameter('columns.value', i, {}) as IDataObject;
						body.records.push({ id: Number(rowId), fields });
					} else {
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
					}

					const docId = getExecResourceId.call(this, 'docId', i);
					const tableId = getExecResourceId.call(this, 'tableId', i);
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

					const docId = getExecResourceId.call(this, 'docId', i);
					const tableId = getExecResourceId.call(this, 'tableId', i);
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

		return [returnData];
	}
}
