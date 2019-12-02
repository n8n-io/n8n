import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeTypeDescription,
	INodeType,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	shopifyApiRequest,
} from './GenericFunctions';

import { createHmac } from 'crypto';

export class ShopifyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Shopify Trigger',
		name: 'shopify',
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
			}
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
						  name: 'app uninstalled',
						  value: 'app/uninstalled'
						},
						{
						  name: 'carts create',
						  value: 'carts/create'
						},
						{
						  name: 'carts update',
						  value: 'carts/update'
						},
						{
						  name: 'checkouts create',
						  value: 'checkouts/create'
						},
						{
						  name: 'checkouts delete',
						  value: 'checkouts/delete'
						},
						{
						  name: 'checkouts update',
						  value: 'checkouts/update'
						},
						{
						  name: 'collection_listings add',
						  value: 'collection_listings/add'
						},
						{
						  name: 'collection_listings remove',
						  value: 'collection_listings/remove'
						},
						{
						  name: 'collection_listings update',
						  value: 'collection_listings/update'
						},
						{
						  name: 'collections create',
						  value: 'collections/create'
						},
						{
						  name: 'collections delete',
						  value: 'collections/delete'
						},
						{
						  name: 'collections update',
						  value: 'collections/update'
						},
						{
						  name: 'customer_groups create',
						  value: 'customer_groups/create'
						},
						{
						  name: 'customer_groups delete',
						  value: 'customer_groups/delete'
						},
						{
						  name: 'customer_groups update',
						  value: 'customer_groups/update'
						},
						{
						  name: 'customers create',
						  value: 'customers/create'
						},
						{
						  name: 'customers delete',
						  value: 'customers/delete'
						},
						{
						  name: 'customers disable',
						  value: 'customers/disable'
						},
						{
						  name: 'customers enable',
						  value: 'customers/enable'
						},
						{
						  name: 'customers update',
						  value: 'customers/update'
						},
						{
						  name: 'draft_orders create',
						  value: 'draft_orders/create'
						},
						{
						  name: 'draft_orders delete',
						  value: 'draft_orders/delete'
						},
						{
						  name: 'draft_orders update',
						  value: 'draft_orders/update'
						},
						{
						  name: 'fulfillment_events create',
						  value: 'fulfillment_events/create'
						},
						{
						  name: 'fulfillment_events delete',
						  value: 'fulfillment_events/delete'
						},
						{
						  name: 'fulfillments create',
						  value: 'fulfillments/create'
						},
						{
						  name: 'fulfillments update',
						  value: 'fulfillments/update'
						},
						{
						  name: 'inventory_items create',
						  value: 'inventory_items/create'
						},
						{
						  name: 'inventory_items delete',
						  value: 'inventory_items/delete'
						},
						{
						  name: 'inventory_items update',
						  value: 'inventory_items/update'
						},
						{
						  name: 'inventory_levels connect',
						  value: 'inventory_levels/connect'
						},
						{
						  name: 'inventory_levels disconnect',
						  value: 'inventory_levels/disconnect'
						},
						{
						  name: 'inventory_levels update',
						  value: 'inventory_levels/update'
						},
						{
						  name: 'locales create',
						  value: 'locales/create'
						},
						{
						  name: 'locales update',
						  value: 'locales/update'
						},
						{
						  name: 'locations create',
						  value: 'locations/create'
						},
						{
						  name: 'locations delete',
						  value: 'locations/delete'
						},
						{
						  name: 'locations update',
						  value: 'locations/update'
						},
						{
						  name: 'order_transactions create',
						  value: 'order_transactions/create'
						},
						{
						  name: 'orders cancelled',
						  value: 'orders/cancelled'
						},
						{
						  name: 'orders create',
						  value: 'orders/create'
						},
						{
						  name: 'orders delete',
						  value: 'orders/delete'
						},
						{
						  name: 'orders fulfilled',
						  value: 'orders/fulfilled'
						},
						{
						  name: 'orders paid',
						  value: 'orders/paid'
						},
						{
						  name: 'orders partially_fulfilled',
						  value: 'orders/partially_fulfilled'
						},
						{
						  name: 'orders updated',
						  value: 'orders/updated'
						},
						{
						  name: 'product_listings add',
						  value: 'product_listings/add'
						},
						{
						  name: 'product_listings remove',
						  value: 'product_listings/remove'
						},
						{
						  name: 'product_listings update',
						  value: 'product_listings/update'
						},
						{
						  name: 'products create',
						  value: 'products/create'
						},
						{
						  name: 'products delete',
						  value: 'products/delete'
						},
						{
						  name: 'products update',
						  value: 'products/update'
						},
						{
						  name: 'refunds create',
						  value: 'refunds/create'
						},
						{
						  name: 'shop update',
						  value: 'shop/update'
						},
						{
						  name: 'tender_transactions create',
						  value: 'tender_transactions/create'
						},
						{
						  name: 'themes create',
						  value: 'themes/create'
						},
						{
						  name: 'themes delete',
						  value: 'themes/delete'
						},
						{
						  name: 'themes publish',
						  value: 'themes/publish'
						},
						{
						  name: 'themes update',
						  value: 'themes/update'
						}
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
					}
				};

				let responseData;
				try {
					 responseData = await shopifyApiRequest.call(this, 'POST', endpoint, body);
				} catch(error) {
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
				this.helpers.returnJsonArray(req.body)
			],
		};
	}
}
