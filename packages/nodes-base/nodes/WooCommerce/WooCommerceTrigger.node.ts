import { createHmac } from 'crypto';
import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { verifySignature } from '../../utils/webhook-signature-verification';
import { getAutomaticSecret, woocommerceApiRequest } from './GenericFunctions';

export class WooCommerceTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WooCommerce Trigger',
		name: 'wooCommerceTrigger',
		icon: 'file:wooCommerce.svg',
		group: ['trigger'],
		version: 1,
		description: 'Handle WooCommerce events via webhooks',
		defaults: {
			name: 'WooCommerce Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'wooCommerceApi',
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
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: '',
				options: [
					{
						name: 'coupon.created',
						value: 'coupon.created',
					},
					{
						name: 'coupon.deleted',
						value: 'coupon.deleted',
					},
					{
						name: 'coupon.updated',
						value: 'coupon.updated',
					},
					{
						name: 'customer.created',
						value: 'customer.created',
					},
					{
						name: 'customer.deleted',
						value: 'customer.deleted',
					},
					{
						name: 'customer.updated',
						value: 'customer.updated',
					},
					{
						name: 'order.created',
						value: 'order.created',
					},
					{
						name: 'order.deleted',
						value: 'order.deleted',
					},
					{
						name: 'order.updated',
						value: 'order.updated',
					},
					{
						name: 'product.created',
						value: 'product.created',
					},
					{
						name: 'product.deleted',
						value: 'product.deleted',
					},
					{
						name: 'product.updated',
						value: 'product.updated',
					},
				],
				description: 'Determines which resource events the webhook is triggered for',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const currentEvent = this.getNodeParameter('event') as string;
				const endpoint = '/webhooks';

				const webhooks = await woocommerceApiRequest.call(
					this,
					'GET',
					endpoint,
					{},
					{ status: 'active', per_page: 100 },
				);

				for (const webhook of webhooks) {
					if (
						webhook.status === 'active' &&
						webhook.delivery_url === webhookUrl &&
						webhook.topic === currentEvent
					) {
						if (!webhookData.secret) {
							// Orphaned webhook: delete it so `create` can register a fresh one with a new secret.
							try {
								await woocommerceApiRequest.call(
									this,
									'DELETE',
									`/webhooks/${webhook.id}`,
									{},
									{ force: true },
								);
							} catch (error) {
								this.logger.warn('Failed to delete orphaned webhook during checkExists', {
									webhookId: webhook.id,
									error,
								});
							}
							delete webhookData.webhookId;
							return false;
						}

						webhookData.webhookId = webhook.id;
						return true;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials('wooCommerceApi');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const event = this.getNodeParameter('event') as string;
				const secret = getAutomaticSecret(credentials);
				const endpoint = '/webhooks';
				const body: IDataObject = {
					delivery_url: webhookUrl,
					topic: event,
					secret,
				};
				const { id } = await woocommerceApiRequest.call(this, 'POST', endpoint, body);
				webhookData.webhookId = id;
				webhookData.secret = secret;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const endpoint = `/webhooks/${webhookData.webhookId}`;
				try {
					await woocommerceApiRequest.call(this, 'DELETE', endpoint, {}, { force: true });
				} catch (error) {
					return false;
				}
				delete webhookData.webhookId;
				delete webhookData.secret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const headerData = this.getHeaderData();
		const webhookData = this.getWorkflowStaticData('node');

		if (headerData['x-wc-webhook-id'] === undefined) {
			return {};
		}

		const secret = webhookData.secret as string | undefined;
		if (!secret) {
			throw new NodeOperationError(this.getNode(), 'WooCommerce webhook secret is missing', {
				description:
					'The stored webhook secret could not be found. Deactivate and re-activate the workflow so n8n can re-register the webhook with WooCommerce.',
			});
		}

		const isValid = verifySignature({
			getExpectedSignature: () => createHmac('sha256', secret).update(req.rawBody).digest('base64'),
			getActualSignature: () => (headerData['x-wc-webhook-signature'] as string) ?? null,
		});

		if (!isValid) {
			const res = this.getResponseObject();
			res.status(401).send('Unauthorized').end();
			return { noWebhookResponse: true };
		}

		return {
			workflowData: [this.helpers.returnJsonArray(req.body as IDataObject)],
		};
	}
}
