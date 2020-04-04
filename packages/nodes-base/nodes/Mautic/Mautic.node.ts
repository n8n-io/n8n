import { snakeCase } from 'change-case';

import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import {
	mauticApiRequest,
	mauticApiRequestAllItems,
	validateJSON,
} from './GenericFunctions';
import {
	contactFields,
	contactOperations,
} from './ContactDescription';

export class Mautic implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mautic',
		name: 'mautic',
		icon: 'file:mautic.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Mautic API',
		defaults: {
			name: 'Mautic',
			color: '#52619b',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mauticApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Contact',
						value: 'contact',
						description: 'Use this endpoint to manipulate and obtain details on Mautic’s contacts.',
					},
				],
				default: 'contact',
				description: 'Resource to consume.',
			},
			...contactOperations,
			...contactFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available companies to display them to user so that he can
			// select them easily
			async getCompanies(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const companies = await mauticApiRequestAllItems.call(this, 'companies', 'GET', '/companies');
				for (const company of companies) {
					returnData.push({
						name: company.fields.all.companyname,
						value: company.id,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let qs: IDataObject;
		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			qs = {};
			const options = this.getNodeParameter('options', i) as IDataObject;

			if (resource === 'contact') {
				//https://developer.mautic.org/?php#create-contact
				if (operation === 'create') {
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const jsonActive = this.getNodeParameter('jsonParameters', i) as boolean;
					let body: IDataObject = {};
					if (!jsonActive) {
						body.email = this.getNodeParameter('email', i) as string;
						body.firstname = this.getNodeParameter('firstName', i) as string;
						body.lastname = this.getNodeParameter('lastName', i) as string;
						body.company = this.getNodeParameter('company', i) as string;
						body.position = this.getNodeParameter('position', i) as string;
						body.title = this.getNodeParameter('title', i) as string;
					} else {
						const json = validateJSON(this.getNodeParameter('bodyJson', i) as string);
						if (json !== undefined) {
							body = { ...json };
						} else {
							throw new Error('Invalid JSON');
						}
					}
					if (additionalFields.ipAddress) {
						body.ipAddress = additionalFields.ipAddress as string;
					}
					if (additionalFields.lastActive) {
						body.ipAddress = additionalFields.lastActive as string;
					}
					if (additionalFields.ownerId) {
						body.ownerId = additionalFields.ownerId as string;
					}
					responseData = await mauticApiRequest.call(this, 'POST', '/contacts/new', body);
					responseData = responseData.contact;
				}
				//https://developer.mautic.org/?php#edit-contact
				if (operation === 'update') {
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					const contactId = this.getNodeParameter('contactId', i) as string;
					let body: IDataObject = {};
					if (updateFields.email) {
						body.email = updateFields.email as string;
					}
					if (updateFields.firstName) {
						body.firstname = updateFields.firstName as string;
					}
					if (updateFields.lastName) {
						body.lastname = updateFields.lastName as string;
					}
					if (updateFields.company) {
						body.company = updateFields.company as string;
					}
					if (updateFields.position) {
						body.position = updateFields.position as string;
					}
					if (updateFields.title) {
						body.title = updateFields.title as string;
					}
					if (updateFields.bodyJson) {
						const json = validateJSON(updateFields.bodyJson as string);
						if (json !== undefined) {
							body = { ...json };
						} else {
							throw new Error('Invalid JSON');
						}
					}
					if (updateFields.ipAddress) {
						body.ipAddress = updateFields.ipAddress as string;
					}
					if (updateFields.lastActive) {
						body.ipAddress = updateFields.lastActive as string;
					}
					if (updateFields.ownerId) {
						body.ownerId = updateFields.ownerId as string;
					}
					responseData = await mauticApiRequest.call(this, 'PATCH', `/contacts/${contactId}/edit`, body);
					responseData = responseData.contact;
				}
				//https://developer.mautic.org/?php#get-contact
				if (operation === 'get') {
					const contactId = this.getNodeParameter('contactId', i) as string;
					responseData = await mauticApiRequest.call(this, 'GET', `/contacts/${contactId}`);
					responseData = responseData.contact;
				}
				//https://developer.mautic.org/?php#list-contacts
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					qs = Object.assign(qs, options);
					if (qs.orderBy) {
						// For some reason does camelCase get used in the returned data
						// but snake_case here. So convert it automatically to not confuse
						// the users.
						qs.orderBy = snakeCase(qs.orderBy as string);
					}

					if (returnAll === true) {
						responseData = await mauticApiRequestAllItems.call(this, 'contacts', 'GET', '/contacts', {}, qs);
					} else {
						qs.limit = this.getNodeParameter('limit', i) as number;
						qs.start = 0;
						responseData = await mauticApiRequest.call(this, 'GET', '/contacts', {}, qs);
						responseData = responseData.contacts;
						responseData = Object.values(responseData);
					}

				}
				//https://developer.mautic.org/?php#delete-contact
				if (operation === 'delete') {
					const contactId = this.getNodeParameter('contactId', i) as string;
					responseData = await mauticApiRequest.call(this, 'DELETE', `/contacts/${contactId}/delete`);
					responseData = responseData.contact;
				}
			}

			if (Array.isArray(responseData)) {
				if (options.rawData !== true) {
					// @ts-ignore
					responseData = responseData.map(item => item.fields.all);
				}
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				if (options.rawData !== true) {
					// @ts-ignore
					responseData = responseData.fields.all;
				}
				returnData.push(responseData as IDataObject);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
