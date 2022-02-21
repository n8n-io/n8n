import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	getTriggerName,
	livePublicKey,
	Profile,
	testPublicKey,
	wiseApiRequest,
} from './GenericFunctions';

import {
	createVerify,
} from 'crypto';

export class WiseTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Wise Trigger',
		name: 'wiseTrigger',
		icon: 'file:wise.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Handle Wise events via webhooks',
		defaults: {
			name: 'Wise Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'wiseApi',
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
				displayName: 'Profile',
				name: 'profileId',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getProfiles',
				},
				default: '',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: '',
				options: [
					{
						name: 'Balance Credit',
						value: 'balanceCredit',
						description: 'Triggered every time a balance account is credited.',
					},
					{
						name: 'Transfer Active Case',
						value: 'transferActiveCases',
						description: `Triggered every time a transfer's list of active cases is updated.`,
					},
					{
						name: 'Transfer State Changed',
						value: 'tranferStateChange',
						description: `Triggered every time a transfer's status is updated.`,
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getProfiles(this: ILoadOptionsFunctions) {
				const profiles = await wiseApiRequest.call(this, 'GET', 'v1/profiles');
				return profiles.map(({ id, type }: Profile) => ({
					name: type.charAt(0).toUpperCase() + type.slice(1),
					value: id,
				}));
			},
		},
	};
	// @ts-ignore
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const profileId = this.getNodeParameter('profileId') as string;
				const event = this.getNodeParameter('event') as string;
				const webhooks = await wiseApiRequest.call(this, 'GET', `v3/profiles/${profileId}/subscriptions`);
				const trigger = getTriggerName(event);
				for (const webhook of webhooks) {
					if (webhook.delivery.url === webhookUrl && webhook.scope.id === profileId && webhook.trigger_on === trigger) {
						webhookData.webhookId = webhook.id;
						return true;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const profileId = this.getNodeParameter('profileId') as string;
				const event = this.getNodeParameter('event') as string;
				const trigger = getTriggerName(event);
				const body: IDataObject = {
					name: `n8n Webhook`,
					trigger_on: trigger,
					delivery: {
						version: '2.0.0',
						url: webhookUrl,
					},
				};
				const webhook = await wiseApiRequest.call(this, 'POST', `v3/profiles/${profileId}/subscriptions`, body);
				webhookData.webhookId = webhook.id;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const profileId = this.getNodeParameter('profileId') as string;
				try {
					await wiseApiRequest.call(this, 'DELETE', `v3/profiles/${profileId}/subscriptions/${webhookData.webhookId}`);
				} catch (error) {
					return false;
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const headers = this.getHeaderData() as IDataObject;
		const credentials = await this.getCredentials('wiseApi') as IDataObject;

		if (headers['x-test-notification'] === 'true') {
			const res = this.getResponseObject();
			res.status(200).end();
			return {
				noWebhookResponse: true,
			};
		}

		const signature = headers['x-signature'] as string;

		const publicKey = (credentials.environment === 'test') ? testPublicKey : livePublicKey as string;

		//@ts-ignore
		const sig = createVerify('RSA-SHA1').update(req.rawBody);
		const verified = sig.verify(
			publicKey,
			signature,
			'base64',
		);

		if (verified === false) {
			return {};
		}

		return {
			workflowData: [
				this.helpers.returnJsonArray(req.body),
			],
		};
	}
}