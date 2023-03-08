import type { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	convertTriggerObjectToStringArray,
	eventExists,
	postmarkApiRequest,
} from './GenericFunctions';

export class PostmarkTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Postmark Trigger',
		name: 'postmarkTrigger',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:postmark.png',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Postmark events occur',
		defaults: {
			name: 'Postmark Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'postmarkApi',
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
						name: 'Bounce',
						value: 'bounce',
						description: 'Trigger on bounce',
					},
					{
						name: 'Click',
						value: 'click',
						description: 'Trigger on click',
					},
					{
						name: 'Delivery',
						value: 'delivery',
						description: 'Trigger on delivery',
					},
					{
						name: 'Open',
						value: 'open',
						description: 'Trigger webhook on open',
					},
					{
						name: 'Spam Complaint',
						value: 'spamComplaint',
						description: 'Trigger on spam complaint',
					},
					{
						name: 'Subscription Change',
						value: 'subscriptionChange',
						description: 'Trigger on subscription change',
					},
				],
				default: [],
				required: true,
				description: 'Webhook events that will be enabled for that endpoint',
			},
			{
				displayName: 'First Open',
				name: 'firstOpen',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'Only fires on first open for event "Open"',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						events: ['open'],
					},
				},
			},
			{
				displayName: 'Include Content',
				name: 'includeContent',
				description: 'Whether to include message content for events "Bounce" and "Spam Complaint"',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						events: ['bounce', 'spamComplaint'],
					},
				},
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string[];

				if (events.includes('bounce') || events.includes('spamComplaint')) {
					if (this.getNodeParameter('includeContent') as boolean) {
						events.push('includeContent');
					}
				}

				if (events.includes('open')) {
					if (this.getNodeParameter('firstOpen') as boolean) {
						events.push('firstOpen');
					}
				}

				// Get all webhooks
				const endpoint = '/webhooks';

				const responseData = await postmarkApiRequest.call(this, 'GET', endpoint, {});

				// No webhooks exist
				if (responseData.Webhooks.length === 0) {
					return false;
				}

				// If webhooks exist, check if any match current settings
				for (const webhook of responseData.Webhooks) {
					if (
						webhook.Url === webhookUrl &&
						eventExists(events, convertTriggerObjectToStringArray(webhook))
					) {
						webhookData.webhookId = webhook.ID;
						// webhook identical to current settings. re-assign webhook id to found webhook.
						return true;
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				const endpoint = '/webhooks';

				const body: any = {
					Url: webhookUrl,
					Triggers: {
						Open: {
							Enabled: false,
							PostFirstOpenOnly: false,
						},
						Click: {
							Enabled: false,
						},
						Delivery: {
							Enabled: false,
						},
						Bounce: {
							Enabled: false,
							IncludeContent: false,
						},
						SpamComplaint: {
							Enabled: false,
							IncludeContent: false,
						},
						SubscriptionChange: {
							Enabled: false,
						},
					},
				};

				const events = this.getNodeParameter('events') as string[];

				if (events.includes('open')) {
					body.Triggers.Open.Enabled = true;
					body.Triggers.Open.PostFirstOpenOnly = this.getNodeParameter('firstOpen') as boolean;
				}
				if (events.includes('click')) {
					body.Triggers.Click.Enabled = true;
				}
				if (events.includes('delivery')) {
					body.Triggers.Delivery.Enabled = true;
				}
				if (events.includes('bounce')) {
					body.Triggers.Bounce.Enabled = true;
					body.Triggers.Bounce.IncludeContent = this.getNodeParameter('includeContent') as boolean;
				}
				if (events.includes('spamComplaint')) {
					body.Triggers.SpamComplaint.Enabled = true;
					body.Triggers.SpamComplaint.IncludeContent = this.getNodeParameter(
						'includeContent',
					) as boolean;
				}
				if (events.includes('subscriptionChange')) {
					body.Triggers.SubscriptionChange.Enabled = true;
				}

				const responseData = await postmarkApiRequest.call(this, 'POST', endpoint, body);

				if (responseData.ID === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = responseData.ID as string;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					const endpoint = `/webhooks/${webhookData.webhookId}`;
					const body = {};

					try {
						await postmarkApiRequest.call(this, 'DELETE', endpoint, body);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registered anymore
					delete webhookData.webhookId;
					delete webhookData.webhookEvents;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		return {
			workflowData: [this.helpers.returnJsonArray(req.body as IDataObject[])],
		};
	}
}
