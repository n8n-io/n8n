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

/*
import {
	autofriendApiRequest,
} from './GenericFunctions';

import {
	snakeCase,
} from 'change-case';
*/


export class WikiItemCreatedTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WikiItemCreated Trigger',
		name: 'wikiItemCreatedTrigger',
		icon: 'file:wiki.png',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Handle events when a Wikibase item is created via webhooks',
		defaults: {
			name: 'WikiItemCreated Trigger',
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
				isFullPath: true,
				path: 'wikiItemCreated'
			},
		],
		properties: [],
	};

	// @ts-ignore
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const options = this.getNodeParameter('options', {}) as IDataObject;
		const req = this.getRequestObject();
		const resp = this.getResponseObject();
		const headers = this.getHeaderData();
		const realm = 'Webhook';
	}
}
