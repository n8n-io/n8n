import {
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { createHmac } from 'crypto';

import { apiRequest } from './GenericFunctions';

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
				const credentials = await this.getCredentials('trelloApi');

				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const endpoint = `tokens/${credentials.apiToken}/webhooks`;

				const responseData = await apiRequest.call(this, 'GET', endpoint, {});

				const idModel = this.getNodeParameter('id') as string;
				const webhookUrl = this.getNodeWebhookUrl('default');

				for (const webhook of responseData) {
					if (webhook.idModel === idModel && webhook.callbackURL === webhookUrl) {
						// Set webhook-id to be sure that it can be deleted
						const webhookData = this.getWorkflowStaticData('node');
						webhookData.webhookId = webhook.id as string;
						return true;
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				const credentials = await this.getCredentials('trelloApi');

				const idModel = this.getNodeParameter('id') as string;

				const endpoint = `tokens/${credentials.apiToken}/webhooks`;

				const body = {
					description: `n8n Webhook - ${idModel}`,
					callbackURL: webhookUrl,
					idModel,
				};

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
					const credentials = await this.getCredentials('trelloApi');

					const endpoint = `tokens/${credentials.apiToken}/webhooks/${webhookData.webhookId}`;

					const body = {};

					try {
						await apiRequest.call(this, 'DELETE', endpoint, body);
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

		const bodyData = this.getBodyData();

		// Verify webhook signature using Trello's validation approach
		// https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/
		const credentials = await this.getCredentials('trelloApi');
		if (credentials.oauthSecret) {
			// Type guard functions
			const isIDataObject = (value: unknown): value is IDataObject => {
				return typeof value === 'object' && value !== null && !Array.isArray(value);
			};

			const isString = (value: unknown): value is string => {
				return typeof value === 'string';
			};

			const verifyTrelloWebhookRequest = async (
				secret: string,
				callbackURL: string,
			): Promise<boolean> => {
				const base64Digest = (content: string): string =>
					createHmac('sha1', secret).update(content).digest('base64');

				// Get raw request body
				const req = this.getRequestObject();
				if (!req.rawBody) {
					await req.readRawBody();
				}
				const requestBody = req.rawBody?.toString('utf-8') ?? '';
				const expectedSignature = base64Digest(requestBody + callbackURL);

				const headerData = this.getHeaderData();
				if (!isIDataObject(headerData)) {
					return false;
				}

				const headerSignature = headerData['x-trello-webhook'];
				if (!isString(headerSignature)) {
					return false;
				}

				return expectedSignature === headerSignature;
			};

			// Extract callback URL with type guards
			let webhookUrl: string | undefined;
			if (
				isIDataObject(bodyData) &&
				isIDataObject(bodyData.webhook) &&
				isString(bodyData.webhook.callbackURL)
			) {
				webhookUrl = bodyData.webhook.callbackURL;
			}

			if (!webhookUrl) {
				webhookUrl = this.getNodeWebhookUrl('default');
			}

			if (!isString(credentials.oauthSecret)) {
				return {};
			}

			const trelloSecret = credentials.oauthSecret;
			const isValidRequest =
				webhookUrl && (await verifyTrelloWebhookRequest(trelloSecret, webhookUrl));

			if (!isValidRequest) {
				return {};
			}
		}

		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
