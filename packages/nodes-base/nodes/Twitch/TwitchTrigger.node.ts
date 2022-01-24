import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	snakeCase
} from 'change-case';

import {
 twitchApiRequest,
} from './GenericFunctions';

export class TwitchTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Twitch Trigger',
		name: 'twitchTrigger',
		icon: 'file:twitch.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Handle Twitch events via webhooks',
		defaults: {
			name: 'Twitch Trigger',
			color: '#5A3E85',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'twitchApi',
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
		properties: [{
			displayName: 'Event',
			name: 'event',
			type: 'options',
			required: true,
			default: '',
			options: [
				{
					name: 'Stream Online',
					value: 'stream.online',
				}
			],
		},
		{
			displayName: 'Broadcaster Id',
			name: 'broadcaster_user_id',
			type: 'string',
			required: true,
			default: '',
		}],
	};

	// @ts-ignore
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const event = this.getNodeParameter('event') as string;
				const { data: webhooks } = await twitchApiRequest.call(this, 'GET', '/');
				for (const webhook of webhooks) {
					if (webhook.transport.callback === webhookUrl && webhook.type === snakeCase(event)) {
						webhookData.webhookId = webhook.id;
						return true;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const event = this.getNodeParameter('event') as string;
				const broadcaster_user_id = this.getNodeParameter('broadcaster_user_id') as string;
				const body: IDataObject = {
					type: snakeCase(event),
					version: 1,
					condition: {
						broadcaster_user_id: broadcaster_user_id
					},
					transport: {
						method: 'webhook',
						callback: webhookUrl
					},
				};
				const webhook = await twitchApiRequest.call(this, 'POST', '/', body);
				webhookData.webhookId = webhook.data[0].id;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				try {
					await twitchApiRequest.call(this, 'DELETE', '/', {}, { id: webhookData.webhookId });
				} catch (error) {
					return false;
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	}

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		return {
			workflowData: [
				this.helpers.returnJsonArray(req.body),
			],
		};
	}
}
