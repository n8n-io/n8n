import { createHmac } from 'crypto';
import {
	type IHookFunctions,
	type IWebhookFunctions,
	type IDataObject,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookResponseData,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { shopifyApiRequest } from './GenericFunctions';

export class ShopifyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Shopify Trigger',
		name: 'shopifyTrigger',
		icon: 'file:shopify.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Handle Shopify events via webhooks',
		defaults: {
			name: 'Shopify Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'shopifyApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['apiKey'],
					},
				},
			},
			{
				name: 'shopifyAccessTokenApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
			},
			{
				name: 'shopifyOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
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
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
					{
						name: 'API key',
						value: 'apiKey',
					},
				],
				default: 'apiKey',
			},
			{
				displayName: 'Trigger on',
				name: 'topic',
				type: 'options',
				default: '',
				options: [
					{
						name: 'App uninstalled',
						value: 'app/uninstalled',
					},
					{
						name: 'Cart created',
						value: 'carts/create',
					},
					{
						name: 'Cart updated',
						value: 'carts/update',
					},
					{
						name: 'Checkout created',
						value: 'checkouts/create',
					},
					{
						name: 'Checkout delete',
						value: 'checkouts/delete',
					},
					{
						name: 'Checkout update',
						value: 'checkouts/update',
					},
					{
						name: 'Collection created',
						value: 'collections/create',
					},
					{
						name: 'Collection deleted',
						value: 'collections/delete',
					},
					{
						name: 'Collection listings added',
						value: 'collection_listings/add',
					},
					{
						name: 'Collection listings removed',
						value: 'collection_listings/remove',
					},
					{
						name: 'Collection listings updated',
						value: 'collection_listings/update',
					},
					{
						name: 'Collection updated',
						value: 'collections/update',
					},
					{
						name: 'Customer created',
						value: 'customers/create',
					},
					{
						name: 'Customer deleted',
						value: 'customers/delete',
					},
					{
						name: 'Customer disabled',
						value: 'customers/disable',
					},
					{
						name: 'Customer enabled',
						value: 'customers/enable',
					},
					{
						name: 'Customer groups created',
						value: 'customer_groups/create',
					},
					{
						name: 'Customer groups deleted',
						value: 'customer_groups/delete',
					},
					{
						name: 'Customer groups updated',
						value: 'customer_groups/update',
					},
					{
						name: 'Customer updated',
						value: 'customers/update',
					},
					{
						name: 'Draft orders created',
						value: 'draft_orders/create',
					},
					{
						name: 'Draft orders deleted',
						value: 'draft_orders/delete',
					},
					{
						name: 'Draft orders updated',
						value: 'draft_orders/update',
					},
					{
						name: 'Fulfillment created',
						value: 'fulfillments/create',
					},
					{
						name: 'Fulfillment events created',
						value: 'fulfillment_events/create',
					},
					{
						name: 'Fulfillment events deleted',
						value: 'fulfillment_events/delete',
					},
					{
						name: 'Fulfillment updated',
						value: 'fulfillments/update',
					},
					{
						name: 'Inventory items created',
						value: 'inventory_items/create',
					},
					{
						name: 'Inventory items deleted',
						value: 'inventory_items/delete',
					},
					{
						name: 'Inventory items updated',
						value: 'inventory_items/update',
					},
					{
						name: 'Inventory levels connected',
						value: 'inventory_levels/connect',
					},
					{
						name: 'Inventory levels disconnected',
						value: 'inventory_levels/disconnect',
					},
					{
						name: 'Inventory levels updated',
						value: 'inventory_levels/update',
					},
					{
						name: 'Locale created',
						value: 'locales/create',
					},
					{
						name: 'Locale updated',
						value: 'locales/update',
					},
					{
						name: 'Location created',
						value: 'locations/create',
					},
					{
						name: 'Location deleted',
						value: 'locations/delete',
					},
					{
						name: 'Location updated',
						value: 'locations/update',
					},
					{
						name: 'Order cancelled',
						value: 'orders/cancelled',
					},
					{
						name: 'Order created',
						value: 'orders/create',
					},
					{
						name: 'Order fulfilled',
						value: 'orders/fulfilled',
					},
					{
						name: 'Order paid',
						value: 'orders/paid',
					},
					{
						name: 'Order partially fulfilled',
						value: 'orders/partially_fulfilled',
					},
					{
						name: 'Order transactions created',
						value: 'order_transactions/create',
					},
					{
						name: 'Order updated',
						value: 'orders/updated',
					},
					{
						name: 'Orders deleted',
						value: 'orders/delete',
					},
					{
						name: 'Product created',
						value: 'products/create',
					},
					{
						name: 'Product deleted',
						value: 'products/delete',
					},
					{
						name: 'Product listings added',
						value: 'product_listings/add',
					},
					{
						name: 'Product listings removed',
						value: 'product_listings/remove',
					},
					{
						name: 'Product listings updated',
						value: 'product_listings/update',
					},
					{
						name: 'Product updated',
						value: 'products/update',
					},
					{
						name: 'Refund created',
						value: 'refunds/create',
					},
					{
						name: 'Shop updated',
						value: 'shop/update',
					},
					{
						name: 'Tender transactions created',
						value: 'tender_transactions/create',
					},
					{
						name: 'Theme created',
						value: 'themes/create',
					},
					{
						name: 'Theme deleted',
						value: 'themes/delete',
					},
					{
						name: 'Theme published',
						value: 'themes/publish',
					},
					{
						name: 'Theme updated',
						value: 'themes/update',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const topic = this.getNodeParameter('topic') as string;
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const endpoint = '/webhooks';

				const { webhooks } = await shopifyApiRequest.call(this, 'GET', endpoint, {}, { topic });
				for (const webhook of webhooks) {
					if (webhook.address === webhookUrl) {
						webhookData.webhookId = webhook.id;
						return true;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const topic = this.getNodeParameter('topic') as string;
				const webhookData = this.getWorkflowStaticData('node');
				const endpoint = '/webhooks.json';
				const body = {
					webhook: {
						topic,
						address: webhookUrl,
						format: 'json',
					},
				};

				const responseData = await shopifyApiRequest.call(this, 'POST', endpoint, body);

				if (responseData.webhook === undefined || responseData.webhook.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				webhookData.webhookId = responseData.webhook.id as string;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId !== undefined) {
					const endpoint = `/webhooks/${webhookData.webhookId}.json`;
					try {
						await shopifyApiRequest.call(this, 'DELETE', endpoint, {});
					} catch (error) {
						return false;
					}
					delete webhookData.webhookId;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const headerData = this.getHeaderData() as IDataObject;
		const req = this.getRequestObject();
		const authentication = this.getNodeParameter('authentication') as string;
		let secret = '';

		if (authentication === 'apiKey') {
			const credentials = await this.getCredentials('shopifyApi');
			secret = credentials.sharedSecret as string;
		}

		if (authentication === 'accessToken') {
			const credentials = await this.getCredentials('shopifyAccessTokenApi');
			secret = credentials.appSecretKey as string;
		}

		if (authentication === 'oAuth2') {
			const credentials = await this.getCredentials('shopifyOAuth2Api');
			secret = credentials.clientSecret as string;
		}

		const topic = this.getNodeParameter('topic') as string;
		if (
			headerData['x-shopify-topic'] !== undefined &&
			headerData['x-shopify-hmac-sha256'] !== undefined &&
			headerData['x-shopify-shop-domain'] !== undefined &&
			headerData['x-shopify-api-version'] !== undefined
		) {
			const computedSignature = createHmac('sha256', secret).update(req.rawBody).digest('base64');

			if (headerData['x-shopify-hmac-sha256'] !== computedSignature) {
				return {};
			}
			if (topic !== headerData['x-shopify-topic']) {
				return {};
			}
		} else {
			return {};
		}
		return {
			workflowData: [this.helpers.returnJsonArray(req.body as IDataObject)],
		};
	}
}
