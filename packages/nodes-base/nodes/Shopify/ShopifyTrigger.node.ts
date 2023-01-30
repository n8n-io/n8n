import type { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import { shopifyApiRequest } from './GenericFunctions';

import { createHmac } from 'crypto';

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
		outputs: ['main'],
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
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
					{
						name: 'API Key',
						value: 'apiKey',
					},
				],
				default: 'apiKey',
			},
			{
				displayName: 'Trigger On',
				name: 'topic',
				type: 'options',
				default: '',
				options: [
					{
						name: 'App Uninstalled',
						value: 'app/uninstalled',
					},
					{
						name: 'Cart Created',
						value: 'carts/create',
					},
					{
						name: 'Cart Updated',
						value: 'carts/update',
					},
					{
						name: 'Checkout Created',
						value: 'checkouts/create',
					},
					{
						name: 'Checkout Delete',
						value: 'checkouts/delete',
					},
					{
						name: 'Checkout Update',
						value: 'checkouts/update',
					},
					{
						name: 'Collection Created',
						value: 'collections/create',
					},
					{
						name: 'Collection Deleted',
						value: 'collections/delete',
					},
					{
						name: 'Collection Listings Added',
						value: 'collection_listings/add',
					},
					{
						name: 'Collection Listings Removed',
						value: 'collection_listings/remove',
					},
					{
						name: 'Collection Listings Updated',
						value: 'collection_listings/update',
					},
					{
						name: 'Collection Updated',
						value: 'collections/update',
					},
					{
						name: 'Customer Created',
						value: 'customers/create',
					},
					{
						name: 'Customer Deleted',
						value: 'customers/delete',
					},
					{
						name: 'Customer Disabled',
						value: 'customers/disable',
					},
					{
						name: 'Customer Enabled',
						value: 'customers/enable',
					},
					{
						name: 'Customer Groups Created',
						value: 'customer_groups/create',
					},
					{
						name: 'Customer Groups Deleted',
						value: 'customer_groups/delete',
					},
					{
						name: 'Customer Groups Updated',
						value: 'customer_groups/update',
					},
					{
						name: 'Customer Updated',
						value: 'customers/update',
					},
					{
						name: 'Draft Orders Created',
						value: 'draft_orders/create',
					},
					{
						name: 'Draft Orders Deleted',
						value: 'draft_orders/delete',
					},
					{
						name: 'Draft Orders Updated',
						value: 'draft_orders/update',
					},
					{
						name: 'Fulfillment Created',
						value: 'fulfillments/create',
					},
					{
						name: 'Fulfillment Events Created',
						value: 'fulfillment_events/create',
					},
					{
						name: 'Fulfillment Events Deleted',
						value: 'fulfillment_events/delete',
					},
					{
						name: 'Fulfillment Updated',
						value: 'fulfillments/update',
					},
					{
						name: 'Inventory Items Created',
						value: 'inventory_items/create',
					},
					{
						name: 'Inventory Items Deleted',
						value: 'inventory_items/delete',
					},
					{
						name: 'Inventory Items Updated',
						value: 'inventory_items/update',
					},
					{
						name: 'Inventory Levels Connected',
						value: 'inventory_levels/connect',
					},
					{
						name: 'Inventory Levels Disconnected',
						value: 'inventory_levels/disconnect',
					},
					{
						name: 'Inventory Levels Updated',
						value: 'inventory_levels/update',
					},
					{
						name: 'Locale Created',
						value: 'locales/create',
					},
					{
						name: 'Locale Updated',
						value: 'locales/update',
					},
					{
						name: 'Location Created',
						value: 'locations/create',
					},
					{
						name: 'Location Deleted',
						value: 'locations/delete',
					},
					{
						name: 'Location Updated',
						value: 'locations/update',
					},
					{
						name: 'Order Cancelled',
						value: 'orders/cancelled',
					},
					{
						name: 'Order Created',
						value: 'orders/create',
					},
					{
						name: 'Order Fulfilled',
						value: 'orders/fulfilled',
					},
					{
						name: 'Order Paid',
						value: 'orders/paid',
					},
					{
						name: 'Order Partially Fulfilled',
						value: 'orders/partially_fulfilled',
					},
					{
						name: 'Order Transactions Created',
						value: 'order_transactions/create',
					},
					{
						name: 'Order Updated',
						value: 'orders/updated',
					},
					{
						name: 'Orders Deleted',
						value: 'orders/delete',
					},
					{
						name: 'Product Created',
						value: 'products/create',
					},
					{
						name: 'Product Deleted',
						value: 'products/delete',
					},
					{
						name: 'Product Listings Added',
						value: 'product_listings/add',
					},
					{
						name: 'Product Listings Removed',
						value: 'product_listings/remove',
					},
					{
						name: 'Product Listings Updated',
						value: 'product_listings/update',
					},
					{
						name: 'Product Updated',
						value: 'products/update',
					},
					{
						name: 'Refund Created',
						value: 'refunds/create',
					},
					{
						name: 'Shop Updated',
						value: 'shop/update',
					},
					{
						name: 'Tender Transactions Created',
						value: 'tender_transactions/create',
					},
					{
						name: 'Theme Created',
						value: 'themes/create',
					},
					{
						name: 'Theme Deleted',
						value: 'themes/delete',
					},
					{
						name: 'Theme Published',
						value: 'themes/publish',
					},
					{
						name: 'Theme Updated',
						value: 'themes/update',
					},
				],
			},
		],
	};

	// @ts-ignore (because of request)
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
			workflowData: [this.helpers.returnJsonArray(req.body)],
		};
	}
}
