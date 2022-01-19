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
		icon: 'file:Onfleet.png',
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
				const webhookData = this.getWorkflowStaticData('node') as IDataObject;
				const credentials = await this.getCredentials('onfleetApi') as ICredentialDataDecryptedObject;
				const event = this.getNodeParameter('event', 0) as string;
				const { name = '' } = this.getNodeParameter('additionalFields', 0) as IDataObject;
				const encodedApiKey = Buffer.from(`${credentials.apiKey}:`).toString('base64');

				if (!webhookData[event] || typeof webhookData[event] !== 'string') {
					// No webhook id is set so no webhook can exist
					return false;
				}

				// Webhook got created before so check if it still exists
				const endpoint = '/webhooks';

				try {
					const webhooks = await onfleetApiRequest.call(this, 'GET', encodedApiKey, endpoint);
					// tslint:disable-next-line: no-any
					const exist = webhooks.some((webhook: any) => webhook.id === webhookData[event]);
					if (!exist) {
						delete webhookData[event];
					} else {
						// Changing the name if it's different
						// tslint:disable-next-line: no-any
						const webhook = webhooks.find((webhook: any) => webhook.id === webhookData[event]);

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
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const credentials = await this.getCredentials('onfleetApi') as ICredentialDataDecryptedObject;
				const webhookData = this.getWorkflowStaticData('node');
				const event = this.getNodeParameter('event', 0) as string;
				const encodedApiKey = Buffer.from(`${credentials.apiKey}:`).toString('base64');
				const { name = '' } = this.getNodeParameter('additionalFields', 0) as IDataObject;

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

							webhookData[event] = responseData.id as string;
							return Promise.resolve(true);
						});
				} catch (error) {
					const { httpCode = '' } = error as { httpCode: string };
					if (httpCode === '422') {
						// Webhook exists already

						// Get the data of the already registered webhook
						onfleetApiRequest.call(this, 'GET', encodedApiKey, path)
							.then((responseData: IDataObject[]) => {
								const webhook = responseData.find(webhook => webhook.url === webhookUrl);
								webhookData[event] = webhook!.id;
								return Promise.resolve(true);
							});
						throw new NodeOperationError(this.getNode(), 'A webhook with the identical URL probably exists already. Please delete it manually in Onfleet!');
					}

					throw error;
				}
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const credentials = await this.getCredentials('onfleetApi') as ICredentialDataDecryptedObject;
				const event = this.getNodeParameter('event', 0) as string;
				const encodedApiKey = Buffer.from(`${credentials.apiKey}:`).toString('base64');

				if (webhookData[event] !== undefined) {
					const endpoint = `/webhooks/${webhookData[event]}`;

					try {
						await onfleetApiRequest.call(this, 'DELETE', encodedApiKey, endpoint);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registred anymore
					delete webhookData[event];
				}

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
		const returnData: IDataObject[] = [{
			body: bodyData,
			headers: this.getHeaderData(),
			query: this.getQueryData(),
		}];

		return {
			workflowData: [
				this.helpers.returnJsonArray(returnData),
			],
		};
	}
}
