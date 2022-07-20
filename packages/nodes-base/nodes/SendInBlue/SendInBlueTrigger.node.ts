import {
	IDataObject,
	INodeTypeDescription,
	INodeType,
	IWebhookResponseData,
	IHookFunctions,
	IWebhookFunctions,
	NodeOperationError,
} from 'n8n-workflow';
import { sendInBlueWebhookApi } from './GenericFunctions';

export class SendInBlueTrigger implements INodeType {
	description: INodeTypeDescription = {
		credentials: [
			{
				name: 'sendinblueApi',
				required: true,
			},
		],
		displayName: 'SendInBlue Trigger',
		defaults: {
			name: 'SendInBlue-Trigger',
			color: '#044a75',
		},
		description: 'Starts the workflow when SendInBlue events occur',
		group: ['trigger'],
		icon: 'file:sendinblue.svg',
		inputs: [],
		name: 'sendinblueTrigger',
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
				default: 'transactional',
				displayName: 'Webhook Type',
				name: 'type',
				options: [{ name: 'Transactional', value: 'transactional' }],
				required: true,
				type: 'options',
			},
			{
				default: [],
				displayName: 'Webhook Events',
				name: 'events',
				placeholder: 'Add Event',
				options: [
					{
						name: 'Blocked',
						value: 'blocked',
					},
					{
						name: 'Click',
						value: 'click',
					},
					{
						name: 'Deferred',
						value: 'deferred',
					},
					{
						name: 'Delivered',
						value: 'delivered',
					},
					{
						name: 'Hard Bounce',
						value: 'hardBounce',
					},
					{
						name: 'Invalid',
						value: 'invalid',
					},
					{
						name: 'Opened',
						value: 'opened',
					},
					{
						name: 'Request',
						value: 'request',
					},
					{
						name: 'Sent',
						value: 'sent',
					},
					{
						name: 'Soft Bounce',
						value: 'softBounce',
					},
					{
						name: 'Spam',
						value: 'spam',
					},
					{
						name: 'Unique Opened',
						value: 'uniqueOpened',
					},
					{
						name: 'Unsubscribed',
						value: 'unsubscribed',
					},
				],
				required: true,
				type: 'multiOptions',
			},
		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				const type = this.getNodeParameter('type') as string;

				const events = this.getNodeParameter('events') as string[];

				try {
					const { webhooks } = await sendInBlueWebhookApi.fetchWebhooks(this, type);

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

				if (webhookUrl.includes('%20')) {
					throw new NodeOperationError(
						this.getNode(),
						'The name of the Asana Trigger Node is not allowed to contain any spaces!',
					);
				}

				let responseData;

				responseData = await sendInBlueWebhookApi.createWebHook(this, type, events, webhookUrl);

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
						await sendInBlueWebhookApi.deleteWebhook(this, webhookData.webhookId as string);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registred anymore
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
		const bodyData = this.getBodyData() as IDataObject;
		const headerData = this.getHeaderData() as IDataObject;
		const req = this.getRequestObject();

		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
