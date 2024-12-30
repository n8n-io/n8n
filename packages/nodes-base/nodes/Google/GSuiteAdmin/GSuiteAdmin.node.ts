import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { ApplicationError, NodeConnectionType, NodeOperationError } from 'n8n-workflow';

import { deviceFields, deviceOperations } from './DeviceDescription';
import {
	googleApiRequest,
	googleApiRequestAllItems,
	searchGroups,
	searchUsers,
} from './GenericFunctions';
import { groupFields, groupOperations } from './GroupDescripion';
import { userFields, userOperations } from './UserDescription';

export class GSuiteAdmin implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Workspace Admin',
		name: 'gSuiteAdmin',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:google-workspace-admin.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Google Workspace Admin API',
		defaults: {
			name: 'Google Workspace Admin',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
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
						name: 'Group',
						value: 'group',
					},
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'Device',
						value: 'device',
					},
				],
				default: 'user',
			},
			...groupOperations,
			...groupFields,
			...userOperations,
			...userFields,
			...deviceOperations,
			...deviceFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the domains to display them to user so that they can
			// select them easily
			async getDomains(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const domains = await googleApiRequestAllItems.call(
					this,
					'domains',
					'GET',
					'/directory/v1/customer/my_customer/domains',
				);
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
			// Get all the schemas to display them to user so that they can
			// select them easily
			async getSchemas(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const schemas = await googleApiRequestAllItems.call(
					this,
					'schemas',
					'GET',
					'/directory/v1/customer/my_customer/schemas',
				);
				for (const schema of schemas) {
					const schemaName = schema.displayName;
					const schemaId = schema.schemaName;
					returnData.push({
						name: schemaName,
						value: schemaId,
					});
				}
				return returnData;
			},
			async getOrgUnits(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const orgUnits = await googleApiRequest.call(
					this,
					'GET',
					'/directory/v1/customer/my_customer/orgunits?orgUnitPath=/&type=all',
				);
				for (const orgUnit of orgUnits.organizationUnits) {
					const orgUnitName = orgUnit.orgUnitPath;
					returnData.push({
						name: orgUnitName,
						value: orgUnitName,
					});
				}
				return returnData;
			},
		},
		listSearch: {
			searchGroups,
			searchUsers,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'group') {
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
						const groupIdRaw = this.getNodeParameter('groupId', i) as any;
						const groupId = typeof groupIdRaw === 'string' ? groupIdRaw : groupIdRaw.value;

						if (!groupId) {
							throw new NodeOperationError(
								this.getNode(),
								'Group ID is required but was not provided.',
								{ itemIndex: i },
							);
						}
						responseData = await googleApiRequest.call(
							this,
							'DELETE',
							`/directory/v1/groups/${groupId}`,
							{},
						);

						responseData = { success: true };
					}

					//https://developers.google.com/admin-sdk/directory/v1/reference/groups/get
					if (operation === 'get') {
						const groupIdRaw = this.getNodeParameter('groupId', i) as any;
						const groupId = typeof groupIdRaw === 'string' ? groupIdRaw : groupIdRaw.value;

						if (!groupId) {
							throw new NodeOperationError(
								this.getNode(),
								'Group ID is required but was not provided.',
								{ itemIndex: i },
							);
						}
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
						const filter = this.getNodeParameter('filter', i, {}) as IDataObject;
						const sort = this.getNodeParameter('sort', i, {}) as IDataObject;

						//TODO Check how to send correct query field
						if (typeof filter.query === 'string') {
							const query = filter.query.trim();

							// Validate the query format
							const regex = /^(name|email):\S+$/;
							if (!regex.test(query)) {
								throw new ApplicationError(
									'Invalid query format. Query must follow the format "displayName:<value>" or "email:<value>".',
								);
							}

							qs.query = query;
						}

						// Handle sort options
						if (sort.sortRules) {
							const { orderBy, sortOrder } = sort.sortRules as {
								orderBy?: string;
								sortOrder?: string;
							};
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

						// Fetch all or limited results
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
						const groupIdRaw = this.getNodeParameter('groupId', i) as any;
						const groupId = typeof groupIdRaw === 'string' ? groupIdRaw : groupIdRaw.value;

						if (!groupId) {
							throw new NodeOperationError(
								this.getNode(),
								'Group ID is required but was not provided.',
								{ itemIndex: i },
							);
						}

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
				}

				if (resource === 'user') {
					//https://developers.google.com/admin-sdk/directory/reference/rest/v1/members/insert
					if (operation === 'addToGroup') {
						const groupIdRaw = this.getNodeParameter('groupId', i) as any;
						const groupId = typeof groupIdRaw === 'string' ? groupIdRaw : groupIdRaw.value;

						const userIdRaw = this.getNodeParameter('userId', i) as any;
						const userId = typeof userIdRaw === 'string' ? userIdRaw : userIdRaw.value;

						let userEmail: string | undefined;

						// If the user ID is not already an email, fetch the user details
						if (!userId.includes('@')) {
							console.log('User ID is not an email; fetching user details...');
							const userDetails = await googleApiRequest.call(
								this,
								'GET',
								`/directory/v1/users/${userId}`,
							);
							userEmail = userDetails.primaryEmail;
						} else {
							userEmail = userId;
						}

						if (!userEmail) {
							throw new ApplicationError(
								'Unable to determine the user email for adding to the group.',
							);
						}

						const body: IDataObject = {
							email: userEmail,
							role: 'MEMBER',
						};

						responseData = await googleApiRequest.call(
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

						Object.assign(body, additionalFields);

						if (additionalFields.phoneUi) {
							const phones = (additionalFields.phoneUi as IDataObject).phoneValues as IDataObject[];
							body.phones = phones;
							delete body.phoneUi;
						}

						if (additionalFields.emailUi) {
							const emails = (additionalFields.emailUi as IDataObject).emailValues as IDataObject[];
							body.emails = emails;
							delete body.emailUi;
						}

						if (additionalFields.roles) {
							const roles = (additionalFields.roles as IDataObject).rolesValues as IDataObject;

							body.roles = {
								superAdmin: Boolean(roles.superAdmin),
								groupsAdmin: Boolean(roles.groupsAdmin),
								groupsReader: Boolean(roles.groupsReader),
								groupsEditor: Boolean(roles.groupsEditor),
								userManagement: Boolean(roles.userManagement),
								helpDeskAdmin: Boolean(roles.helpDeskAdmin),
								servicesAdmin: Boolean(roles.servicesAdmin),
								inventoryReportingAdmin: Boolean(roles.inventoryReportingAdmin),
								storageAdmin: Boolean(roles.storageAdmin),
								directorySyncAdmin: Boolean(roles.directorySyncAdmin),
								mobileAdmin: Boolean(roles.mobileAdmin),
							};
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
						const userIdRaw = this.getNodeParameter('userId', i) as any;
						const userId = typeof userIdRaw === 'string' ? userIdRaw : userIdRaw.value;

						if (!userId) {
							throw new NodeOperationError(
								this.getNode(),
								'User ID is required but was not provided.',
								{ itemIndex: i },
							);
						}

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
						const userIdRaw = this.getNodeParameter('userId', i) as any;
						const userId = typeof userIdRaw === 'string' ? userIdRaw : userIdRaw.value;

						const output = this.getNodeParameter('output', i);
						const projection = this.getNodeParameter('projection', i);
						const fields = this.getNodeParameter('fields', i, []) as string[];

						// Validate User ID
						if (!userId) {
							throw new NodeOperationError(
								this.getNode(),
								'User ID is required but was not provided.',
								{ itemIndex: i },
							);
						}

						if (projection) {
							qs.projection = projection;
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
						const filter = this.getNodeParameter('filter', i, {}) as IDataObject;
						const sort = this.getNodeParameter('sort', i, {}) as IDataObject;

						if (typeof filter.query === 'string') {
							const query = filter.query.trim();
							if (query) {
								qs.query = query;
							}
						}

						if (sort.sortRules) {
							const { orderBy, sortOrder } = sort.sortRules as {
								orderBy?: string;
								sortOrder?: string;
							};
							if (orderBy) {
								qs.orderBy = orderBy;
							}
							if (sortOrder) {
								qs.sortOrder = sortOrder;
							}
						}

						qs.projection = projection;
						if (projection === 'custom' && !qs.customFieldMask) {
							throw new NodeOperationError(
								this.getNode(),
								'When projection is set to custom, the custom schemas field must be defined',
								{ itemIndex: i },
							);
						}
						if (qs.customFieldMask) {
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
						const groupIdRaw = this.getNodeParameter('groupId', i) as any;
						const groupId = typeof groupIdRaw === 'string' ? groupIdRaw : groupIdRaw.value;
						const userIdRaw = this.getNodeParameter('userId', i) as any;
						const userId = typeof userIdRaw === 'string' ? userIdRaw : userIdRaw.value;
						const body: IDataObject = {
							email: userId,
							role: 'MEMBER',
						};

						await googleApiRequest.call(
							this,
							'DELETE',
							`/directory/v1/groups/${groupId}/members/${userId}`,
						);

						responseData = { removed: true };
					}

					//https://developers.google.com/admin-sdk/directory/v1/reference/users/update
					if (operation === 'update') {
						const userIdRaw = this.getNodeParameter('userId', i) as any;
						const userId = typeof userIdRaw === 'string' ? userIdRaw : userIdRaw.value;
						const updateFields = this.getNodeParameter('updateFields', i);

						// Validate User ID
						if (!userId) {
							throw new NodeOperationError(
								this.getNode(),
								'User ID is required but was not provided.',
								{ itemIndex: i },
							);
						}

						const body: {
							name?: { givenName?: string; familyName?: string };
							emails?: IDataObject[];
							primaryEmail?: string;
							phones?: IDataObject[];
							suspended?: boolean;
							roles?: { [key: string]: boolean };
						} = {};

						if (updateFields.firstName) {
							body.name = body.name || {};
							body.name.givenName = updateFields.firstName as string;
						}

						if (updateFields.lastName) {
							body.name = body.name || {};
							body.name.familyName = updateFields.lastName as string;
						}

						if (updateFields.phoneUi) {
							const phones = (updateFields.phoneUi as IDataObject).phoneValues as IDataObject[];
							body.phones = phones;
						}

						if (updateFields.emailUi) {
							const emails = (updateFields.emailUi as IDataObject).emailValues as IDataObject[];
							body.emails = emails;
						}

						if (updateFields.primaryEmail) {
							body.primaryEmail = updateFields.primaryEmail as string;
						}

						if (typeof updateFields.suspendUi === 'boolean') {
							body.suspended = updateFields.suspendUi;
						}

						if (updateFields.roles) {
							const roles = (updateFields.roles as IDataObject).rolesValues as IDataObject;

							body.roles = {
								superAdmin: Boolean(roles.superAdmin),
								groupsAdmin: Boolean(roles.groupsAdmin),
								groupsReader: Boolean(roles.groupsReader),
								groupsEditor: Boolean(roles.groupsEditor),
								userManagement: Boolean(roles.userManagement),
								helpDeskAdmin: Boolean(roles.helpDeskAdmin),
								servicesAdmin: Boolean(roles.servicesAdmin),
								inventoryReportingAdmin: Boolean(roles.inventoryReportingAdmin),
								storageAdmin: Boolean(roles.storageAdmin),
								directorySyncAdmin: Boolean(roles.directorySyncAdmin),
								mobileAdmin: Boolean(roles.mobileAdmin),
							};
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

				if (resource === 'device') {
					//https://developers.google.com/admin-sdk/directory/v1/customer/my_customer/devices/chromeos/uuid
					if (operation === 'get') {
						const uuid = this.getNodeParameter('uuid', i) as string;
						const projection = this.getNodeParameter('projection', 1);

						// Validate uuid
						if (!uuid) {
							throw new NodeOperationError(
								this.getNode(),
								'uuid is required but was not provided.',
								{ itemIndex: i },
							);
						}
						responseData = await googleApiRequest.call(
							this,
							'GET',
							`/directory/v1/customer/my_customer/devices/chromeos/${uuid}?projection=${projection}`,
							{},
						);
					}

					//https://developers.google.com/admin-sdk/directory/v1/customer/my_customer/devices/chromeos/
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const projection = this.getNodeParameter('projection', 1);

						const options = this.getNodeParameter('options', 2);

						qs.projection = projection;
						Object.assign(qs, options);

						if (qs.customer === undefined) {
							qs.customer = 'my_customer';
						}

						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'chromeosdevices',
								'GET',
								`/directory/v1/customer/${qs.customer}/devices/chromeos/`,
								{},
								qs,
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i);

							responseData = await googleApiRequest.call(
								this,
								'GET',
								`/directory/v1/customer/${qs.customer}/devices/chromeos/`,
								{},
								qs,
							);
						}
					}

					if (operation === 'update') {
						const uuid = this.getNodeParameter('uuid', i) as string;
						const projection = this.getNodeParameter('projection', 1);
						const updateOptions = this.getNodeParameter('updateOptions', 1);

						// Validate uuid
						if (!uuid) {
							throw new NodeOperationError(
								this.getNode(),
								'uuid is required but was not provided.',
								{ itemIndex: i },
							);
						}
						Object.assign(qs, updateOptions);
						responseData = await googleApiRequest.call(
							this,
							'PUT',
							`/directory/v1/customer/my_customer/devices/chromeos/${uuid}?projection=${projection}`,
							qs,
						);
					}

					if (operation === 'changeStatus') {
						const uuid = this.getNodeParameter('uuid', i) as string;
						const action = this.getNodeParameter('action', 1);

						qs.action = action;
						responseData = await googleApiRequest.call(
							this,
							'POST',
							`/directory/v1/customer/my_customer/devices/chromeos/${uuid}/action`,
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
						description: `Please check the input parameters and ensure the API request is correctly formatted. Details: ${error.message}`,
						itemIndex: i,
					},
				);
			}
		}
		return [returnData];
	}
}
