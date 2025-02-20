import { createHmac } from 'crypto';
import {
	NodeOperationError,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	NodeConnectionType,
	type INodeProperties,
} from 'n8n-workflow';

import {
	appWebhookSubscriptionCreate,
	appWebhookSubscriptionDelete,
	appWebhookSubscriptionList,
} from './GenericFunctions';
import type { WhatsAppPageEvent } from './types';

const whatsappTriggerDescription: INodeProperties[] = [
	{
		displayName: 'Trigger On',
		name: 'updates',
		type: 'multiOptions',
		required: true,
		default: [],
		options: [
			{
				name: 'Account Review Update',
				value: 'account_review_update',
			},
			{
				name: 'Account Update',
				value: 'account_update',
			},
			{
				name: 'Business Capability Update',
				value: 'business_capability_update',
			},
			{
				name: 'Message Template Quality Update',
				value: 'message_template_quality_update',
			},
			{
				name: 'Message Template Status Update',
				value: 'message_template_status_update',
			},
			{
				name: 'Messages',
				value: 'messages',
			},
			{
				name: 'Phone Number Name Update',
				value: 'phone_number_name_update',
			},
			{
				name: 'Phone Number Quality Update',
				value: 'phone_number_quality_update',
			},
			{
				name: 'Security',
				value: 'security',
			},
			{
				name: 'Template Category Update',
				value: 'template_category_update',
			},
		],
	},
];

export class WhatsAppTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WhatsApp Trigger',
		name: 'whatsAppTrigger',
		icon: 'file:whatsapp.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Handle WhatsApp events via webhooks',
		defaults: {
			name: 'WhatsApp Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'whatsAppTriggerApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'setup',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: 'webhook',
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'Due to Facebook API limitations, you can use just one WhatsApp trigger for each Facebook App',
				name: 'whatsAppNotice',
				type: 'notice',
				default: '',
			},
			...whatsappTriggerDescription,
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const credentials = await this.getCredentials('whatsAppTriggerApi');
				const updates = this.getNodeParameter('updates', []) as IDataObject[];
				const subscribedEvents = updates.sort().join(',');
				const appId = credentials.clientId as string;

				const webhooks = await appWebhookSubscriptionList.call(this, appId);

				const subscription = webhooks.find(
					(webhook) =>
						webhook.object === 'whatsapp_business_account' &&
						webhook.fields
							.map((x) => x.name)
							.sort()
							.join(',') === subscribedEvents &&
						webhook.active,
				);

				if (!subscription) {
					return false;
				}

				if (subscription.callback_url !== webhookUrl) {
					throw new NodeOperationError(
						this.getNode(),
						`The WhatsApp App ID ${appId} already has a webhook subscription. Delete it or use another App before executing the trigger. Due to WhatsApp API limitations, you can have just one trigger per App.`,
						{ level: 'warning' },
					);
				}

				if (
					subscription?.fields
						.map((x) => x.name)
						.sort()
						.join(',') !== subscribedEvents
				) {
					await appWebhookSubscriptionDelete.call(this, appId, 'whatsapp_business_account');
					return false;
				}

				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const credentials = await this.getCredentials('whatsAppTriggerApi');
				const appId = credentials.clientId as string;
				const updates = this.getNodeParameter('updates', []) as IDataObject[];
				const verifyToken = this.getNode().id;

				await appWebhookSubscriptionCreate.call(this, appId, {
					object: 'whatsapp_business_account',
					callback_url: webhookUrl,
					verify_token: verifyToken,
					fields: JSON.stringify(updates),
					include_values: true,
				});

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials('whatsAppTriggerApi');
				const appId = credentials.clientId as string;

				await appWebhookSubscriptionDelete.call(this, appId, 'whatsapp_business_account');

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData() as unknown as WhatsAppPageEvent;
		const query = this.getQueryData() as IDataObject;
		const res = this.getResponseObject();
		const req = this.getRequestObject();
		const headerData = this.getHeaderData() as IDataObject;
		const credentials = await this.getCredentials('whatsAppTriggerApi');

		// Check if we're getting facebook's challenge request (https://developers.facebook.com/docs/graph-api/webhooks/getting-started)
		if (this.getWebhookName() === 'setup') {
			if (query['hub.challenge']) {
				if (this.getNode().id !== query['hub.verify_token']) {
					return {};
				}

				res.status(200).send(query['hub.challenge']).end();

				return { noWebhookResponse: true };
			}
		}

		const computedSignature = createHmac('sha256', credentials.clientSecret as string)
			.update(req.rawBody)
			.digest('hex');
		if (headerData['x-hub-signature-256'] !== `sha256=${computedSignature}`) {
			return {};
		}

		if (bodyData.object !== 'whatsapp_business_account') {
			return {};
		}

		const events = await Promise.all(
			bodyData.entry
				.map((entry) => entry.changes)
				.flat()
				.map((change) => ({ ...change.value, field: change.field })),
		);

		if (events.length === 0) {
			return {};
		}

		return {
			workflowData: [this.helpers.returnJsonArray(events)],
		};
	}
}
