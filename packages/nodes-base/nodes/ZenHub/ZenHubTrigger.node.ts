import {
	IWebhookFunctions
} from "n8n-core";

import {
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData
} from "n8n-workflow";

export class ZenHubTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ZenHub Trigger',
		name: 'zenHubTrigger',
		icon: 'file:zenHub.svg',
		group: ['trigger'],
		version: 1,
		subtitle: 'ZenHub',
		description: 'Some description',
		defaults: {
			name: 'ZenHub Trigger',
			color: '#5d60ba',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'zenHubApi',
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
		properties: [],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const request = this.getRequestObject();
		return {
			workflowData: [
				this.helpers.returnJsonArray(request.body),
			],
		};
  }
}
