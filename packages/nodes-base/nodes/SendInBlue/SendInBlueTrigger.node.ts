/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type {
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { SendInBlueWebhookApi } from './GenericFunctions';

export class SendInBlueTrigger implements INodeType {
	description: INodeTypeDescription = {
		credentials: [
			{
				name: 'sendInBlueApi',
				required: true,
			},
		],
		displayName: 'SendInBlue Trigger',
		defaults: {
			name: 'SendInBlue Trigger',
		},
		description: 'Starts the workflow when SendInBlue events occur',
		group: ['trigger'],
		icon: 'file:sendinblue.svg',
		inputs: [],
		name: 'sendInBlueTrigger',
		outputs: ['main'],
		version: 1,
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhooks',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				default: 'transactional',
				name: 'type',
				options: [
					{ name: 'Inbound', value: 'inbound' },
					{ name: 'Marketing', value: 'marketing' },
					{ name: 'Transactional', value: 'transactional' },
				],
				required: true,
				type: 'options',
			},
			{
				displayName: 'Trigger On',
				displayOptions: {
					show: {
						type: ['transactional'],
					},
				},
				name: 'events',
				placeholder: 'Add Event',
				options: [
					{
						name: 'Email Blocked',
						value: 'blocked',
						description: 'Triggers when transactional email is blocked',
					},
					{
						name: 'Email Clicked',
						value: 'click',
						description: 'Triggers when transactional email is clicked',
					},
					{
						name: 'Email Deferred',
						value: 'deferred',
						description: 'Triggers when transactional email is deferred',
					},
					{
						name: 'Email Delivered',
						value: 'delivered',
						description: 'Triggers when transactional email is delivered',
					},
					{
						name: 'Email Hard Bounce',
						value: 'hardBounce',
						description: 'Triggers when transactional email is hard bounced',
					},
					{
						name: 'Email Invalid',
						value: 'invalid',
						description: 'Triggers when transactional email is invalid',
					},
					{
						name: 'Email Marked Spam',
						value: 'spam',
						description: 'Triggers when transactional email is set to spam',
					},
					{
						name: 'Email Opened',
						value: 'opened',
						description: 'Triggers when transactional email is opened',
					},
					{
						name: 'Email Sent',
						value: 'request',
						description: 'Triggers when transactional email is sent',
					},
					{
						name: 'Email Soft-Bounce',
						value: 'softBounce',
						description: 'Triggers when transactional email is soft bounced',
					},
					{
						name: 'Email Unique Open',
						value: 'uniqueOpened',
						description: 'Triggers when transactional email is unique opened',
					},
					{
						name: 'Email Unsubscribed',
						value: 'unsubscribed',
						description: 'Triggers when transactional email is unsubscribed',
					},
				],
				default: [],
				required: true,
				type: 'multiOptions',
			},
			{
				displayName: 'Trigger On',
				displayOptions: {
					show: {
						type: ['marketing'],
					},
				},
				name: 'events',
				placeholder: 'Add Event',
				options: [
					{
						name: 'Marketing Email Clicked',
						value: 'click',
						description: 'Triggers when marketing email is clicked',
					},
					{
						name: 'Marketing Email Delivered',
						value: 'delivered',
						description: 'Triggers when marketing email is delivered',
					},
					{
						name: 'Marketing Email Hard Bounce',
						value: 'hardBounce',
						description: 'Triggers when marketing email is hard bounced',
					},
					{
						name: 'Marketing Email List Addition',
						value: 'listAddition',
						description: 'Triggers when marketing email is clicked',
					},
					{
						name: 'Marketing Email Opened',
						value: 'opened',
						description: 'Triggers when marketing email is opened',
					},
					{
						name: 'Marketing Email Soft Bounce',
						value: 'softBounce',
						description: 'Triggers when marketing email is soft bounced',
					},
					{
						name: 'Marketing Email Spam',
						value: 'spam',
						description: 'Triggers when marketing email is spam',
					},
					{
						name: 'Marketing Email Unsubscribed',
						value: 'unsubscribed',
						description: 'Triggers when marketing email is unsubscribed',
					},
				],
				default: [],
				required: true,
				type: 'multiOptions',
			},
			{
				displayName: 'Trigger On',
				displayOptions: {
					show: {
						type: ['inbound'],
					},
				},
				name: 'events',
				placeholder: 'Add Event',
				options: [
					{
						name: 'Inbound Email Processed',
						value: 'inboundEmailProcessed',
						description: 'Triggers when inbound email is processed',
					},
				],
				default: [],
				required: true,
				type: 'multiOptions',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				const type = this.getNodeParameter('type') as string;

				const events = this.getNodeParameter('events') as string[];

				try {
					const { webhooks } = await SendInBlueWebhookApi.fetchWebhooks(this, type);

					for (const webhook of webhooks) {
						if (
							webhook.type === type &&
							webhook.events.every((event) => events.includes(event)) &&
							webhookUrl === webhook.url
						) {
							webhookData.webhookId = webhook.id;
							return true;
						}
					}
					// If it did not error then the webhook exists
					return false;
				} catch (err) {
					return false;
				}
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				const type = this.getNodeParameter('type') as string;

				const events = this.getNodeParameter('events') as string[];

				const responseData = await SendInBlueWebhookApi.createWebHook(
					this,
					type,
					events,
					webhookUrl,
				);

				if (responseData === undefined || responseData.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				webhookData.webhookId = responseData.id;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					try {
						await SendInBlueWebhookApi.deleteWebhook(this, webhookData.webhookId as string);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registered anymore
					delete webhookData.webhookId;
					delete webhookData.webhookEvents;
					delete webhookData.hookSecret;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// The data to return and so start the workflow with
		const bodyData = this.getBodyData();

		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
