import type {
	IExecuteFunctions,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { entryFields, entryOperations } from './EntryDescription';
import {
	getToken,
	strapiApiRequest,
	strapiApiRequestAllItems,
	validateJSON,
} from './GenericFunctions';
import { removeTrailingSlash } from '../../utils/utilities';

export class Strapi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Strapi',
		name: 'strapi',
		icon: 'file:strapi.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Strapi API',
		defaults: {
			name: 'Strapi',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'strapiApi',
				required: true,
				testedBy: 'strapiApiTest',
				displayOptions: {
					show: {
						authentication: ['password'],
					},
				},
			},
			{
				name: 'strapiTokenApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['token'],
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
						name: 'Username & Password',
						value: 'password',
					},
					{
						name: 'API Token',
						value: 'token',
					},
				],
				default: 'password',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				noDataExpression: true,
				type: 'options',
				options: [
					{
						name: 'Entry',
						value: 'entry',
					},
				],
				default: 'entry',
			},
			...entryOperations,
			...entryFields,
		],
	};

	methods = {
		credentialTest: {
			async strapiApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as IDataObject;
				let options: IRequestOptions = {};

				const url = removeTrailingSlash(credentials.url as string);

				options = {
					headers: {
						'content-type': 'application/json',
					},
					method: 'POST',
					body: {
						identifier: credentials.email,
						password: credentials.password,
					},
					uri: credentials.apiVersion === 'v4' ? `${url}/api/auth/local` : `${url}/auth/local`,
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
						message: `Auth settings are not valid: ${error}`,
					};
				}
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
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		const authenticationMethod = this.getNodeParameter('authentication', 0);

		let apiVersion: string;

		if (authenticationMethod === 'password') {
			const { jwt } = await getToken.call(this);
			apiVersion = (await this.getCredentials('strapiApi')).apiVersion as string;
			headers.Authorization = `Bearer ${jwt}`;
		} else {
			apiVersion = (await this.getCredentials('strapiTokenApi')).apiVersion as string;
		}

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'entry') {
					if (operation === 'create') {
						const body: IDataObject = {};

						const contentType = this.getNodeParameter('contentType', i) as string;

						const columns = this.getNodeParameter('columns', i) as string;

						const columnList = columns.split(',').map((column) => column.trim());

						for (const key of Object.keys(items[i].json)) {
							if (columnList.includes(key)) {
								apiVersion === 'v4'
									? (body.data = items[i].json)
									: (body[key] = items[i].json[key]);
							}
						}
						responseData = await strapiApiRequest.call(
							this,
							'POST',
							`/${contentType}`,
							body,
							qs,
							undefined,
							headers,
						);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}

					if (operation === 'delete') {
						const contentType = this.getNodeParameter('contentType', i) as string;

						const entryId = this.getNodeParameter('entryId', i) as string;

						responseData = await strapiApiRequest.call(
							this,
							'DELETE',
							`/${contentType}/${entryId}`,
							{},
							qs,
							undefined,
							headers,
						);

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);

						const contentType = this.getNodeParameter('contentType', i) as string;

						const options = this.getNodeParameter('options', i);

						if (apiVersion === 'v4') {
							// Sort Option
							if (options.sort && (options.sort as string[]).length !== 0) {
								const sortFields = options.sort as string[];
								qs.sort = sortFields.join(',');
							}
							// Filter Option
							if (options.where) {
								const query = validateJSON(options.where as string);
								if (query !== undefined) {
									qs.filters = query;
								} else {
									throw new NodeOperationError(this.getNode(), 'Query must be a valid JSON', {
										itemIndex: i,
									});
								}
							}
							// Publication Option
							if (options.publicationState) {
								qs.publicationState = options.publicationState as string;
							}
							// Limit Option
							if (returnAll) {
								responseData = await strapiApiRequestAllItems.call(
									this,
									'GET',
									`/${contentType}`,
									{},
									qs,
									headers,
									apiVersion,
								);
							} else {
								qs['pagination[pageSize]'] = this.getNodeParameter('limit', i);
								({ data: responseData } = await strapiApiRequest.call(
									this,
									'GET',
									`/${contentType}`,
									{},
									qs,
									undefined,
									headers,
								));
							}
						} else {
							// Sort Option
							if (options.sort && (options.sort as string[]).length !== 0) {
								const sortFields = options.sort as string[];
								qs._sort = sortFields.join(',');
							}
							// Filter Option
							if (options.where) {
								const query = validateJSON(options.where as string);
								if (query !== undefined) {
									qs._where = query;
								} else {
									throw new NodeOperationError(this.getNode(), 'Query must be a valid JSON', {
										itemIndex: i,
									});
								}
							}
							// Publication Option
							if (options.publicationState) {
								qs._publicationState = options.publicationState as string;
							}
							// Limit Option
							if (returnAll) {
								responseData = await strapiApiRequestAllItems.call(
									this,
									'GET',
									`/${contentType}`,
									{},
									qs,
									headers,
									apiVersion,
								);
							} else {
								qs._limit = this.getNodeParameter('limit', i);
								responseData = await strapiApiRequest.call(
									this,
									'GET',
									`/${contentType}`,
									{},
									qs,
									undefined,
									headers,
								);
							}
						}

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}

					if (operation === 'get') {
						const contentType = this.getNodeParameter('contentType', i) as string;

						const entryId = this.getNodeParameter('entryId', i) as string;

						responseData = await strapiApiRequest.call(
							this,
							'GET',
							`/${contentType}/${entryId}`,
							{},
							qs,
							undefined,
							headers,
						);

						if (apiVersion === 'v4') {
							responseData = responseData.data;
						}

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}

					if (operation === 'update') {
						const body: IDataObject = {};

						const contentType = this.getNodeParameter('contentType', i) as string;

						const columns = this.getNodeParameter('columns', i) as string;

						const updateKey = this.getNodeParameter('updateKey', i) as string;

						const columnList = columns.split(',').map((column) => column.trim());

						const entryId = items[i].json[updateKey];

						for (const key of Object.keys(items[i].json)) {
							if (columnList.includes(key)) {
								apiVersion === 'v4'
									? (body.data = items[i].json)
									: (body[key] = items[i].json[key]);
							}
						}

						responseData = await strapiApiRequest.call(
							this,
							'PUT',
							`/${contentType}/${entryId}`,
							body,
							qs,
							undefined,
							headers,
						);

						if (apiVersion === 'v4') {
							responseData = responseData.data;
						}

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData as IDataObject),
							{ itemData: { item: i } },
						);

						returnData.push(...executionData);
					}
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
		}
		return [returnData];
	}
}
