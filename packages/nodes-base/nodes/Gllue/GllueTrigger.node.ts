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

export class GllueTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gllue Trigger',
		name: 'gllueTrigger',
		icon: 'file:gllue.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Handle Gllue events via webhooks',
		defaults: {
			name: 'Gllue Trigger',
			color: '#6ad7b9',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'gllueApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'gllue',
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
					name: 'Candidate Added/Updated',
					value: 'candidateAddedOrUpdated',
				},
			],
		},
		],
	};

	// @ts-ignore
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
		const req = this.getRequestObject();
		return {
			workflowData: [
				this.helpers.returnJsonArray(req.body),
			],
		};

	}
}
