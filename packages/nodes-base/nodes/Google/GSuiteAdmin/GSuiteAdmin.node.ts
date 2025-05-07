import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { deviceFields, deviceOperations } from './DeviceDescription';
import { googleApiRequest, googleApiRequestAllItems } from './GenericFunctions';
import { groupFields, groupOperations } from './GroupDescripion';
import { searchDevices, searchGroups, searchUsers } from './SearchFunctions';
import { userFields, userOperations } from './UserDescription';

export class GSuiteAdmin implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Workspace Admin',
		name: 'gSuiteAdmin',
		icon: 'file:gSuiteAdmin.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Google Workspace Admin API',
		defaults: {
			name: 'Google Workspace Admin',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'gSuiteAdminOAuth2Api',
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
						name: 'ChromeOS Device',
						value: 'device',
					},
					{
						name: 'Group',
						value: 'group',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'user',
			},
			...deviceOperations,
			...deviceFields,
			...groupOperations,
			...groupFields,
			...userOperations,
			...userFields,
		],
	};

	methods = {
		loadOptions: {
			async getDomains(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const domains = (await googleApiRequestAllItems.call(
					this,
					'domains',
					'GET',
					'/directory/v1/customer/my_customer/domains',
				)) as Array<{
					domainName: string;
				}>;
				for (const domain of domains) {
					const domainName = domain.domainName;
					const domainId = domain.domainName;
					returnData.push({
						name: domainName,
						value: domainId,
					});
				}
				return returnData;
			},
			async getSchemas(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const schemas = (await googleApiRequestAllItems.call(
					this,
					'schemas',
					'GET',
					'/directory/v1/customer/my_customer/schemas',
				)) as Array<{
					displayName: string;
					schemaName: string;
				}>;
				return schemas.map((schema: { schemaName: string; displayName: string }) => ({
					name: schema.displayName || schema.schemaName,
					value: schema.schemaName,
				}));
			},
			async getOrgUnits(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const orgUnits = (await googleApiRequest.call(
					this,
					'GET',
					'/directory/v1/customer/my_customer/orgunits',
					{},
					{ orgUnitPath: '/', type: 'all' },
				)) as {
					organizationUnits: Array<{
						name: string;
						orgUnitPath: string;
					}>;
				};

				for (const unit of orgUnits.organizationUnits) {
					returnData.push({
						name: unit.name,
						value: unit.orgUnitPath,
					});
				}

				return returnData;
			},
		},
		listSearch: {
			searchDevices,
			searchGroups,
			searchUsers,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < length; i++) {
			const qs: IDataObject = {};

			try {
				if (resource === 'device') {
					//https://developers.google.com/admin-sdk/directory/v1/customer/my_customer/devices/chromeos/deviceId
					if (operation === 'get') {
						const deviceId = this.getNodeParameter('deviceId', i, undefined, {
							extractValue: true,
						}) as string;
						const output = this.getNodeParameter('projection', 1);

						responseData = await googleApiRequest.call(
							this,
							'GET',
							`/directory/v1/customer/my_customer/devices/chromeos/${deviceId}?projection=${output}`,
							{},
						);
					}

					//https://developers.google.com/admin-sdk/directory/reference/rest/v1/chromeosdevices/list
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const output = this.getNodeParameter('projection', 1);
						const includeChildren = this.getNodeParameter('includeChildOrgunits', i);
						const filter = this.getNodeParameter('filter', i, {}) as {
							query?: string;
							orgUnitPath?: string;
						};
						const sort = this.getNodeParameter('sort', i, {}) as {
							sortRules?: {
								orderBy?: string;
								sortOrder?: string;
							};
						};

						qs.projection = output;
						qs.includeChildOrgunits = includeChildren;

						if (qs.customer === undefined) {
							qs.customer = 'my_customer';
						}

						if (filter.orgUnitPath) {
							qs.orgUnitPath = filter.orgUnitPath;
						}

						if (filter.query) {
							qs.query = filter.query.trim();
						}

						if (sort.sortRules) {
							const { orderBy, sortOrder } = sort.sortRules;
							if (orderBy) {
								qs.orderBy = orderBy;
							}
							if (sortOrder) {
								qs.sortOrder = sortOrder;
							}
						}

						if (!returnAll) {
							qs.maxResults = this.getNodeParameter('limit', i);
						}

						responseData = await googleApiRequest.call(
							this,
							'GET',
							`/directory/v1/customer/${qs.customer}/devices/chromeos/`,
							{},
							qs,
						);

						if (!Array.isArray(responseData) || responseData.length === 0) {
							return [this.helpers.returnJsonArray({})];
						}

						return [this.helpers.returnJsonArray(responseData)];
					}

					if (operation === 'update') {
						const deviceId = this.getNodeParameter('deviceId', i, undefined, {
							extractValue: true,
						}) as string;
						const updateOptions = this.getNodeParameter('updateOptions', 1);

						Object.assign(qs, updateOptions);

						responseData = await googleApiRequest.call(
							this,
							'PUT',
							`/directory/v1/customer/my_customer/devices/chromeos/${deviceId}`,
							qs,
						);
					}

					if (operation === 'changeStatus') {
						const deviceId = this.getNodeParameter('deviceId', i, undefined, {
							extractValue: true,
						}) as string;
						const action = this.getNodeParameter('action', 1);

						qs.action = action;
						responseData = await googleApiRequest.call(
							this,
							'POST',
							`/directory/v1/customer/my_customer/devices/chromeos/${deviceId}/action`,
							qs,
						);
					}
				} else if (resource === 'group') {
					//https://developers.google.com/admin-sdk/directory/v1/reference/groups/insert
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const email = this.getNodeParameter('email', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							name,
							email,
						};

						Object.assign(body, additionalFields);

						responseData = await googleApiRequest.call(this, 'POST', '/directory/v1/groups', body);
					}

					//https://developers.google.com/admin-sdk/directory/v1/reference/groups/delete
					if (operation === 'delete') {
						const groupId = this.getNodeParameter('groupId', i, undefined, {
							extractValue: true,
						}) as string;

						await googleApiRequest.call(this, 'DELETE', `/directory/v1/groups/${groupId}`, {});

						responseData = { success: true };
					}

					//https://developers.google.com/admin-sdk/directory/v1/reference/groups/get
					if (operation === 'get') {
						const groupId = this.getNodeParameter('groupId', i, undefined, {
							extractValue: true,
						}) as string;

						responseData = await googleApiRequest.call(
							this,
							'GET',
							`/directory/v1/groups/${groupId}`,
							{},
						);
					}
					//https://developers.google.com/admin-sdk/directory/v1/reference/groups/list
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const filter = this.getNodeParameter('filter', i, {}) as {
							customer?: string;
							domain?: string;
							query?: string;
							userId?: string;
						};
						const sort = this.getNodeParameter('sort', i, {}) as {
							sortRules?: {
								orderBy?: string;
								sortOrder?: string;
							};
						};

						if (filter.customer) {
							qs.customer = filter.customer;
						}

						if (filter.domain) {
							qs.domain = filter.domain;
						}

						if (filter.query) {
							const query = filter.query.trim();

							const regex = /^(name|email):\S+$/;
							if (!regex.test(query)) {
								throw new NodeOperationError(
									this.getNode(),
									'Invalid query format. Query must follow the format "displayName:<value>" or "email:<value>".',
								);
							}

							qs.query = query;
						}

						if (filter.userId) {
							qs.userId = filter.userId;
						}

						if (sort.sortRules) {
							const { orderBy, sortOrder } = sort.sortRules;
							if (orderBy) {
								qs.orderBy = orderBy;
							}
							if (sortOrder) {
								qs.sortOrder = sortOrder;
							}
						}

						if (!qs.customer) {
							qs.customer = 'my_customer';
						}

						if (!returnAll) {
							qs.maxResults = this.getNodeParameter('limit', i);
						}

						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'groups',
								'GET',
								'/directory/v1/groups',
								{},
								qs,
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i);
							responseData = await googleApiRequest.call(
								this,
								'GET',
								'/directory/v1/groups',
								{},
								qs,
							);
							responseData = responseData.groups || [];
						}
					}

					//https://developers.google.com/admin-sdk/directory/v1/reference/groups/update
					if (operation === 'update') {
						const groupId = this.getNodeParameter('groupId', i, undefined, {
							extractValue: true,
						}) as string;

						const updateFields = this.getNodeParameter('updateFields', i);

						const body: IDataObject = {};

						Object.assign(body, updateFields);

						responseData = await googleApiRequest.call(
							this,
							'PUT',
							`/directory/v1/groups/${groupId}`,
							body,
						);
					}
				} else if (resource === 'user') {
					//https://developers.google.com/admin-sdk/directory/reference/rest/v1/members/insert
					if (operation === 'addToGroup') {
						const groupId = this.getNodeParameter('groupId', i, undefined, {
							extractValue: true,
						}) as string;
						const userId = this.getNodeParameter('userId', i, undefined, {
							extractValue: true,
						}) as string;

						let userEmail: string | undefined;

						// If the user ID is not already an email, fetch the user details
						if (!userId.includes('@')) {
							const userDetails = (await googleApiRequest.call(
								this,
								'GET',
								`/directory/v1/users/${userId}`,
							)) as {
								primaryEmail: string;
							};
							userEmail = userDetails.primaryEmail;
						} else {
							userEmail = userId;
						}

						if (!userEmail) {
							throw new NodeOperationError(
								this.getNode(),
								'Unable to determine the user email for adding to the group',
								{ itemIndex: i },
							);
						}

						const body: IDataObject = {
							email: userEmail,
							role: 'MEMBER',
						};

						await googleApiRequest.call(
							this,
							'POST',
							`/directory/v1/groups/${groupId}/members`,
							body,
						);

						responseData = { added: true };
					}

					//https://developers.google.com/admin-sdk/directory/v1/reference/users/insert
					if (operation === 'create') {
						const domain = this.getNodeParameter('domain', i) as string;
						const firstName = this.getNodeParameter('firstName', i) as string;
						const lastName = this.getNodeParameter('lastName', i) as string;
						const password = this.getNodeParameter('password', i) as string;
						const username = this.getNodeParameter('username', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							name: {
								familyName: lastName,
								givenName: firstName,
							},
							password,
							primaryEmail: `${username}@${domain}`,
						};

						if (!username) {
							throw new NodeOperationError(this.getNode(), "The parameter 'Username' is empty", {
								itemIndex: i,
								description: "Please fill in the 'Username' parameter to create the user",
							});
						}

						if (additionalFields.phoneUi) {
							body.phones = (additionalFields.phoneUi as IDataObject).phoneValues as IDataObject[];
						}

						if (additionalFields.emailUi) {
							body.emails = (additionalFields.emailUi as IDataObject).emailValues as IDataObject[];
						}

						if (additionalFields.roles) {
							const roles = additionalFields.roles as string[];
							body.roles = {
								superAdmin: roles.includes('superAdmin'),
								groupsAdmin: roles.includes('groupsAdmin'),
								groupsReader: roles.includes('groupsReader'),
								groupsEditor: roles.includes('groupsEditor'),
								userManagement: roles.includes('userManagement'),
								helpDeskAdmin: roles.includes('helpDeskAdmin'),
								servicesAdmin: roles.includes('servicesAdmin'),
								inventoryReportingAdmin: roles.includes('inventoryReportingAdmin'),
								storageAdmin: roles.includes('storageAdmin'),
								directorySyncAdmin: roles.includes('directorySyncAdmin'),
								mobileAdmin: roles.includes('mobileAdmin'),
							};
						}

						if (additionalFields.customFields) {
							const customFields = (additionalFields.customFields as IDataObject)
								.fieldValues as IDataObject[];
							const customSchemas: IDataObject = {};
							customFields.forEach((field) => {
								const { schemaName, fieldName, value } = field as {
									schemaName: string;
									fieldName: string;
									value: string;
								};

								if (!schemaName || !fieldName || !value) {
									throw new NodeOperationError(this.getNode(), 'Invalid custom field data', {
										itemIndex: i,
										description: 'Schema name, field name, and value are required.',
									});
								}

								customSchemas[schemaName] ??= {};
								(customSchemas[schemaName] as IDataObject)[fieldName] = value;
							});

							if (Object.keys(customSchemas).length > 0) {
								body.customSchemas = customSchemas;
							}
						}

						responseData = await googleApiRequest.call(
							this,
							'POST',
							'/directory/v1/users',
							body,
							qs,
						);
					}

					//https://developers.google.com/admin-sdk/directory/v1/reference/users/delete
					if (operation === 'delete') {
						const userId = this.getNodeParameter('userId', i, undefined, {
							extractValue: true,
						}) as string;

						responseData = await googleApiRequest.call(
							this,
							'DELETE',
							`/directory/v1/users/${userId}`,
							{},
						);

						responseData = { deleted: true };
					}

					//https://developers.google.com/admin-sdk/directory/v1/reference/users/get
					if (operation === 'get') {
						const userId = this.getNodeParameter('userId', i, undefined, {
							extractValue: true,
						}) as string;

						const output = this.getNodeParameter('output', i);
						const projection = this.getNodeParameter('projection', i);
						const fields = this.getNodeParameter('fields', i, []) as string[];

						if (projection) {
							qs.projection = projection;
						}
						if (projection === 'custom' && qs.customFieldMask) {
							qs.customFieldMask = (qs.customFieldMask as string[]).join(',');
						}
						if (output === 'select') {
							if (!fields.includes('id')) {
								fields.push('id');
							}
							qs.fields = fields.join(',');
						}

						responseData = await googleApiRequest.call(
							this,
							'GET',
							`/directory/v1/users/${userId}`,
							{},
							qs,
						);

						if (output === 'simplified') {
							responseData = {
								kind: responseData.kind,
								id: responseData.id,
								primaryEmail: responseData.primaryEmail,
								name: responseData.name,
								isAdmin: responseData.isAdmin,
								lastLoginTime: responseData.lastLoginTime,
								creationTime: responseData.creationTime,
								suspended: responseData.suspended,
							};
						}
					}

					//https://developers.google.com/admin-sdk/directory/v1/reference/users/list
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const output = this.getNodeParameter('output', i);
						const fields = this.getNodeParameter('fields', i, []) as string[];
						const projection = this.getNodeParameter('projection', i) as string;
						const filter = this.getNodeParameter('filter', i, {}) as {
							customer?: string;
							domain?: string;
							query?: string;
							showDeleted?: boolean;
						};
						const sort = this.getNodeParameter('sort', i, {}) as {
							sortRules?: {
								orderBy?: string;
								sortOrder?: string;
							};
						};

						if (filter.customer) {
							qs.customer = filter.customer;
						}

						if (filter.domain) {
							qs.domain = filter.domain;
						}

						if (filter.query) {
							qs.query = filter.query.trim();
						}

						if (filter.showDeleted) {
							qs.showDeleted = filter.showDeleted ? 'true' : 'false';
						}

						if (sort.sortRules) {
							const { orderBy, sortOrder } = sort.sortRules;
							if (orderBy) {
								qs.orderBy = orderBy;
							}
							if (sortOrder) {
								qs.sortOrder = sortOrder;
							}
						}

						qs.projection = projection;
						if (projection === 'custom' && qs.customFieldMask) {
							qs.customFieldMask = (qs.customFieldMask as string[]).join(',');
						}

						if (output === 'select') {
							if (!fields.includes('id')) {
								fields.push('id');
							}
							qs.fields = `users(${fields.join(',')})`;
						}

						if (!qs.customer) {
							qs.customer = 'my_customer';
						}

						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'users',
								'GET',
								'/directory/v1/users',
								{},
								qs,
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i);
							responseData = await googleApiRequest.call(
								this,
								'GET',
								'/directory/v1/users',
								{},
								qs,
							);

							responseData = responseData.users;
						}

						if (output === 'simplified') {
							responseData = responseData.map((user: any) => ({
								kind: user.kind,
								id: user.id,
								primaryEmail: user.primaryEmail,
								name: user.name,
								isAdmin: user.isAdmin,
								lastLoginTime: user.lastLoginTime,
								creationTime: user.creationTime,
								suspended: user.suspended,
							}));
						}
					}

					//https://developers.google.com/admin-sdk/directory/reference/rest/v1/members/delete
					if (operation === 'removeFromGroup') {
						const groupId = this.getNodeParameter('groupId', i, undefined, {
							extractValue: true,
						}) as string;
						const userId = this.getNodeParameter('userId', i, undefined, {
							extractValue: true,
						}) as string;

						await googleApiRequest.call(
							this,
							'DELETE',
							`/directory/v1/groups/${groupId}/members/${userId}`,
						);

						responseData = { removed: true };
					}

					//https://developers.google.com/admin-sdk/directory/v1/reference/users/update
					if (operation === 'update') {
						const userId = this.getNodeParameter('userId', i, undefined, {
							extractValue: true,
						}) as string;
						const updateFields = this.getNodeParameter('updateFields', i);

						const body: {
							name?: { givenName?: string; familyName?: string };
							emails?: IDataObject[];
							primaryEmail?: string;
							phones?: IDataObject[];
							suspended?: boolean;
							roles?: { [key: string]: boolean };
							customSchemas?: IDataObject;
						} = {};

						if (updateFields.firstName) {
							body.name ??= {};
							body.name.givenName = updateFields.firstName as string;
						}

						if (updateFields.lastName) {
							body.name ??= {};
							body.name.familyName = updateFields.lastName as string;
						}

						if (updateFields.phoneUi) {
							body.phones = (updateFields.phoneUi as IDataObject).phoneValues as IDataObject[];
						}

						if (updateFields.emailUi) {
							body.emails = (updateFields.emailUi as IDataObject).emailValues as IDataObject[];
						}

						if (updateFields.primaryEmail) {
							body.primaryEmail = updateFields.primaryEmail as string;
						}

						if (updateFields.suspendUi) {
							body.suspended = updateFields.suspendUi as boolean;
						}

						if (updateFields.roles) {
							const roles = updateFields.roles as string[];
							body.roles = {
								superAdmin: roles.includes('superAdmin'),
								groupsAdmin: roles.includes('groupsAdmin'),
								groupsReader: roles.includes('groupsReader'),
								groupsEditor: roles.includes('groupsEditor'),
								userManagement: roles.includes('userManagement'),
								helpDeskAdmin: roles.includes('helpDeskAdmin'),
								servicesAdmin: roles.includes('servicesAdmin'),
								inventoryReportingAdmin: roles.includes('inventoryReportingAdmin'),
								storageAdmin: roles.includes('storageAdmin'),
								directorySyncAdmin: roles.includes('directorySyncAdmin'),
								mobileAdmin: roles.includes('mobileAdmin'),
							};
						}

						if (updateFields.customFields) {
							const customFields = (updateFields.customFields as IDataObject)
								.fieldValues as IDataObject[];
							const customSchemas: IDataObject = {};
							customFields.forEach((field) => {
								const { schemaName, fieldName, value } = field as {
									schemaName: string;
									fieldName: string;
									value: string;
								};

								if (!schemaName || !fieldName || !value) {
									throw new NodeOperationError(this.getNode(), 'Invalid custom field data', {
										itemIndex: i,
										description: 'Schema name, field name, and value are required.',
									});
								}

								customSchemas[schemaName] ??= {};
								(customSchemas[schemaName] as IDataObject)[fieldName] = value;
							});

							if (Object.keys(customSchemas).length > 0) {
								body.customSchemas = customSchemas;
							}
						}

						responseData = await googleApiRequest.call(
							this,
							'PUT',
							`/directory/v1/users/${userId}`,
							body,
							qs,
						);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (error instanceof NodeOperationError) {
					throw error;
				}
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({
							message: `Operation "${operation}" failed for resource "${resource}".`,
							description: error.message,
						}),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw new NodeOperationError(
					this.getNode(),
					`Operation "${operation}" failed for resource "${resource}".`,

					{
						description: `Please check the input parameters and ensure the API request is correctly formatted. Details: ${error.description}`,
						itemIndex: i,
					},
				);
			}
		}

		return [returnData];
	}
}
