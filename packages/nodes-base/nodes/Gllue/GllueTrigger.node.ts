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


export class GllueTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gllue Trigger',
		name: 'gllueTrigger',
		icon: 'file:gllue.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Handle Autofriend 123 a new version events via webhooks',
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
					name: 'Contact Added',
					value: 'contactAdded',
				},
				{
					name: 'Contact Added To List',
					value: 'contactAddedToList',
				},
				{
					name: 'Contact Entered Segment',
					value: 'contactEnteredSegment',
				},
				{
					name: 'Contact Left Segment',
					value: 'contactLeftSegment',
				},
				{
					name: 'Contact Removed From List',
					value: 'contactRemovedFromList',
				},
				{
					name: 'Contact Unsubscribed',
					value: 'contactUnsubscribed',
				},
				{
					name: 'Contact Updated',
					value: 'contactUpdated',
				},
			],
		},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		return {
			workflowData: [],
		};
	}
}
