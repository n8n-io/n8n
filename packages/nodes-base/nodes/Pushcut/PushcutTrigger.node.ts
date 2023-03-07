import type { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import type { INodeType, INodeTypeDescription, IWebhookResponseData } from 'n8n-workflow';

import { pushcutApiRequest } from './GenericFunctions';

export class PushcutTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Pushcut Trigger',
		name: 'pushcutTrigger',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:pushcut.png',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Pushcut events occur',
		defaults: {
			name: 'Pushcut Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'pushcutApi',
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
				displayName: 'Action Name',
				name: 'actionName',
				type: 'string',
				description:
					'Choose any name you would like. It will show up as a server action in the app.',
				default: '',
			},
		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const actionName = this.getNodeParameter('actionName');
				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const endpoint = '/subscriptions';
				const webhooks = await pushcutApiRequest.call(this, 'GET', endpoint, {});

				for (const webhook of webhooks) {
					if (webhook.url === webhookUrl && webhook.actionName === actionName) {
						webhookData.webhookId = webhook.id;
						return true;
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const actionName = this.getNodeParameter('actionName');

				const endpoint = '/subscriptions';

				const body = {
					actionName,
					url: webhookUrl,
				};

				const responseData = await pushcutApiRequest.call(this, 'POST', endpoint, body);

				if (responseData.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				webhookData.webhookId = responseData.id as string;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId !== undefined) {
					const endpoint = `/subscriptions/${webhookData.webhookId}`;

					try {
						await pushcutApiRequest.call(this, 'DELETE', endpoint);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registered anymore
					delete webhookData.webhookId;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData();

		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}
