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


export class AutofriendTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sendinblue',
		name: 'sendinblue',
		icon: 'file:sendinblue.svg',
		group: [ 'transform' ],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Sendinblue API',
		credentials: [
			{
				name: 'sendinblueApi',
				required: true,
			},
		],
		defaults: {
			name: 'Sendinblue',
			color: '#044a75',
		},
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
		requestDefaults: {
			baseURL: '={{$credentials.domain}}',
			url: '',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
		},
		inputs: [],
		outputs: [ 'main' ]
	};
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		return {
			workflowData: [],
		};
	}
}
