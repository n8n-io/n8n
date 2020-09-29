import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeTypeDescription,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

import {
	googleApiRequest,
	googleApiRequestAllItems,
} from './GenericFunctions';

import {
	userOperations,
	userFields,
} from './UserDescription';

export class GSuiteAdmin implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'G Suite Admin',
		name: 'gSuiteAdmin',
		icon: 'file:gSuiteAdmin.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume G Suite Admin API',
		defaults: {
			name: 'G Suite Admin',
			color: '#ecbb26',
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
				options: [
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'user',
				description: 'The resource to operate on.'
			},
			...userOperations,
			...userFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the domains to display them to user so that he can
			// select them easily
			async getDomains(
				this: ILoadOptionsFunctions
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const domains = await googleApiRequestAllItems.call(
					this,
					'domains',
					'GET',
					'/directory/v1/customer/my_customer/domains'
				);
				for (const domain of domains) {
					const domainName = domain.domainName;
					const domainId = domain.domainName;
					returnData.push({
						name: domainName,
						value: domainId
					});
				}
				return returnData;
			},
			// Get all the schemas to display them to user so that he can
			// select them easily
			async getSchemas(
				this: ILoadOptionsFunctions
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const schemas = await googleApiRequestAllItems.call(
					this,
					'schemas',
					'GET',
					'/directory/v1/customer/my_customer/schemas'
				);
				for (const schema of schemas) {
					const schemaName = schema.displayName;
					const schemaId = schema.schemaName;
					returnData.push({
						name: schemaName,
						value: schemaId
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {

			if (resource === 'user') {

				//https://developers.google.com/admin-sdk/directory/v1/reference/users/insert
				if (operation === 'create') {

					const domain = this.getNodeParameter('domain', i) as string;

					const firstName = this.getNodeParameter('firstName', i) as string;

					const lastName = this.getNodeParameter('lastName', i) as string;

					const password = this.getNodeParameter('password', i) as string;

					const username = this.getNodeParameter('username', i) as string;

					const makeAdmin = this.getNodeParameter('makeAdmin', i) as boolean;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

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

					responseData = await googleApiRequest.call(
						this,
						'POST',
						`/directory/v1/users`,
						body,
						qs
					);

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
						{}
					);

					responseData = { success: true };
				}

				//https://developers.google.com/admin-sdk/directory/v1/reference/users/get
				if (operation === 'get') {

					const userId = this.getNodeParameter('userId', i) as string;

					const projection = this.getNodeParameter('projection', i) as string;

					const options = this.getNodeParameter('options', i) as IDataObject;

					qs.projection = projection;

					Object.assign(qs, options);

					if (qs.customFieldMask) {
						qs.customFieldMask = (qs.customFieldMask as string[]).join(' ');
					}

					if (qs.projection === 'custom' && qs.customFieldMask === undefined) {
						throw new Error('When projection is set to custom, the custom schemas field must be defined');
					}

					responseData = await googleApiRequest.call(
						this,
						'GET',
						`/directory/v1/users/${userId}`,
						{},
						qs
					);
				}

				//https://developers.google.com/admin-sdk/directory/v1/reference/users/list
				if (operation === 'getAll') {

					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					const projection = this.getNodeParameter('projection', i) as string;

					const options = this.getNodeParameter('options', i) as IDataObject;

					qs.projection = projection;

					Object.assign(qs, options);

					if (qs.customer === undefined) {
						qs.customer = 'my_customer';
					}

					if (qs.customFieldMask) {
						qs.customFieldMask = (qs.customFieldMask as string[]).join(' ');
					}

					if (qs.projection === 'custom' && qs.customFieldMask === undefined) {
						throw new Error('When projection is set to custom, the custom schemas field must be defined');
					}

					if (returnAll) {

						responseData = await googleApiRequestAllItems.call(
							this,
							'users',
							'GET',
							`/directory/v1/users`,
							{},
							qs
						);

					} else {

						qs.maxResults = this.getNodeParameter('limit', i) as number;

						responseData = await googleApiRequest.call(
							this,
							'GET',
							`/directory/v1/users`,
							{},
							qs
						);

						responseData = responseData.users;
					}
				}

				//https://developers.google.com/admin-sdk/directory/v1/reference/users/update
				if (operation === 'update') {

					const userId = this.getNodeParameter('userId', i) as string;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					const body: { name: { givenName?: string, familyName?: string }, emails?: IDataObject[], phones?: IDataObject[] } = { name: {} };

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

					//@ts-ignore
					body['customSchemas'] = { testing: { hasdog: true } };

					responseData = await googleApiRequest.call(
						this,
						'PUT',
						`/directory/v1/users/${userId}`,
						body,
						qs
					);
				}
			}
		}

		if (Array.isArray(responseData)) {

			returnData.push.apply(returnData, responseData as IDataObject[]);

		} else if (responseData !== undefined) {

			returnData.push(responseData as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
