import { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import { IDataObject, INodeType, INodeTypeDescription, IWebhookResponseData } from 'n8n-workflow';

// import { foxyApiRequest } from './GenericFunctions';

import { snakeCase } from 'change-case';

export class FoxyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Foxy Trigger',
		name: 'foxyTrigger',
		icon: 'file:foxyLogo.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Handle Foxy events via webhooks',
		defaults: {
			name: 'Foxy Trigger',
			color: '#6ad7b9',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [],
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
				default: '',
				options: [
					{
						name: 'Transaction Refeed',
						value: 'transaction/refeed',
					},
				],
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		return {
			workflowData: [this.helpers.returnJsonArray(req.body)],
		};
	}
}
