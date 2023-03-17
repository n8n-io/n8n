import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { payPalApiRequest, upperFist } from './GenericFunctions';

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
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Event Names or IDs',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description:
					'The event to listen to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
						description: 'Any time any event is triggered (Wildcard Event)',
					},
				];
				let events;
				try {
					const endpoint = '/notifications/webhooks-event-types';
					events = await payPalApiRequest.call(this, endpoint, 'GET');
				} catch (error) {
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}
				for (const event of events.event_types) {
					const eventName = upperFist(event.name as string);
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
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}
				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				let webhook;
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events', []) as string[];
				const body = {
					url: webhookUrl,
					event_types: events.map((event) => {
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
		const webhookData = this.getWorkflowStaticData('node');
		const bodyData = this.getBodyData();
		const req = this.getRequestObject();
		const headerData = this.getHeaderData() as IDataObject;
		const endpoint = '/notifications/verify-webhook-signature';

		const { env } = (await this.getCredentials('payPalApi')) as { env: string };

		// if sanbox omit verification
		if (env === 'sanbox') {
			return {
				workflowData: [this.helpers.returnJsonArray(req.body as IDataObject)],
			};
		}

		if (
			headerData['paypal-auth-algo'] !== undefined &&
			headerData['paypal-cert-url'] !== undefined &&
			headerData['paypal-transmission-id'] !== undefined &&
			headerData['paypal-transmission-sig'] !== undefined &&
			headerData['paypal-transmission-time'] !== undefined
		) {
			const body = {
				auth_algo: headerData['paypal-auth-algo'],
				cert_url: headerData['paypal-cert-url'],
				transmission_id: headerData['paypal-transmission-id'],
				transmission_sig: headerData['paypal-transmission-sig'],
				transmission_time: headerData['paypal-transmission-time'],
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
			workflowData: [this.helpers.returnJsonArray(req.body as IDataObject)],
		};
	}
}
