import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeOperationError,
} from 'n8n-workflow';

import {
	apiRequest,
} from './GenericFunctions';

// import { createHmac } from 'crypto';


export class TrelloTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Trello Trigger',
		name: 'trelloTrigger',
		icon: 'file:trello.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Trello events occure.',
		defaults: {
			name: 'Trello Trigger',
			color: '#026aa7',
		},
		inputs: [],
		outputs: ['main'],
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

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials('trelloApi');

				if (credentials === undefined) {
					throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
				}

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
				if (credentials === undefined) {
					throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
				}

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
					if (credentials === undefined) {
						throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
					}

					const endpoint = `tokens/${credentials.apiToken}/webhooks/${webhookData.webhookId}`;

					const body = {};

					try {
						await apiRequest.call(this, 'DELETE', endpoint, body);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registred anymore
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

		const credentials = await this.getCredentials('trelloApi');

		if (credentials === undefined) {
			throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
		}

		// TODO: Check why that does not work as expected even though it gets done as described
		//       https://developers.trello.com/page/webhooks
		// // Check if the request is valid
		// const headerData = this.getHeaderData() as IDataObject;
		// const webhookUrl = this.getNodeWebhookUrl('default');
		// const checkContent = JSON.stringify(bodyData) + webhookUrl;
		// const computedSignature = createHmac('sha1', credentials.oauthSecret as string).update(checkContent).digest('base64');
		// if (headerData['x-trello-webhook'] !== computedSignature) {
		// 	// Signature is not valid so ignore call
		// 	return {};
		// }

		return {
			workflowData: [
				this.helpers.returnJsonArray(bodyData),
			],
		};
	}
}
