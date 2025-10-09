import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { eventDisplay, eventNameField } from './descriptions/OnfleetWebhookDescription';
import { onfleetApiRequest } from './GenericFunctions';
import { webhookMapping } from './WebhookMapping';

export class OnfleetTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Onfleet Trigger',
		name: 'onfleetTrigger',
		icon: 'file:Onfleet.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["triggerOn"]}}',
		description: 'Starts the workflow when Onfleet events occur',
		defaults: {
			name: 'Onfleet Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'onfleetApi',
				required: true,
				testedBy: 'onfleetApiTest',
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
		properties: [eventDisplay, eventNameField],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				// Webhook got created before so check if it still exists
				const endpoint = '/webhooks';

				const webhooks = await onfleetApiRequest.call(this, 'GET', endpoint);

				for (const webhook of webhooks) {
					if (webhook.url === webhookUrl && webhook.trigger === event) {
						webhookData.webhookId = webhook.id;
						return true;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const { name = '' } = this.getNodeParameter('additionalFields') as IDataObject;
				const triggerOn = this.getNodeParameter('triggerOn') as string;
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				if (webhookUrl.includes('//localhost')) {
					throw new NodeOperationError(
						this.getNode(),
						'The Webhook can not work on "localhost". Please, either setup n8n on a custom domain or start with "--tunnel"!',
					);
				}
				// Webhook name according to the field
				let newWebhookName = `n8n-webhook:${webhookUrl}`;

				if (name) {
					newWebhookName = `n8n-webhook:${name}`;
				}

				const path = '/webhooks';
				const body = {
					name: newWebhookName,
					url: webhookUrl,
					trigger: webhookMapping[triggerOn].key,
				};

				try {
					const webhook = await onfleetApiRequest.call(this, 'POST', path, body);

					if (webhook.id === undefined) {
						throw new NodeApiError(this.getNode(), webhook as JsonObject, {
							message: 'Onfleet webhook creation response did not contain the expected data',
						});
					}

					webhookData.id = webhook.id as string;
				} catch (error) {
					const { httpCode = '' } = error as { httpCode: string };
					if (httpCode === '422') {
						throw new NodeOperationError(
							this.getNode(),
							'A webhook with the identical URL probably exists already. Please delete it manually in Onfleet!',
						);
					}
					throw error;
				}
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				// Get the data of the already registered webhook
				const endpoint = `/webhooks/${webhookData.id}`;
				await onfleetApiRequest.call(this, 'DELETE', endpoint);
				return true;
			},
		},
	};

	/**
	 * Triggered function when an Onfleet webhook is executed
	 */
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		if (this.getWebhookName() === 'setup') {
			/* -------------------------------------------------------------------------- */
			/*                             Validation request                             */
			/* -------------------------------------------------------------------------- */
			const res = this.getResponseObject();
			res.status(200).send(req.query.check);
			return { noWebhookResponse: true };
		}

		const returnData: IDataObject = this.getBodyData();

		return {
			workflowData: [this.helpers.returnJsonArray(returnData)],
		};
	}
}
