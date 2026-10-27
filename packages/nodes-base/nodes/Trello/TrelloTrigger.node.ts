import {
	type IHookFunctions,
	type IWebhookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookResponseData,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { apiRequest } from './GenericFunctions';
import { verifySignature } from './TrelloTriggerHelpers';

export class TrelloTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Trello Trigger',
		name: 'trelloTrigger',
		icon: 'file:trello.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Trello events occur',
		defaults: {
			name: 'Trello Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'trelloApi',
				required: true,
				displayOptions: { show: { authentication: ['apiKey'] } },
			},
			{
				name: 'trelloOAuth1Api',
				required: true,
				displayOptions: { show: { authentication: ['oAuth1'] } },
			},
		],
		webhooks: [
			{
				name: 'setup',
				httpMethod: 'HEAD',
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
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{ name: 'API Key', value: 'apiKey' },
					{ name: 'OAuth1', value: 'oAuth1' },
				],
				default: 'apiKey',
			},
			{
				displayName: 'Model ID',
				name: 'id',
				type: 'string',
				default: '',
				placeholder: '4d5ea62fd76aa1136000000c',
				required: true,
				description: 'ID of the model of which to subscribe to events',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const authentication = this.getNodeParameter('authentication', 'apiKey') as
					| 'apiKey'
					| 'oAuth1';
				const idModel = this.getNodeParameter('id') as string;
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');

				if (authentication === 'oAuth1') {
					// OAuth1 has no apiToken to list webhooks against; rely on the stored
					// webhookId from the previous activation.
					if (!webhookData.webhookId) {
						return false;
					}
					try {
						const webhook = await apiRequest.call(
							this,
							'GET',
							`webhooks/${webhookData.webhookId}`,
							{},
						);

						if (webhook.idModel === idModel && webhook.callbackURL === webhookUrl) {
							return true;
						}

						// The stored webhook no longer matches the current configuration, so
						// remove the stale registration and report it as missing to trigger
						// a fresh creation.
						await apiRequest.call(this, 'DELETE', `webhooks/${webhookData.webhookId}`, {});
						delete webhookData.webhookId;
						return false;
					} catch (error) {
						delete webhookData.webhookId;
						return false;
					}
				}

				const credentials = await this.getCredentials('trelloApi');

				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const endpoint = `tokens/${credentials.apiToken}/webhooks`;

				const responseData = await apiRequest.call(this, 'GET', endpoint, {});

				for (const webhook of responseData) {
					if (webhook.idModel === idModel && webhook.callbackURL === webhookUrl) {
						// Set webhook-id to be sure that it can be deleted
						webhookData.webhookId = webhook.id as string;
						return true;
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const authentication = this.getNodeParameter('authentication', 'apiKey') as
					| 'apiKey'
					| 'oAuth1';
				const webhookUrl = this.getNodeWebhookUrl('default');
				const idModel = this.getNodeParameter('id') as string;

				const body = {
					description: `n8n Webhook - ${idModel}`,
					callbackURL: webhookUrl,
					idModel,
				};

				let endpoint: string;
				if (authentication === 'oAuth1') {
					endpoint = 'webhooks';
				} else {
					const credentials = await this.getCredentials('trelloApi');
					endpoint = `tokens/${credentials.apiToken}/webhooks`;
				}

				const responseData = await apiRequest.call(this, 'POST', endpoint, body);

				if (responseData.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = responseData.id as string;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					const authentication = this.getNodeParameter('authentication', 'apiKey') as
						| 'apiKey'
						| 'oAuth1';

					let endpoint: string;
					if (authentication === 'oAuth1') {
						endpoint = `webhooks/${webhookData.webhookId}`;
					} else {
						const credentials = await this.getCredentials('trelloApi');
						endpoint = `tokens/${credentials.apiToken}/webhooks/${webhookData.webhookId}`;
					}

					try {
						await apiRequest.call(this, 'DELETE', endpoint, {});
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
		const webhookName = this.getWebhookName();

		if (webhookName === 'setup') {
			// Is a create webhook confirmation request
			const res = this.getResponseObject();
			res.status(200).end();
			return {
				noWebhookResponse: true,
			};
		}

		const isSignatureValid = await verifySignature.call(this);
		if (!isSignatureValid) {
			const res = this.getResponseObject();
			res.status(401).send('Unauthorized').end();
			return {
				noWebhookResponse: true,
			};
		}

		const bodyData = this.getBodyData();

		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
