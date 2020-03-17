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
	helpscoutApiRequest,
	helpscoutApiRequestAllItems,
} from './GenericFunctions';

import { createHmac } from 'crypto';

export class HelpScoutTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HelpScout Trigger',
		name: 'helpScoutTrigger',
		icon: 'file:helpScout.png',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when HelpScout events occure.',
		defaults: {
			name: 'HelpScout Trigger',
			color: '#1392ee',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'helpScoutOAuth2Api',
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
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: 'convo.agent.reply.created',
						value: 'convo.agent.reply.created',
					},
					{
						name: 'convo.assigned',
						value: 'convo.assigned',
					},
					{
						name: 'convo.created',
						value: 'convo.created',
					},
					{
						name: 'convo.customer.reply.created',
						value: 'convo.customer.reply.created',
					},
					{
						name: 'convo.deleted',
						value: 'convo.deleted',
					},
					{
						name: 'convo.merged',
						value: 'convo.merged',
					},
					{
						name: 'convo.moved',
						value: 'convo.moved',
					},
					{
						name: 'convo.note.created',
						value: 'convo.note.created',
					},
					{
						name: 'convo.status',
						value: 'convo.status',
					},
					{
						name: 'convo.tags',
						value: 'convo.tags',
					},
					{
						name: 'customer.created',
						value: 'customer.created',
					},
					{
						name: 'satisfaction.ratings',
						value: 'satisfaction.ratings',
					},
				],
				default: [],
				required: true,
			},
		],

	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const events = this.getNodeParameter('events') as string;

				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const endpoint = '/v2/webhooks';
				const data = await helpscoutApiRequestAllItems.call(this, '_embedded.webhooks', 'GET', endpoint, {});

				for (const webhook of data) {
					if (webhook.url === webhookUrl) {
						for (const event of events) {
							if (!webhook.events.includes(event)
							&&	webhook.state === 'enabled') {
								return false;
							}
						}
					}
					// Set webhook-id to be sure that it can be deleted
					webhookData.webhookId = webhook.id as string;
					return true;
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string;

				const endpoint = '/v2/webhooks';

				const body = {
					url: webhookUrl,
					events,
					secret: Math.random().toString(36).substring(2, 15),
				};

				const responseData = await helpscoutApiRequest.call(this, 'POST', endpoint, body, {}, undefined, { resolveWithFullResponse: true });

				if (responseData.headers['resource-id'] === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				webhookData.webhookId = responseData.headers['resource-id'] as string;
				webhookData.secret = body.secret;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId !== undefined) {

					const endpoint = `/v2/webhooks/${webhookData.webhookId}`;
					try {
						await helpscoutApiRequest.call(this, 'DELETE', endpoint);
					} catch (e) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registred anymore
					delete webhookData.webhookId;
					delete webhookData.secret;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const bodyData = this.getBodyData();
		const headerData = this.getHeaderData() as IDataObject;
		const webhookData = this.getWorkflowStaticData('node');
		if (headerData['x-helpscout-signature'] === undefined)  {
			return {};
		}
		//@ts-ignore
		const computedSignature = createHmac('sha1', webhookData.secret as string).update(req.rawBody).digest('base64');
		if (headerData['x-helpscout-signature'] !== computedSignature) {
			return {};
		}
		return {
			workflowData: [
				this.helpers.returnJsonArray(bodyData),
			],
		};
	}
}
