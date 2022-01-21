import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	companyFields,
	contactFields,
	dealFields,
	hubspotApiRequest,
	propertyEvents,
} from './GenericFunctions';

import {
	createHash,
} from 'crypto';

import {
	capitalCase,
} from 'change-case';

export class HubspotTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HubSpot Trigger',
		name: 'hubspotTrigger',
		icon: 'file:hubspot.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when HubSpot events occur',
		defaults: {
			name: 'Hubspot Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'hubspotDeveloperApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
			{
				name: 'setup',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'eventsUi',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Event',
				default: {},
				options: [
					{
						displayName: 'Event',
						name: 'eventValues',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'options',
								options: [
									{
										name: 'Contact Created',
										value: 'contact.creation',
										description: `To get notified if any contact is created in a customer's account.`,
									},
									{
										name: 'Contact Deleted',
										value: 'contact.deletion',
										description: `To get notified if any contact is deleted in a customer's account.`,
									},
									{
										name: 'Contact Privacy Deleted',
										value: 'contact.privacyDeletion',
										description: `To get notified if a contact is deleted for privacy compliance reasons. `,
									},
									{
										name: 'Contact Property Changed',
										value: 'contact.propertyChange',
										description: `to get notified if a specified property is changed for any contact in a customer's account. `,
									},
									{
										name: 'Company Created',
										value: 'company.creation',
										description: `To get notified if any company is created in a customer's account.`,
									},
									{
										name: 'Company Deleted',
										value: 'company.deletion',
										description: `To get notified if any company is deleted in a customer's account.`,
									},
									{
										name: 'Company Property Changed',
										value: 'company.propertyChange',
										description: `To get notified if a specified property is changed for any company in a customer's account.`,
									},
									{
										name: 'Deal Created',
										value: 'deal.creation',
										description: `To get notified if any deal is created in a customer's account.`,
									},
									{
										name: 'Deal Deleted',
										value: 'deal.deletion',
										description: `To get notified if any deal is deleted in a customer's account.`,
									},
									{
										name: 'Deal Property Changed',
										value: 'deal.propertyChange',
										description: `To get notified if a specified property is changed for any deal in a customer's account.`,
									},
								],
								default: 'contact.creation',
								required: true,
							},
							{
								displayName: 'Property',
								name: 'property',
								type: 'options',
								typeOptions: {
									loadOptionsDependsOn: [
										'contact.propertyChange',
									],
									loadOptionsMethod: 'getContactProperties',
								},
								displayOptions: {
									show: {
										name: [
											'contact.propertyChange',
										],
									},
								},
								default: '',
								required: true,
							},
							{
								displayName: 'Property',
								name: 'property',
								type: 'options',
								typeOptions: {
									loadOptionsDependsOn: [
										'company.propertyChange',
									],
									loadOptionsMethod: 'getCompanyProperties',
								},
								displayOptions: {
									show: {
										name: [
											'company.propertyChange',
										],
									},
								},
								default: '',
								required: true,
							},
							{
								displayName: 'Property',
								name: 'property',
								type: 'options',
								typeOptions: {
									loadOptionsDependsOn: [
										'deal.propertyChange',
									],
									loadOptionsMethod: 'getDealProperties',
								},
								displayOptions: {
									show: {
										name: [
											'deal.propertyChange',
										],
									},
								},
								default: '',
								required: true,
							},
						],
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Max Concurrent Requests',
						name: 'maxConcurrentRequests',
						type: 'number',
						typeOptions: {
							minValue: 5,
						},
						default: 5,
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available contacts to display them to user so that he can
			// select them easily
			async getContactProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/contacts/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					const propertyName = property.label;
					const propertyId = property.name;
					returnData.push({
						name: propertyName,
						value: propertyId,
					});
				}
				return returnData;
			},
			// Get all the available companies to display them to user so that he can
			// select them easily
			async getCompanyProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/companies/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					const propertyName = property.label;
					const propertyId = property.name;
					returnData.push({
						name: propertyName,
						value: propertyId,
					});
				}
				return returnData;
			},
			// Get all the available deals to display them to user so that he can
			// select them easily
			async getDealProperties(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const endpoint = '/properties/v2/deals/properties';
				const properties = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const property of properties) {
					const propertyName = property.label;
					const propertyId = property.name;
					returnData.push({
						name: propertyName,
						value: propertyId,
					});
				}
				return returnData;
			},
		},
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const currentWebhookUrl = this.getNodeWebhookUrl('default') as string;
				const { appId } = await this.getCredentials('hubspotDeveloperApi') as IDataObject;

				try {
					const { targetUrl } = await hubspotApiRequest.call(this, 'GET', `/webhooks/v3/${appId}/settings`, {});
					if (targetUrl !== currentWebhookUrl) {
						throw new NodeOperationError(this.getNode(), `The APP ID ${appId} already has a target url ${targetUrl}. Delete it or use another APP ID before executing the trigger. Due to Hubspot API limitations, you can have just one trigger per APP.`);
					}
				} catch (error) {
					if (error.statusCode === 404) {
						return false;
					}
				}
				// if the app is using the current webhook url. Delete everything and create it again with the current events

				const { results: subscriptions } = await hubspotApiRequest.call(this, 'GET', `/webhooks/v3/${appId}/subscriptions`, {});

				// delete all subscriptions
				for (const subscription of subscriptions) {
					await hubspotApiRequest.call(this, 'DELETE', `/webhooks/v3/${appId}/subscriptions/${subscription.id}`, {});
				}

				await hubspotApiRequest.call(this, 'DELETE', `/webhooks/v3/${appId}/settings`, {});

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const { appId } = await this.getCredentials('hubspotDeveloperApi') as IDataObject;
				const events = (this.getNodeParameter('eventsUi') as IDataObject || {}).eventValues as IDataObject[] || [];
				const additionalFields = this.getNodeParameter('additionalFields') as IDataObject;
				let endpoint = `/webhooks/v3/${appId}/settings`;
				let body: IDataObject = {
					targetUrl: webhookUrl,
					maxConcurrentRequests: additionalFields.maxConcurrentRequests || 5,
				};

				await hubspotApiRequest.call(this, 'PUT', endpoint, body);

				endpoint = `/webhooks/v3/${appId}/subscriptions`;

				if (Array.isArray(events) && events.length === 0) {
					throw new NodeOperationError(this.getNode(), `You must define at least one event`);
				}

				for (const event of events) {
					body = {
						eventType: event.name,
						active: true,
					};
					if (propertyEvents.includes(event.name as string)) {
						const property = event.property;
						body.propertyName = property;
					}
					await hubspotApiRequest.call(this, 'POST', endpoint, body);
				}

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const { appId } = await this.getCredentials('hubspotDeveloperApi') as IDataObject;

				const { results: subscriptions } = await hubspotApiRequest.call(this, 'GET', `/webhooks/v3/${appId}/subscriptions`, {});

				for (const subscription of subscriptions) {
					await hubspotApiRequest.call(this, 'DELETE', `/webhooks/v3/${appId}/subscriptions/${subscription.id}`, {});
				}

				try {
					await hubspotApiRequest.call(this, 'DELETE', `/webhooks/v3/${appId}/settings`, {});
				} catch (error) {
					return false;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {

		const credentials = await this.getCredentials('hubspotDeveloperApi') as IDataObject;

		if (credentials === undefined) {
			throw new NodeOperationError(this.getNode(), 'No credentials found!');
		}

		const req = this.getRequestObject();
		const bodyData = req.body;
		const headerData = this.getHeaderData();
		//@ts-ignore
		if (headerData['x-hubspot-signature'] === undefined) {
			return {};
		}

		const hash = `${credentials!.clientSecret}${JSON.stringify(bodyData)}`;
		const signature = createHash('sha256').update(hash).digest('hex');
		//@ts-ignore
		if (signature !== headerData['x-hubspot-signature']) {
			return {};
		}

		for (let i = 0; i < bodyData.length; i++) {
			const subscriptionType = bodyData[i].subscriptionType as string;
			if (subscriptionType.includes('contact')) {
				bodyData[i].contactId = bodyData[i].objectId;
			}
			if (subscriptionType.includes('company')) {
				bodyData[i].companyId = bodyData[i].objectId;
			}
			if (subscriptionType.includes('deal')) {
				bodyData[i].dealId = bodyData[i].objectId;
			}
			delete bodyData[i].objectId;
		}
		return {
			workflowData: [
				this.helpers.returnJsonArray(bodyData),
			],
		};
	}
}
