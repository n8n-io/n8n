import { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import { IDataObject, INodeType, INodeTypeDescription, IWebhookResponseData } from 'n8n-workflow';

import { mailjetApiRequest } from './GenericFunctions';

export class MailjetTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mailjet Trigger',
		name: 'mailjetTrigger',
		icon: 'file:mailjet.svg',
		group: ['trigger'],
		version: 1,
		description: 'Handle Mailjet events via webhooks',
		defaults: {
			name: 'Mailjet Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'mailjetEmailApi',
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
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: 'open',
				options: [
					{
						name: 'email.blocked',
						value: 'blocked',
					},
					{
						name: 'email.bounce',
						value: 'bounce',
					},
					{
						name: 'email.open',
						value: 'open',
					},
					{
						name: 'email.sent',
						value: 'sent',
					},
					{
						name: 'email.spam',
						value: 'spam',
					},
					{
						name: 'email.unsub',
						value: 'unsub',
					},
				],
				description: 'Determines which resource events the webhook is triggered for',
			},
		],
	};

	// @ts-ignore
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const endpoint = '/v3/rest/eventcallbackurl';
				const responseData = await mailjetApiRequest.call(this, 'GET', endpoint);

				const event = this.getNodeParameter('event') as string;
				const webhookUrl = this.getNodeWebhookUrl('default');

				for (const webhook of responseData.Data) {
					if (webhook.EventType === event && webhook.Url === webhookUrl) {
						// Set webhook-id to be sure that it can be deleted
						const webhookData = this.getWorkflowStaticData('node');
						webhookData.webhookId = webhook.ID as string;
						return true;
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const event = this.getNodeParameter('event') as string;
				const endpoint = '/v3/rest/eventcallbackurl';
				const body: IDataObject = {
					Url: webhookUrl,
					EventType: event,
					Status: 'alive',
					isBackup: 'false',
				};
				const { Data } = await mailjetApiRequest.call(this, 'POST', endpoint, body);
				webhookData.webhookId = Data[0].ID;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const endpoint = `/v3/rest/eventcallbackurl/${webhookData.webhookId}`;
				try {
					await mailjetApiRequest.call(this, 'DELETE', endpoint);
				} catch (error) {
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
			workflowData: [this.helpers.returnJsonArray(req.body)],
		};
	}
}
