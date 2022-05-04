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
	payPalApiRequest,
	upperFist
} from './GenericFunctions';

export class PayPalTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PayPal Trigger',
		name: 'payPalTrigger',
		icon: 'file:paypal.svg',
		group: ['trigger'],
		version: 1,
		description: 'Handle PayPal events via webhooks',
		defaults: {
			name: 'PayPal Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'payPalApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				reponseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'The event to listen to.',
				typeOptions: {
					loadOptionsMethod: 'getEvents',
				},
				options: [],
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the events types to display them to user so that he can
			// select them easily
			async getEvents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [
					{
						name: '*',
						value: '*',
						description: 'Any time any event is triggered (Wildcard Event).',
					},
				];
				let events;
				try {
					const endpoint = '/notifications/webhooks-event-types';
					events = await payPalApiRequest.call(this, endpoint, 'GET');
				} catch (error) {
					throw new NodeApiError(this.getNode(), error);
				}
				for (const event of events.event_types) {
					const eventName = upperFist(event.name);
					const eventId = event.name;
					const eventDescription = event.description;

					returnData.push({
						name: eventName,
						value: eventId,
						description: eventDescription,
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
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId === undefined) {
					// No webhook id is set so no webhook can exist
					return false;
				}
				const endpoint = `/notifications/webhooks/${webhookData.webhookId}`;
				try {
					await payPalApiRequest.call(this, endpoint, 'GET');
				} catch (error) {
					if (error.response && error.response.name === 'INVALID_RESOURCE_ID') {
						// Webhook does not exist
						delete webhookData.webhookId;
						return false;
					}
					throw new NodeApiError(this.getNode(), error);
				}
				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				let webhook;
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events', []) as string[];
				const body = {
					url: webhookUrl,
					event_types: events.map(event => {
						return { name: event };
					}),
				};
				const endpoint = '/notifications/webhooks';
				try {
					webhook = await payPalApiRequest.call(this, endpoint, 'POST', body);
				} catch (error) {
					throw error;
				}

				if (webhook.id === undefined) {
					return false;
				}
				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = webhook.id as string;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId !== undefined) {
					const endpoint = `/notifications/webhooks/${webhookData.webhookId}`;
					try {
						await payPalApiRequest.call(this, endpoint, 'DELETE', {});
					} catch (error) {
						return false;
					}
					delete webhookData.webhookId;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		let webhook;
		const webhookData = this.getWorkflowStaticData('node') as IDataObject;
		const bodyData = this.getBodyData() as IDataObject;
		const req = this.getRequestObject();
		const headerData = this.getHeaderData() as IDataObject;
		const endpoint = '/notifications/verify-webhook-signature';

		if (headerData['PAYPAL-AUTH-ALGO'] !== undefined
			&& headerData['PAYPAL-CERT-URL'] !== undefined
			&& headerData['PAYPAL-TRANSMISSION-ID'] !== undefined
			&& headerData['PAYPAL-TRANSMISSION-SIG'] !== undefined
			&& headerData['PAYPAL-TRANSMISSION-TIME'] !== undefined) {
			const body = {
				auth_algo: headerData['PAYPAL-AUTH-ALGO'],
				cert_url: headerData['PAYPAL-CERT-URL'],
				transmission_id: headerData['PAYPAL-TRANSMISSION-ID'],
				transmission_sig: headerData['PAYPAL-TRANSMISSION-SIG'],
				transmission_time: headerData['PAYPAL-TRANSMISSION-TIME'],
				webhook_id: webhookData.webhookId,
				webhook_event: bodyData,
			};
			try {
				webhook = await payPalApiRequest.call(this, endpoint, 'POST', body);
			} catch (error) {
				throw error;
			}
			if (webhook.verification_status !== 'SUCCESS') {
				return {};
			}
		} else {
			return {};
		}
		return {
			workflowData: [
				this.helpers.returnJsonArray(req.body),
			],
		};
	}
}
