import {
	type IHookFunctions,
	type IWebhookFunctions,
	type IDataObject,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookResponseData,
	type INodeTypeBaseDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { mailerliteApiRequest } from '../GenericFunctions';

export class MailerLiteTriggerV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			displayName: 'MailerLite Trigger',
			name: 'mailerLiteTrigger',
			group: ['trigger'],
			version: 1,
			description: 'Starts the workflow when MailerLite events occur',
			defaults: {
				name: 'MailerLite Trigger',
			},
			inputs: [],
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				{
					name: 'mailerLiteApi',
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
					options: [
						{
							name: 'Campaign Sent',
							value: 'campaign.sent',
							description: 'Fired when campaign is sent',
						},
						{
							name: 'Subscriber Added Through Webform',
							value: 'subscriber.added_through_webform',
							description: 'Fired when a subscriber is added though a form',
						},
						{
							name: 'Subscriber Added to Group',
							value: 'subscriber.add_to_group',
							description: 'Fired when a subscriber is added to a group',
						},
						{
							name: 'Subscriber Automation Completed',
							value: 'subscriber.automation_complete',
							description: 'Fired when subscriber finishes automation',
						},
						{
							name: 'Subscriber Automation Triggered',
							value: 'subscriber.automation_triggered',
							description: 'Fired when subscriber starts automation',
						},
						{
							name: 'Subscriber Bounced',
							value: 'subscriber.bounced',
							description: 'Fired when an email address bounces',
						},
						{
							name: 'Subscriber Complained',
							value: 'subscriber.complaint',
							description: 'Fired when subscriber marks a campaign as a spam',
						},
						{
							name: 'Subscriber Created',
							value: 'subscriber.create',
							description: 'Fired when a new subscriber is added to an account',
						},
						{
							name: 'Subscriber Removed From Group',
							value: 'subscriber.remove_from_group',
							description: 'Fired when a subscriber is removed from a group',
						},
						{
							name: 'Subscriber Unsubscribe',
							value: 'subscriber.unsubscribe',
							description: 'Fired when a subscriber becomes unsubscribed',
						},
						{
							name: 'Subscriber Updated',
							value: 'subscriber.update',
							description: "Fired when any of the subscriber's custom fields are updated",
						},
					],
					required: true,
					default: [],
					description: 'The events to listen to',
				},
			],
		};
	}

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const event = this.getNodeParameter('event') as string;
				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const endpoint = '/webhooks';
				const { webhooks } = await mailerliteApiRequest.call(this, 'GET', endpoint, {});
				for (const webhook of webhooks) {
					if (webhook.url === webhookUrl && webhook.event === event) {
						// Set webhook-id to be sure that it can be deleted
						webhookData.webhookId = webhook.id as string;
						return true;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const event = this.getNodeParameter('event') as string;

				const endpoint = '/webhooks';

				const body = {
					url: webhookUrl,
					event,
				};

				const responseData = await mailerliteApiRequest.call(this, 'POST', endpoint, body);

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
					const endpoint = `/webhooks/${webhookData.webhookId}`;

					try {
						await mailerliteApiRequest.call(this, 'DELETE', endpoint);
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

		const events = body.events as IDataObject[];

		return {
			workflowData: [this.helpers.returnJsonArray(events)],
		};
	}
}
