import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	INodeTypeDescription,
	INodeType,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	postmarkApiRequest,
} from './GenericFunctions';

export class PostmarkTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Postmark Trigger',
		name: 'postmarkTrigger',
		icon: 'file:postmark.png',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Postmark events occur.',
		defaults: {
			name: 'Postmark Trigger',
			color: '#fedd00',
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
				displayName: 'Open',
				name: 'open',
				type: 'boolean',
				default: false,
				description: 'Listing for if the Open webhook is enabled/disabled.',
			},
			{
				displayName: 'First Open Only',
				name: 'postFirstOpenOnly',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						open: [
							true
						],
					},
				},
				description: 'Webhook will only post on first open if enabled.',
			},
			{
				displayName: 'Click',
				name: 'click',
				type: 'boolean',
				default: false,
				description: 'Listing for if the Click webhook is enabled/disabled.',
			},
			{
				displayName: 'Delivery',
				name: 'delivery',
				type: 'boolean',
				default: false,
				description: 'Listing for if the Delivery webhook is enabled/disabled.',
			},
			{
				displayName: 'Bounce',
				name: 'bounce',
				type: 'boolean',
				default: false,
				description: 'Listing for if the Bounce webhook is enabled/disabled.',
			},
			{
				displayName: 'Bounce Include Content',
				name: 'bounceIncludeContent',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						bounce: [
							true
						],
					},
				},
				description: 'Webhook will send full bounce content if IncludeContent is enabled.',
			},
			{
				displayName: 'Spam Complaint',
				name: 'spamComplaint',
				type: 'boolean',
				default: false,
				description: 'Listing for if the Spam webhook is enabled/disabled.',
			},
			{
				displayName: 'Spam Complaint Include Content',
				name: 'spamComplaintIncludeContent',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						spamComplaint: [
							true
						],
					},
				},
				description: 'Webhook will send full spam content if IncludeContent is enabled.',
			},
			{
				displayName: 'Subscription Change',
				name: 'subscriptionChange',
				type: 'boolean',
				default: false,
				description: 'Listing for if the Subscription Change webhook is enabled/disabled.',
			},
		],

	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId === undefined) {
					// No webhook id is set so no webhook can exist
					return false;
				}

				// Webhook got created before so check if it still exists
				const endpoint = `/webhooks/${webhookData.webhookId}`;

				const responseData = await postmarkApiRequest.call(this, 'GET', endpoint, {});

				if (responseData.ID === undefined) {
					return false;
				}
				else if (responseData.ID === webhookData.id) {
					return true;
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				const endpoint = `/webhooks`;

				// tslint:disable-next-line: no-any
				const body : any = {
					Url: webhookUrl,
					Triggers: {
						Open:{
							Enabled: false,
							PostFirstOpenOnly: false
						},
						Click:{
							Enabled: false
						},
						Delivery:{
							Enabled: false
						},
						Bounce:{
							Enabled: false,
							IncludeContent: false
						},
						SpamComplaint:{
							Enabled: false,
							IncludeContent: false
						},
						SubscriptionChange: {
							Enabled: false
						}
					}
				};

				const open = this.getNodeParameter('open', 0);
				const postFirstOpenOnly = this.getNodeParameter('postFirstOpenOnly', 0);
				const click = this.getNodeParameter('click', 0);
				const delivery = this.getNodeParameter('delivery', 0);
				const bounce = this.getNodeParameter('bounce', 0);
				const bounceIncludeContent = this.getNodeParameter('bounceIncludeContent', 0);
				const spamComplaint = this.getNodeParameter('spamComplaint', 0);
				const spamComplaintIncludeContent = this.getNodeParameter('spamComplaintIncludeContent', 0);
				const subscriptionChange = this.getNodeParameter('subscriptionChange', 0);

				if (open) {
					body.Triggers.Open.Enabled = true;

					if (postFirstOpenOnly) {
						body.Triggers.Open.PostFirstOpenOnly = true;
					}
				}
				if (click) {
					body.Triggers.Click.Enabled = true;
				}
				if (delivery) {
					body.Triggers.Delivery.Enabled = true;
				}
				if (bounce) {
					body.Triggers.Bounce.Enabled = true;

					if (bounceIncludeContent) {
						body.Triggers.Bounce.IncludeContent = true;
					}
				}
				if (spamComplaint) {
					body.Triggers.SpamComplaint.Enabled = true;

					if (spamComplaintIncludeContent) {
						body.Triggers.SpamComplaint.IncludeContent = true;
					}
				}
				if (subscriptionChange) {
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
					} catch (e) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registred anymore
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
			workflowData: [
				this.helpers.returnJsonArray(req.body)
			],
		};
	}
}
