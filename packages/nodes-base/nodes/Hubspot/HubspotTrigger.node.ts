import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	INodeTypeDescription,
	INodeType,
	IWebhookResponseData,
	IDataObject,
} from 'n8n-workflow';

import {
	hubspotApiRequest,
} from './GenericFunctions';

import {
	createHash,
 } from 'crypto';

export class HubspotTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hubspot Trigger',
		name: 'hubspotTrigger',
		icon: 'file:hubspot.png',
		group: ['trigger'],
		version: 1,
		subtitle: '={{($parameter["appId"]) ? $parameter["event"] : ""}}',
		description: 'Starts the workflow when Hubspot events occure.',
		defaults: {
			name: 'Hubspot Trigger',
			color: '#ff7f64',
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
				displayName: 'App ID',
				name: 'appId',
				type: 'string',
				default: '',
				required: true,
				description: 'App ID',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'contact.creation',
						value: 'contact.creation',
						description: `To get notified if any contact is created in a customer's account.`,
					},
					{
						name: 'contact.deletion',
						value: 'contact.deletion',
						description: `To get notified if any contact is deleted in a customer's account.`,
					},
					{
						name: 'contact.privacyDeletion',
						value: 'contact.privacyDeletion',
						description: `To get notified if a contact is deleted for privacy compliance reasons. `,
					},
					{
						name: 'contact.propertyChange',
						value: 'contact.propertyChange',
						description: `to get notified if a specified property is changed for any contact in a customer's account. `,
					},
					{
						name: 'company.creation',
						value: 'company.creation',
						description: `To get notified if any company is created in a customer's account.`,
					},
					{
						name: 'company.deletion',
						value: 'company.deletion',
						description: `To get notified if any company is deleted in a customer's account.`,
					},
					{
						name: 'company.propertyChange',
						value: 'company.propertyChange',
						description: `To get notified if a specified property is changed for any company in a customer's account.`,
					},
					{
						name: 'deal.creation',
						value: 'deal.creation',
						description: `To get notified if any deal is created in a customer's account.`,
					},
					{
						name: 'deal.deletion',
						value: 'deal.deletion',
						description: `To get notified if any deal is deleted in a customer's account.`,
					},
					{
						name: 'deal.propertyChange',
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
				type: 'string',
				displayOptions: {
					show: {
						event: [
							'contact.propertyChange',
							'company.propertyChange',
							'deal.propertyChange',
						],
					},
				},
				default: '',
				required: true,
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

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const app = parseInt(this.getNodeParameter('appId') as string, 10);
				const event = this.getNodeParameter('event') as string;
				const webhookUrlUi = this.getNodeWebhookUrl('default') as string;
				let endpoint = `/webhooks/v1/${app}/settings`;
				const { webhookUrl , appId } = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				endpoint = `/webhooks/v1/${app}/subscriptions`;
				const subscriptions = await hubspotApiRequest.call(this, 'GET', endpoint, {});
				for (const subscription of subscriptions) {
					if (webhookUrl === webhookUrlUi
					&& appId === app
					&& subscription.subscriptionDetails.subscriptionType === event
					&& subscription.enabled === true) {
						return true;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const app = this.getNodeParameter('appId') as string;
				const event = this.getNodeParameter('event') as string;
				const additionalFields = this.getNodeParameter('additionalFields') as IDataObject;
				const propertyEvents = [
					'contact.propertyChange',
					'company.propertyChange',
					'deal.propertyChange',
				];
				let endpoint = `/webhooks/v1/${app}/settings`;
				let body: IDataObject = {
					webhookUrl,
					maxConcurrentRequests: additionalFields.maxConcurrentRequests || 5,
				};
				await hubspotApiRequest.call(this, 'PUT', endpoint, body);

				endpoint = `/webhooks/v1/${app}/subscriptions`;
				body = {
					subscriptionDetails: {
						subscriptionType: event,
					},
					enabled: true,
				};
				if (propertyEvents.includes(event)) {
					const property = this.getNodeParameter('property') as string;
					//@ts-ignore
					body.subscriptionDetails.propertyName = property;
				}

				const responseData = await hubspotApiRequest.call(this, 'POST', endpoint, body);

				if (responseData.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = responseData.id as string;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const app = this.getNodeParameter('appId') as string;
				if (webhookData.webhookId !== undefined) {
					const endpoint = `/webhooks/v1/${app}/subscriptions/${webhookData.webhookId}`;

					const body = {};

					try {
						await hubspotApiRequest.call(this, 'DELETE', endpoint, body);
					} catch (e) {
						return false;
					}
					// Remove from the static workflow data so that it is clear
					// that no webhooks are registred anymore
					delete webhookData.webhookId;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {

		const credentials = this.getCredentials('hubspotDeveloperApi') as IDataObject;

		if (credentials === undefined) {
			throw new Error('No credentials found!');
		}

		const req = this.getRequestObject();
		const bodyData = req.body;
		const headerData = this.getHeaderData();
		//@ts-ignore
		if (headerData['x-hubspot-signature'] === undefined) {
			return {};
		}

		// check signare if client secret is defined

		if (credentials.clientSecret !== '') {
			const hash = `${credentials!.clientSecret}${JSON.stringify(bodyData)}`;
			const signature =  createHash('sha256').update(hash).digest('hex');
			//@ts-ignore
			if (signature !== headerData['x-hubspot-signature']) {
				return {};
			}
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
