import {
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';
import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import { eventDisplay, eventNameField } from './descriptions/OnfleetWebhookDescription';
import { onfleetApiRequest } from './GenericFunctions';
import { webhookMapping } from './WebhookMapping';

export class OnfleetTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Onfleet Trigger',
		name: 'onfleetTrigger',
		icon: 'file:Onfleet.svg',
		group: [ 'trigger' ],
		version: 1,
		subtitle: '={{$parameter["events"]}}',
		description: 'Starts the workflow when Onfleet events occur',
		defaults: {
			name: 'Onfleet Trigger',
			color: '#AA81F3',
		},
		inputs: [],
		outputs: [ 'main' ],
		credentials: [
			{
				name: 'onfleetApi',
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
			{
				name: 'validate',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			eventDisplay,
			eventNameField,
		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const { name = '' } = this.getNodeParameter('additionalFields', 0) as IDataObject;
				const credentials = await this.getCredentials('onfleetApi') as ICredentialDataDecryptedObject;
				const encodedApiKey = Buffer.from(`${credentials.apiKey}:`).toString('base64');
				const event = this.getNodeParameter('event', 0) as string;
				const webhookData = this.getWorkflowStaticData('node') as IDataObject;
				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				if (!webhookData[event] || typeof webhookData[event] !== 'string') {
					// No webhook id is set so no webhook can exist
					return false;
				}

				// Webhook got created before so check if it still exists
				const endpoint = '/webhooks';

				try {
					const webhooks = await onfleetApiRequest.call(this, 'GET', encodedApiKey, endpoint);
					// tslint:disable-next-line: no-any
					const exist = webhooks.some((webhook: any) => webhook.url === webhookUrl);

					// Changing the name if it's different
					// tslint:disable-next-line: no-any
					const webhook = webhooks.find((webhook: any) => webhook.url === webhookUrl);

					// Webhook name according to the field
					let newWebhookName = `[N8N] ${webhookMapping[event].name}`;
					if (name) {
						newWebhookName = `[N8N] ${name}`;
					}

					// If webhook name is different so, it's updated
					if (webhook && webhook.name !== newWebhookName) {
						const path = `${endpoint}/${webhook.id}`;
						await onfleetApiRequest.call(this, 'PUT', encodedApiKey, path, { name: newWebhookName });
					}
					return exist;
				} catch (error) {
					const { httpCode = '' } = error as { httpCode: string };
					if (httpCode === '404') {
						// Webhook does not exist
						delete webhookData[event];
						return false;
					}

					// Some error occured
					throw error;
				}

			},
			async create(this: IHookFunctions): Promise<boolean> {
				const { name = '' } = this.getNodeParameter('additionalFields', 0) as IDataObject;
				const credentials = await this.getCredentials('onfleetApi') as ICredentialDataDecryptedObject;
				const encodedApiKey = Buffer.from(`${credentials.apiKey}:`).toString('base64');
				const event = this.getNodeParameter('event', 0) as string;
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				if (webhookUrl.includes('//localhost')) {
					throw new NodeOperationError(this.getNode(), 'The Webhook can not work on "localhost". Please, either setup n8n on a custom domain or start with "--tunnel"!');
				}

				// Webhook name according to the field
				let newWebhookName = `[N8N] ${webhookMapping[event].name}`;
				if (name) {
					newWebhookName = `[N8N] ${name}`;
				}

				const path = `/webhooks`;
				const body = {
					name		: newWebhookName,
					url			: webhookUrl,
					trigger	: webhookMapping[event].key,
				};

				try {
					onfleetApiRequest.call(this, 'POST', encodedApiKey, path, body)
						.then(responseData => {
							if (responseData.id === undefined) {
								// Required data is missing so was not successful
								throw new NodeApiError(this.getNode(), responseData, { message: 'Onfleet webhook creation response did not contain the expected data' });
							}

							return Promise.resolve(true);
						});
				} catch (error) {
					const { httpCode = '' } = error as { httpCode: string };
					if (httpCode === '422') {
						throw new NodeOperationError(this.getNode(), 'A webhook with the identical URL probably exists already. Please delete it manually in Onfleet!');
					}

					throw error;
				}
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials('onfleetApi') as ICredentialDataDecryptedObject;
				const encodedApiKey = Buffer.from(`${credentials.apiKey}:`).toString('base64');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				// Get the data of the already registered webhook
				const webhooks = await onfleetApiRequest.call(this, 'GET', encodedApiKey, 'webhooks');
				const webhook = webhooks.find((webhook: IDataObject) => webhook.url === webhookUrl);
				const endpoint = `/webhooks/${webhook.id}`;
				await onfleetApiRequest.call(this, 'DELETE', encodedApiKey, endpoint);

				return true;
			},
		},
	};

	/**
	 * Triggered function when a Onfleet webhook is executed
	 * @param this Webhook functions
	 * @returns {Promise<IWebhookResponseData>} Response data
	 */
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		if (req.method === 'GET') {
			/* -------------------------------------------------------------------------- */
			/*                             Validation request                             */
			/* -------------------------------------------------------------------------- */
			const res = this.getResponseObject();
			res.status(200).send(req.query.check);
			return { noWebhookResponse: true };
		}

		const bodyData = this.getBodyData();
		const returnData: IDataObject = bodyData;

		return {
			workflowData: [
				this.helpers.returnJsonArray(returnData),
			],
		};
	}
}
