import { createHmac } from 'crypto';
import {
	IDataObject,
	IHookFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	NodeApiError,
} from 'n8n-workflow';

import { apiRequest } from './transport';

export class MailerSendTriggerV1 implements INodeType {

	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...this.versionDescription,
		};
	}

	versionDescription: INodeTypeDescription = {
		displayName: 'MailerSend Trigger',
		name: 'mailerSendTrigger',
		icon: 'file:mailerSend.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when MailerSend events occur',
		defaults: {
			name: 'MailerSend Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'mailerSendApi',
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
				displayName: 'Domain',
				name: 'domainId',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getDomains',
				},
				default: '',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				description: 'Webhook name',
				required: true,
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: 'Email is sent',
						value: 'activity.sent',
						description: `Fired when email is sent.`,
					},
					{
						name: 'Email is delivered',
						value: 'activity.delivered',
						description: `Fired when email is successfully delivered.`,
					},
					{
						name: 'Recipient Soft Bounced',
						value: 'activity.soft_bounced',
						description: `Fired when email is not delivered because it soft bounced.`,
					},
					{
						name: 'Recipient Hard Bounced',
						value: 'activity.hard_bounced',
						description: `Fired when email is not delivered.`,
					},
					{
						name: 'Email Opened ',
						value: 'activity.opened',
						description: `Fired when recipient opens an email.`,
					},
					{
						name: 'Recipient Clicked',
						value: 'activity.clicked',
						description: `Fired when recipient clicks a link in the email.`,
					},
					{
						name: 'Recipient Unsubscribed',
						value: 'activity.unsubscribed',
						description: 'Fired when recipient unsubscribes.',
					},
					{
						name: 'Recipient Complained',
						value: 'activity.spam_complaint',
						description: `Fired when recipient marks email as a spam or junk.`,
					},
				],
				required: true,
				default: [],
				description: 'The event(s) to listen to.',
			},
		],
	};

	methods = {
		loadOptions: {
			async getDomains(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const response = await apiRequest.call(this, 'GET', 'domains', {});
				const { data: domains } = response;
				for (const domain of domains) {
					returnData.push({
						value: domain.id,
						name: domain.name,
					});
				}
				return returnData;
			},
		},
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

				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const endpoint = `webhooks/${webhookData.webhookId}`;

				try {
					await apiRequest.call(this, 'GET', endpoint, {});
				} catch (error) {
					if (error instanceof NodeApiError) {
						if (error.httpCode === '404') {
							// Webhook does not exist
							delete webhookData.webhookId;
							delete webhookData.webhookEvents;
							delete webhookData.webhookSecret;

							return false;
						}
					}
					// Some error occured
					throw error;
				}

				// If it did not error then the webhook exists
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const name = this.getNodeParameter('name') as string;
				const events = this.getNodeParameter('events', []);
				const domainId = this.getNodeParameter('domainId') as string;

				const endpoint = 'webhooks';

				const body = {
					name,
					url: webhookUrl,
					events,
					domain_id: domainId,
					enabled: true,
				};

				let responseData;
				try {
					responseData = await apiRequest.call(this, 'POST', endpoint, body);
				} catch (error) {
					throw error;
				}

				const webhook = responseData.data;
				if (webhook.id === undefined) {
					// Required data is missing so was not successful
					throw new NodeApiError(this.getNode(), responseData, { message: 'MailerSend webhook creation response did not contain the expected data.' });
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = webhook.id as string;
				webhookData.webhookEvents = webhook.events as string[];
				// TODO When there's a way to obtain the secret from the
				// API hopefully at creation time, remove the next line
				// and uncomment the following and update accordingly
				// Test the verification at the webhook method (check 'Note 2')
				webhookData.webhookSecret = '';
				// webhookData.webhookSecret = responseData.secret as string;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId !== undefined) {
					const endpoint = `webhooks/${webhookData.webhookId}`;

					try {
						await apiRequest.call(this, 'DELETE', endpoint);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registered anymore
					delete webhookData.webhookId;
					delete webhookData.webhookEvents;
					delete webhookData.webhookSecret;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData() as IDataObject;
		const headerData = this.getHeaderData() as IDataObject;
		const req = this.getRequestObject();

		const webhookData = this.getWorkflowStaticData('node');
		const events = webhookData.webhookEvents as string[];

		const eventType = bodyData.type as string | undefined;
		// Note 2: This is not verified (check 'Note 1')
		if (webhookData.webhookSecret !== '') {
			// @ts-ignore
			const computedSignature = createHmac('sha256', webhookData.webhookSecret).update(req.rawBody).digest('hex');
			if (headerData['signature'] !== computedSignature) {
				console.error('Sorry signatures don\'t match');
				console.log(`Header signature: ${headerData['signature']}`);
				console.log(`ComputedSignature: ${computedSignature}`);
				return {};
			}
		}

		if (eventType === undefined || !events.includes(eventType)) {
			// If not eventType is defined or when one is defined but we are not
			// listening to it do not start the workflow.
			return {};
		}

		return {
			workflowData: [
				this.helpers.returnJsonArray(req.body),
			],
		};
	}
}
