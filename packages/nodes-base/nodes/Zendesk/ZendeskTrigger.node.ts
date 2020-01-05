import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	INodeTypeDescription,
	INodeType,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	zendeskApiRequest,
} from './GenericFunctions';

export class ZendeskTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zendesk Trigger',
		name: 'zendesk',
		icon: 'file:zendesk.png',
		group: ['trigger'],
		version: 1,
		description: 'Handle Zendesk events via webhooks',
		defaults: {
			name: 'Zendesk Trigger',
			color: '#559922',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'zendeskApi',
				required: true,
			}
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
				displayName: 'Service',
				name: 'service',
				type: 'options',
				required: true,
				options: [
					{
						name: 'Support',
						value: 'support',
					}
				],
				default: 'support',
				description: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				displayOptions: {
					show: {
						service: [
							'support'
						]
					}
				},
				options: [
					{
						name: 'ticket.status.open',
						value: 'ticket.status.open'
					},
				],
				required: true,
				default: [],
				description: '',
			},
		],

	};
	// @ts-ignore
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				let webhooks;
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId === undefined) {
					return false;
				}
				const endpoint = `/webhooks/${webhookData.webhookId}/`;
				try {
					webhooks = await zendeskApiRequest.call(this, 'GET', endpoint);
				} catch (e) {
					return false;
				}
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				let body, responseData;
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const event = this.getNodeParameter('event') as string;
				const actions = this.getNodeParameter('actions') as string[];
				const endpoint = `/webhooks/`;
				// @ts-ignore
				body = {
					endpoint_url: webhookUrl,
					actions: actions.join(','),
					event_id: event,
				};
				try {
					responseData = await zendeskApiRequest.call(this, 'POST', endpoint, body);
				} catch(error) {
					console.log(error)
					return false;
				}
				// @ts-ignore
				webhookData.webhookId = responseData.id;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				let responseData;
				const webhookData = this.getWorkflowStaticData('node');
				const endpoint = `/webhooks/${webhookData.webhookId}/`;
				try {
					responseData = await zendeskApiRequest.call(this, 'DELETE', endpoint);
				} catch(error) {
					return false;
				}
				if (!responseData.success) {
					return false;
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		return {
			workflowData: [
				this.helpers.returnJsonArray(req.body)
			],
		};
	}
}
