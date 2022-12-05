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

import { googleApiRequest, googleApiRequestAllItems } from './GenericFunctions';

import { userFields, userOperations } from './UserDescription';

import { groupFields, groupOperations } from './GroupDescripion';

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
		inputs: ['main'],
		outputs: ['main'],
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
				],
				default: 'user',
			},
			...groupOperations,
			...groupFields,
			...userOperations,
			...userFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the domains to display them to user so that he can
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
			// Get all the schemas to display them to user so that he can
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
			if (resource === 'group') {
				//https://developers.google.com/admin-sdk/directory/v1/reference/groups/insert
				if (operation === 'create') {
					const email = this.getNodeParameter('email', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i);

					const body: IDataObject = {
						email,
					};

					Object.assign(body, additionalFields);

					responseData = await googleApiRequest.call(this, 'POST', `/directory/v1/groups`, body);
				}

				//https://developers.google.com/admin-sdk/directory/v1/reference/groups/delete
				if (operation === 'delete') {
					const groupId = this.getNodeParameter('groupId', i) as string;

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
					const groupId = this.getNodeParameter('groupId', i) as string;

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

					const options = this.getNodeParameter('options', i);

					Object.assign(qs, options);

					if (qs.customer === undefined) {
						qs.customer = 'my_customer';
					}

					if (returnAll) {
						responseData = await googleApiRequestAllItems.call(
							this,
							'groups',
							'GET',
							`/directory/v1/groups`,
							{},
							qs,
						);
					} else {
						qs.maxResults = this.getNodeParameter('limit', i);

						responseData = await googleApiRequest.call(this, 'GET', `/directory/v1/groups`, {}, qs);

						responseData = responseData.groups;
					}
				}

				//https://developers.google.com/admin-sdk/directory/v1/reference/groups/update
				if (operation === 'update') {
					const groupId = this.getNodeParameter('groupId', i) as string;

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
				//https://developers.google.com/admin-sdk/directory/v1/reference/users/insert
				if (operation === 'create') {
					const domain = this.getNodeParameter('domain', i) as string;

					const firstName = this.getNodeParameter('firstName', i) as string;

					const lastName = this.getNodeParameter('lastName', i) as string;

					const password = this.getNodeParameter('password', i) as string;

					const username = this.getNodeParameter('username', i) as string;

					const makeAdmin = this.getNodeParameter('makeAdmin', i) as boolean;

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

					responseData = await googleApiRequest.call(this, 'POST', `/directory/v1/users`, body, qs);

					if (makeAdmin) {
						await googleApiRequest.call(
							this,
							'POST',
							`/directory/v1/users/${responseData.id}/makeAdmin`,
							{ status: true },
						);

						responseData.isAdmin = true;
					}
				}

				//https://developers.google.com/admin-sdk/directory/v1/reference/users/delete
				if (operation === 'delete') {
					const userId = this.getNodeParameter('userId', i) as string;

					responseData = await googleApiRequest.call(
						this,
						'DELETE',
						`/directory/v1/users/${userId}`,
						{},
					);

					responseData = { success: true };
				}

				//https://developers.google.com/admin-sdk/directory/v1/reference/users/get
				if (operation === 'get') {
					const userId = this.getNodeParameter('userId', i) as string;

					const projection = this.getNodeParameter('projection', i) as string;

					const options = this.getNodeParameter('options', i);

					qs.projection = projection;

					Object.assign(qs, options);

					if (qs.customFieldMask) {
						qs.customFieldMask = (qs.customFieldMask as string[]).join(' ');
					}

					if (qs.projection === 'custom' && qs.customFieldMask === undefined) {
						throw new NodeOperationError(
							this.getNode(),
							'When projection is set to custom, the custom schemas field must be defined',
							{ itemIndex: i },
						);
					}

					responseData = await googleApiRequest.call(
						this,
						'GET',
						`/directory/v1/users/${userId}`,
						{},
						qs,
					);
				}

				//https://developers.google.com/admin-sdk/directory/v1/reference/users/list
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i);

					const projection = this.getNodeParameter('projection', i) as string;

					const options = this.getNodeParameter('options', i);

					qs.projection = projection;

					Object.assign(qs, options);

					if (qs.customer === undefined) {
						qs.customer = 'my_customer';
					}

					if (qs.customFieldMask) {
						qs.customFieldMask = (qs.customFieldMask as string[]).join(' ');
					}

					if (qs.projection === 'custom' && qs.customFieldMask === undefined) {
						throw new NodeOperationError(
							this.getNode(),
							'When projection is set to custom, the custom schemas field must be defined',
							{ itemIndex: i },
						);
					}

					if (returnAll) {
						responseData = await googleApiRequestAllItems.call(
							this,
							'users',
							'GET',
							`/directory/v1/users`,
							{},
							qs,
						);
					} else {
						qs.maxResults = this.getNodeParameter('limit', i);

						responseData = await googleApiRequest.call(this, 'GET', `/directory/v1/users`, {}, qs);

						responseData = responseData.users;
					}
				}

				//https://developers.google.com/admin-sdk/directory/v1/reference/users/update
				if (operation === 'update') {
					const userId = this.getNodeParameter('userId', i) as string;

					const updateFields = this.getNodeParameter('updateFields', i);

					const body: {
						name: { givenName?: string; familyName?: string };
						emails?: IDataObject[];
						phones?: IDataObject[];
					} = { name: {} };

					Object.assign(body, updateFields);

					if (updateFields.firstName) {
						body.name.givenName = updateFields.firstName as string;
						//@ts-ignore
						delete body.firstName;
					}

					if (updateFields.lastName) {
						body.name.familyName = updateFields.lastName as string;
						//@ts-ignore
						delete body.lastName;
					}

					if (Object.keys(body.name).length === 0) {
						//@ts-ignore
						delete body.name;
					}

					if (updateFields.phoneUi) {
						const phones = (updateFields.phoneUi as IDataObject).phoneValues as IDataObject[];

						body.phones = phones;

						//@ts-ignore
						delete body.phoneUi;
					}

					if (updateFields.emailUi) {
						const emails = (updateFields.emailUi as IDataObject).emailValues as IDataObject[];

						body.emails = emails;

						//@ts-ignore
						delete body.emailUi;
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
				this.helpers.returnJsonArray(responseData),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		}

		return this.prepareOutputData(returnData);
	}
}
