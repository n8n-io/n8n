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
				type: 'options',
				displayOptions: {
					show: {
						service: [
							'support'
						]
					}
				},
				options: [
					{
						name: 'ticket.created',
						value: 'ticket.created',
					},
				],
				required: true,
				default: '',
				description: '',
			},
		],

	};
	// @ts-ignore
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId === undefined) {
					return false;
				}
				const endpoint = `/triggers/${webhookData.webhookId}`;
				try {
					await zendeskApiRequest.call(this, 'GET', endpoint);
				} catch (e) {
					return false;
				}
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				let condition: IDataObject = {};
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const event = this.getNodeParameter('event') as string;
				if (event === 'ticket.created') {
					condition = {
						all: [
							{
								field: 'status',
								value: 'open',
							},
						],
					}
				}
				const bodyTrigger: IDataObject = {
					trigger: {
						conditions: { ...condition },
						actions: [
							{
								field: 'notification_target',
								value: [],
							}
						]
					},
				}
				const bodyTarget: IDataObject = {
					target: {
						title: 'N8N webhook',
						type: 'http_target',
						target_url: webhookUrl,
						method: 'POST',
						active: true,
						content_type: 'application/json',
					},
				}
				const { target } = await zendeskApiRequest.call(this, 'POST', '/targets', bodyTarget);
				// @ts-ignore
				bodyTrigger.trigger.actions[0].value = [target.id, ''];
				const { trigger } = await zendeskApiRequest.call(this, 'POST', '/triggers', bodyTrigger);
				webhookData.webhookId = trigger.id;
				webhookData.targetId = target.id;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				try {
					await zendeskApiRequest.call(this, 'DELETE', `/triggers/${webhookData.webhookId}`);
					await zendeskApiRequest.call(this, 'DELETE', `/targets/${webhookData.targetId}`);
				} catch(error) {
					return false;
				}
				delete webhookData.webhookId;
				delete webhookData.targetId
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
