import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	shopifyApiRequest,
} from './GenericFunctions';

import {
	createHmac,
} from 'crypto';

export class ShopifyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Shopify Trigger',
		name: 'shopifyTrigger',
		icon: 'file:shopify.png',
		group: ['trigger'],
		version: 1,
		description: 'Handle Shopify events via webhooks',
		defaults: {
			name: 'Shopify Trigger',
			color: '#559922',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'shopifyApi',
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
				displayName: 'Topic',
				name: 'topic',
				type: 'options',
				default: '',
				options:
					[
						{
							name: 'App uninstalled',
							value: 'app/uninstalled',
						},
						{
							name: 'Carts create',
							value: 'carts/create',
						},
						{
							name: 'Carts update',
							value: 'carts/update',
						},
						{
							name: 'Checkouts create',
							value: 'checkouts/create',
						},
						{
							name: 'Checkouts delete',
							value: 'checkouts/delete',
						},
						{
							name: 'Checkouts update',
							value: 'checkouts/update',
						},
						{
							name: 'Collection listings add',
							value: 'collection_listings/add',
						},
						{
							name: 'Collection listings remove',
							value: 'collection_listings/remove',
						},
						{
							name: 'Collection listings update',
							value: 'collection_listings/update',
						},
						{
							name: 'Collections create',
							value: 'collections/create',
						},
						{
							name: 'Collections delete',
							value: 'collections/delete',
						},
						{
							name: 'Collections update',
							value: 'collections/update',
						},
						{
							name: 'Customer groups create',
							value: 'customer_groups/create',
						},
						{
							name: 'Customer groups delete',
							value: 'customer_groups/delete',
						},
						{
							name: 'Customer groups update',
							value: 'customer_groups/update',
						},
						{
							name: 'Customers create',
							value: 'customers/create',
						},
						{
							name: 'Customers delete',
							value: 'customers/delete',
						},
						{
							name: 'Customers disable',
							value: 'customers/disable',
						},
						{
							name: 'Customers enable',
							value: 'customers/enable',
						},
						{
							name: 'Customers update',
							value: 'customers/update',
						},
						{
							name: 'Draft orders create',
							value: 'draft_orders/create',
						},
						{
							name: 'Draft orders delete',
							value: 'draft_orders/delete',
						},
						{
							name: 'Draft orders update',
							value: 'draft_orders/update',
						},
						{
							name: 'Fulfillment events create',
							value: 'fulfillment_events/create',
						},
						{
							name: 'Fulfillment events delete',
							value: 'fulfillment_events/delete',
						},
						{
							name: 'Fulfillments create',
							value: 'fulfillments/create',
						},
						{
							name: 'Fulfillments update',
							value: 'fulfillments/update',
						},
						{
							name: 'Inventory_items create',
							value: 'inventory_items/create',
						},
						{
							name: 'Inventory_items delete',
							value: 'inventory_items/delete',
						},
						{
							name: 'Inventory_items update',
							value: 'inventory_items/update',
						},
						{
							name: 'Inventory_levels connect',
							value: 'inventory_levels/connect',
						},
						{
							name: 'Inventory_levels disconnect',
							value: 'inventory_levels/disconnect',
						},
						{
							name: 'Inventory_levels update',
							value: 'inventory_levels/update',
						},
						{
							name: 'Locales create',
							value: 'locales/create',
						},
						{
							name: 'Locales update',
							value: 'locales/update',
						},
						{
							name: 'Locations create',
							value: 'locations/create',
						},
						{
							name: 'Locations delete',
							value: 'locations/delete',
						},
						{
							name: 'Locations update',
							value: 'locations/update',
						},
						{
							name: 'Order transactions create',
							value: 'order_transactions/create',
						},
						{
							name: 'Orders cancelled',
							value: 'orders/cancelled',
						},
						{
							name: 'Orders create',
							value: 'orders/create',
						},
						{
							name: 'Orders delete',
							value: 'orders/delete',
						},
						{
							name: 'Orders fulfilled',
							value: 'orders/fulfilled',
						},
						{
							name: 'Orders paid',
							value: 'orders/paid',
						},
						{
							name: 'Orders partially fulfilled',
							value: 'orders/partially_fulfilled',
						},
						{
							name: 'Orders updated',
							value: 'orders/updated',
						},
						{
							name: 'Product listings add',
							value: 'product_listings/add',
						},
						{
							name: 'Product listings remove',
							value: 'product_listings/remove',
						},
						{
							name: 'Product listings update',
							value: 'product_listings/update',
						},
						{
							name: 'Products create',
							value: 'products/create',
						},
						{
							name: 'Products delete',
							value: 'products/delete',
						},
						{
							name: 'Products update',
							value: 'products/update',
						},
						{
							name: 'Refunds create',
							value: 'refunds/create',
						},
						{
							name: 'Shop update',
							value: 'shop/update',
						},
						{
							name: 'Tender transactions create',
							value: 'tender_transactions/create',
						},
						{
							name: 'Themes create',
							value: 'themes/create',
						},
						{
							name: 'Themes delete',
							value: 'themes/delete',
						},
						{
							name: 'Themes publish',
							value: 'themes/publish',
						},
						{
							name: 'Themes update',
							value: 'themes/update',
						},
					],
				description: 'Event that triggers the webhook',
			},
		],

	};
	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId === undefined) {
					return false;
				}
				const endpoint = `/webhooks/${webhookData.webhookId}.json`;
				try {
					await shopifyApiRequest.call(this, 'GET', endpoint, {});
				} catch (e) {
					if (e.statusCode === 404) {
						delete webhookData.webhookId;
						return false;
					}
					throw e;
				}
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const credentials = this.getCredentials('shopifyApi');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const topic = this.getNodeParameter('topic') as string;
				const endpoint = `/webhooks.json`;
				const body = {
					webhook: {
						topic,
						address: webhookUrl,
						format: 'json',
					},
				};

				let responseData;
				try {
					responseData = await shopifyApiRequest.call(this, 'POST', endpoint, body);
				} catch (error) {
					return false;
				}

				if (responseData.webhook === undefined || responseData.webhook.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = responseData.webhook.id as string;
				webhookData.sharedSecret = credentials!.sharedSecret as string;
				webhookData.topic = topic as string;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId !== undefined) {
					const endpoint = `/webhooks/${webhookData.webhookId}.json`;
					try {
						await shopifyApiRequest.call(this, 'DELETE', endpoint, {});
					} catch (e) {
						return false;
					}
					delete webhookData.webhookId;
					delete webhookData.sharedSecret;
					delete webhookData.topic;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const headerData = this.getHeaderData() as IDataObject;
		const req = this.getRequestObject();
		const webhookData = this.getWorkflowStaticData('node') as IDataObject;
		if (headerData['x-shopify-topic'] !== undefined
			&& headerData['x-shopify-hmac-sha256'] !== undefined
			&& headerData['x-shopify-shop-domain'] !== undefined
			&& headerData['x-shopify-api-version'] !== undefined) {
			// @ts-ignore
			const computedSignature = createHmac('sha256', webhookData.sharedSecret as string).update(req.rawBody).digest('base64');
			if (headerData['x-shopify-hmac-sha256'] !== computedSignature) {
				return {};
			}
			if (webhookData.topic !== headerData['x-shopify-topic']) {
				return {};
			}
		} else {
			return {};
		}
		return {
			workflowData: [
				this.helpers.returnJsonArray(req.body),
			],
		};
	}
}
