import { IExecuteFunctions } from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';

import {
	groupDescription,
	organizationDescription,
	ticketDescription,
	userDescription,
} from './descriptions';

import {
	doesNotBelongToZammad,
	fieldToLoadOption,
	getAllFields,
	getGroupCustomFields,
	getGroupFields,
	getOrganizationCustomFields,
	getOrganizationFields,
	getTicketCustomFields,
	getTicketFields,
	getUserCustomFields,
	getUserFields,
	isCustomer,
	isNotZammadFoundation,
	throwOnEmptyUpdate,
	tolerateTrailingSlash,
	zammadApiRequest,
	zammadApiRequestAllItems,
} from './GenericFunctions';

import type { Zammad as ZammadTypes } from './types';

export class Zammad implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zammad',
		name: 'zammad',
		icon: 'file:zammad.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Zammad API',
		defaults: {
			name: 'Zammad',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'zammadBasicAuthApi',
				required: true,
				testedBy: 'zammadBasicAuthApiTest',
				displayOptions: {
					show: {
						authentication: ['basicAuth'],
					},
				},
			},
			{
				name: 'zammadTokenAuthApi',
				required: true,
				testedBy: 'zammadTokenAuthApiTest',
				displayOptions: {
					show: {
						authentication: ['tokenAuth'],
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
						name: 'Token Auth',
						value: 'tokenAuth',
					},
				],
				default: 'tokenAuth',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				noDataExpression: true,
				type: 'options',
				options: [
					{
						name: 'Group',
						value: 'group',
					},
					{
						name: 'Organization',
						value: 'organization',
					},
					{
						name: 'Ticket',
						value: 'ticket',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'user',
			},

			...groupDescription,
			...organizationDescription,
			...ticketDescription,
			...userDescription,
		],
	};

	methods = {
		loadOptions: {
			// ----------------------------------
			//          custom fields
			// ----------------------------------

			async loadGroupCustomFields(this: ILoadOptionsFunctions) {
				const allFields = await getAllFields.call(this);

				return getGroupCustomFields(allFields).map(fieldToLoadOption);
			},

			async loadOrganizationCustomFields(this: ILoadOptionsFunctions) {
				const allFields = await getAllFields.call(this);

				return getOrganizationCustomFields(allFields).map(fieldToLoadOption);
			},

			async loadUserCustomFields(this: ILoadOptionsFunctions) {
				const allFields = await getAllFields.call(this);

				return getUserCustomFields(allFields).map(fieldToLoadOption);
			},

			async loadTicketCustomFields(this: ILoadOptionsFunctions) {
				const allFields = await getAllFields.call(this);

				return getTicketCustomFields(allFields).map((i) => ({ name: i.name, value: i.id }));
			},

			// ----------------------------------
			//          built-in fields
			// ----------------------------------

			async loadGroupFields(this: ILoadOptionsFunctions) {
				const allFields = await getAllFields.call(this);

				return getGroupFields(allFields).map(fieldToLoadOption);
			},

			async loadOrganizationFields(this: ILoadOptionsFunctions) {
				const allFields = await getAllFields.call(this);

				return getOrganizationFields(allFields).map(fieldToLoadOption);
			},

			async loadTicketFields(this: ILoadOptionsFunctions) {
				const allFields = await getAllFields.call(this);

				return getTicketFields(allFields).map(fieldToLoadOption);
			},

			async loadUserFields(this: ILoadOptionsFunctions) {
				const allFields = await getAllFields.call(this);

				return getUserFields(allFields).map(fieldToLoadOption);
			},

			// ----------------------------------
			//             resources
			// ----------------------------------

			// by non-ID attribute

			/**
			 * POST /tickets requires group name instead of group ID.
			 */
			async loadGroupNames(this: ILoadOptionsFunctions) {
				const groups = (await zammadApiRequest.call(this, 'GET', '/groups')) as ZammadTypes.Group[];

				return groups.map((i) => ({ name: i.name, value: i.name }));
			},

			/**
			 * PUT /users requires organization name instead of organization ID.
			 */
			async loadOrganizationNames(this: ILoadOptionsFunctions) {
				const orgs = (await zammadApiRequest.call(
					this,
					'GET',
					'/organizations',
				)) as ZammadTypes.Group[];

				return orgs.filter(isNotZammadFoundation).map((i) => ({ name: i.name, value: i.name }));
			},

			/**
			 * POST & PUT /tickets requires customer email instead of customer ID.
			 */
			async loadCustomerEmails(this: ILoadOptionsFunctions) {
				const users = (await zammadApiRequest.call(this, 'GET', '/users')) as ZammadTypes.User[];

				return users.filter(isCustomer).map((i) => ({ name: i.email, value: i.email }));
			},

			// by ID

			async loadGroups(this: ILoadOptionsFunctions) {
				const groups = (await zammadApiRequest.call(this, 'GET', '/groups')) as ZammadTypes.Group[];

				return groups.map((i) => ({ name: i.name, value: i.id }));
			},

			async loadOrganizations(this: ILoadOptionsFunctions) {
				const orgs = (await zammadApiRequest.call(
					this,
					'GET',
					'/organizations',
				)) as ZammadTypes.Organization[];

				return orgs.filter(isNotZammadFoundation).map((i) => ({ name: i.name, value: i.id }));
			},

			async loadUsers(this: ILoadOptionsFunctions) {
				const users = (await zammadApiRequest.call(this, 'GET', '/users')) as ZammadTypes.User[];

				return users.filter(doesNotBelongToZammad).map((i) => ({ name: i.login, value: i.id }));
			},
		},
		credentialTest: {
			async zammadBasicAuthApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as ZammadTypes.BasicAuthCredentials;

				const baseUrl = tolerateTrailingSlash(credentials.baseUrl);

				const options: OptionsWithUri = {
					method: 'GET',
					uri: `${baseUrl}/api/v1/users/me`,
					json: true,
					rejectUnauthorized: !credentials.allowUnauthorizedCerts,
					auth: {
						user: credentials.username,
						pass: credentials.password,
					},
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

			async zammadTokenAuthApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as ZammadTypes.TokenAuthCredentials;

				const baseUrl = tolerateTrailingSlash(credentials.baseUrl);

				const options: OptionsWithUri = {
					method: 'GET',
					uri: `${baseUrl}/api/v1/users/me`,
					json: true,
					rejectUnauthorized: !credentials.allowUnauthorizedCerts,
					headers: {
						Authorization: `Token token=${credentials.accessToken}`,
					},
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

		const resource = this.getNodeParameter('resource', 0) as ZammadTypes.Resource;
		const operation = this.getNodeParameter('operation', 0);

		let responseData;
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'user') {
					// **********************************************************************
					//                                  user
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------
						//           user:create
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/user.html#create

						const body: IDataObject = {
							firstname: this.getNodeParameter('firstname', i),
							lastname: this.getNodeParameter('lastname', i),
						};

						const { addressUi, customFieldsUi, ...rest } = this.getNodeParameter(
							'additionalFields',
							i,
						) as ZammadTypes.UserAdditionalFields;

						Object.assign(body, addressUi?.addressDetails);

						customFieldsUi?.customFieldPairs.forEach((pair) => {
							body[pair['name']] = pair['value'];
						});

						Object.assign(body, rest);

						responseData = await zammadApiRequest.call(this, 'POST', '/users', body);
					} else if (operation === 'update') {
						// ----------------------------------
						//            user:update
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/user.html#update

						const id = this.getNodeParameter('id', i);

						const body: IDataObject = {};

						const updateFields = this.getNodeParameter(
							'updateFields',
							i,
						) as ZammadTypes.UserUpdateFields;

						if (!Object.keys(updateFields).length) {
							throwOnEmptyUpdate.call(this, resource);
						}

						const { addressUi, customFieldsUi, ...rest } = updateFields;

						Object.assign(body, addressUi?.addressDetails);

						customFieldsUi?.customFieldPairs.forEach((pair) => {
							body[pair['name']] = pair['value'];
						});

						Object.assign(body, rest);

						responseData = await zammadApiRequest.call(this, 'PUT', `/users/${id}`, body);
					} else if (operation === 'delete') {
						// ----------------------------------
						//            user:delete
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/user.html#delete

						const id = this.getNodeParameter('id', i) as string;

						await zammadApiRequest.call(this, 'DELETE', `/users/${id}`);

						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------
						//            user:get
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/user.html#show

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'GET', `/users/${id}`);
					} else if (operation === 'getAll') {
						// ----------------------------------
						//           user:getAll
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/user.html#list
						// https://docs.zammad.org/en/latest/api/user.html#search

						const qs: IDataObject = {};

						const { sortUi, ...rest } = this.getNodeParameter(
							'filters',
							i,
						) as ZammadTypes.UserFilterFields;

						Object.assign(qs, sortUi?.sortDetails);

						Object.assign(qs, rest);

						qs.query ||= ''; // otherwise triggers 500

						const returnAll = this.getNodeParameter('returnAll', i);

						const limit = returnAll ? 0 : this.getNodeParameter('limit', i);

						responseData = await zammadApiRequestAllItems
							.call(this, 'GET', '/users/search', {}, qs, limit)
							.then((responseData) => {
								return responseData.map((user) => {
									const { _preferences, ...rest } = user;
									return rest;
								});
							});
					} else if (operation === 'getSelf') {
						// ----------------------------------
						//             user:me
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/user.html#me-current-user

						responseData = await zammadApiRequest.call(this, 'GET', '/users/me');
					}
				} else if (resource === 'organization') {
					// **********************************************************************
					//                             organization
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------
						//        organization:create
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/organization.html#create

						const body: IDataObject = {
							name: this.getNodeParameter('name', i),
						};

						const { customFieldsUi, ...rest } = this.getNodeParameter(
							'additionalFields',
							i,
						) as ZammadTypes.UserAdditionalFields;

						customFieldsUi?.customFieldPairs.forEach((pair) => {
							body[pair['name']] = pair['value'];
						});

						Object.assign(body, rest);

						responseData = await zammadApiRequest.call(this, 'POST', '/organizations', body);
					} else if (operation === 'update') {
						// ----------------------------------
						//       organization:update
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/organization.html#update

						const id = this.getNodeParameter('id', i);

						const body: IDataObject = {};

						const updateFields = this.getNodeParameter(
							'updateFields',
							i,
						) as ZammadTypes.UserUpdateFields;

						if (!Object.keys(updateFields).length) {
							throwOnEmptyUpdate.call(this, resource);
						}

						const { customFieldsUi, ...rest } = updateFields;

						customFieldsUi?.customFieldPairs.forEach((pair) => {
							body[pair['name']] = pair['value'];
						});

						Object.assign(body, rest);

						responseData = await zammadApiRequest.call(this, 'PUT', `/organizations/${id}`, body);
					} else if (operation === 'delete') {
						// ----------------------------------
						//         organization:delete
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/organization.html#delete

						const id = this.getNodeParameter('id', i) as string;

						await zammadApiRequest.call(this, 'DELETE', `/organizations/${id}`);

						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------
						//         organization:get
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/organization.html#show

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'GET', `/organizations/${id}`);
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         organization:getAll
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/organization.html#list
						// https://docs.zammad.org/en/latest/api/organization.html#search - returning empty always

						const returnAll = this.getNodeParameter('returnAll', i);

						const limit = returnAll ? 0 : this.getNodeParameter('limit', i);

						responseData = await zammadApiRequestAllItems.call(
							this,
							'GET',
							'/organizations',
							{},
							{},
							limit,
						);
					}
				} else if (resource === 'group') {
					// **********************************************************************
					//                                  group
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------
						//           group:create
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/group.html#create

						const body: IDataObject = {
							name: this.getNodeParameter('name', i) as string,
						};

						const { customFieldsUi, ...rest } = this.getNodeParameter(
							'additionalFields',
							i,
						) as ZammadTypes.UserAdditionalFields;

						customFieldsUi?.customFieldPairs.forEach((pair) => {
							body[pair['name']] = pair['value'];
						});

						Object.assign(body, rest);

						responseData = await zammadApiRequest.call(this, 'POST', '/groups', body);
					} else if (operation === 'update') {
						// ----------------------------------
						//            group:update
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/group.html#update

						const id = this.getNodeParameter('id', i) as string;

						const body: IDataObject = {};

						const updateFields = this.getNodeParameter(
							'updateFields',
							i,
						) as ZammadTypes.GroupUpdateFields;

						if (!Object.keys(updateFields).length) {
							throwOnEmptyUpdate.call(this, resource);
						}

						const { customFieldsUi, ...rest } = updateFields;

						customFieldsUi?.customFieldPairs.forEach((pair) => {
							body[pair['name']] = pair['value'];
						});

						Object.assign(body, rest);

						responseData = await zammadApiRequest.call(this, 'PUT', `/groups/${id}`, body);
					} else if (operation === 'delete') {
						// ----------------------------------
						//            group:delete
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/group.html#delete

						const id = this.getNodeParameter('id', i) as string;

						await zammadApiRequest.call(this, 'DELETE', `/groups/${id}`);

						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------
						//             group:get
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/group.html#show

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'GET', `/groups/${id}`);
					} else if (operation === 'getAll') {
						// ----------------------------------
						//           group:getAll
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/group.html#list

						const returnAll = this.getNodeParameter('returnAll', i);

						const limit = returnAll ? 0 : this.getNodeParameter('limit', i);

						responseData = await zammadApiRequestAllItems.call(
							this,
							'GET',
							'/groups',
							{},
							{},
							limit,
						);
					}
				} else if (resource === 'ticket') {
					// **********************************************************************
					//                                  ticket
					// **********************************************************************

					if (operation === 'create') {
						// ----------------------------------
						//           ticket:create
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/ticket/index.html#create

						const body = {
							article: {},
							title: this.getNodeParameter('title', i) as string,
							group: this.getNodeParameter('group', i) as string,
							customer: this.getNodeParameter('customer', i) as string,
						};

						const article = this.getNodeParameter('article', i) as ZammadTypes.Article;

						if (!Object.keys(article).length) {
							throw new NodeOperationError(this.getNode(), 'Article is required', { itemIndex: i });
						}

						const {
							articleDetails: { visibility, ...rest },
						} = article;

						body.article = {
							...rest,
							internal: visibility === 'internal',
						};

						responseData = await zammadApiRequest.call(this, 'POST', '/tickets', body);

						const { id } = responseData;

						responseData.articles = await zammadApiRequest.call(
							this,
							'GET',
							`/ticket_articles/by_ticket/${id}`,
						);
					} else if (operation === 'delete') {
						// ----------------------------------
						//          ticket:delete
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/ticket/index.html#delete

						const id = this.getNodeParameter('id', i) as string;

						await zammadApiRequest.call(this, 'DELETE', `/tickets/${id}`);

						responseData = { success: true };
					} else if (operation === 'get') {
						// ----------------------------------
						//            ticket:get
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/ticket/index.html#show

						const id = this.getNodeParameter('id', i) as string;

						responseData = await zammadApiRequest.call(this, 'GET', `/tickets/${id}`);
						responseData.articles = await zammadApiRequest.call(
							this,
							'GET',
							`/ticket_articles/by_ticket/${id}`,
						);
					} else if (operation === 'getAll') {
						// ----------------------------------
						//           ticket:getAll
						// ----------------------------------

						// https://docs.zammad.org/en/latest/api/ticket/index.html#list
						// https://docs.zammad.org/en/latest/api/ticket/index.html#search - returning empty always

						const returnAll = this.getNodeParameter('returnAll', i);

						const limit = returnAll ? 0 : this.getNodeParameter('limit', i);

						responseData = await zammadApiRequestAllItems.call(
							this,
							'GET',
							'/tickets',
							{},
							{},
							limit,
						);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}
		return this.prepareOutputData(returnData);
	}
}
