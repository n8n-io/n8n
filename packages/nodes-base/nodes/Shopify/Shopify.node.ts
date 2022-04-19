import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	keysToSnakeCase,
	shopifyApiRequest,
	shopifyApiRequestAllItems,
} from './GenericFunctions';

import {
	orderFields,
	orderOperations,
} from './OrderDescription';

import {
	productFields,
	productOperations,
} from './ProductDescription';

import {
	IAddress,
	IDiscountCode,
	ILineItem,
	IOrder,
} from './OrderInterface';

import {
	IProduct,
} from './ProductInterface';

export class Shopify implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Shopify',
		name: 'shopify',
		icon: 'file:shopify.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Shopify API',
		defaults: {
			name: 'Shopify',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'shopifyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Order',
						value: 'order',
					},
					{
						name: 'Product',
						value: 'product',
					},
				],
				default: 'order',
				description: 'Resource to consume.',
			},
			// ORDER
			...orderOperations,
			...orderFields,
			// PRODUCTS
			...productOperations,
			...productFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available products to display them to user so that he can
			// select them easily
			async getProducts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const products = await shopifyApiRequestAllItems.call(this, 'products', 'GET', '/products.json', {}, { fields: 'id,title' });
				for (const product of products) {
					const productName = product.title;
					const productId = product.id;
					returnData.push({
						name: productName,
						value: productId,
					});
				}
				return returnData;
			},
			// Get all the available locations to display them to user so that he can
			// select them easily
			async getLocations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const locations = await shopifyApiRequestAllItems.call(this, 'locations', 'GET', '/locations.json', {}, { fields: 'id,name' });
				for (const location of locations) {
					const locationName = location.name;
					const locationId = location.id;
					returnData.push({
						name: locationName,
						value: locationId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'order') {
					//https://shopify.dev/docs/admin-api/rest/reference/orders/order#create-2020-04
					if (operation === 'create') {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const discount = additionalFields.discountCodesUi as IDataObject;
						const billing = additionalFields.billingAddressUi as IDataObject;
						const shipping = additionalFields.shippingAddressUi as IDataObject;
						const lineItem = (this.getNodeParameter('limeItemsUi', i) as IDataObject).lineItemValues as IDataObject[];
						if (lineItem === undefined) {
							throw new NodeOperationError(this.getNode(), 'At least one line item has to be added');
						}
						const body: IOrder = {
							test: true,
							line_items: keysToSnakeCase(lineItem) as ILineItem[],
						};
						if (additionalFields.fulfillmentStatus) {
							body.fulfillment_status = additionalFields.fulfillmentStatus as string;
						}
						if (additionalFields.inventoryBehaviour) {
							body.inventory_behaviour = additionalFields.inventoryBehaviour as string;
						}
						if (additionalFields.locationId) {
							body.location_id = additionalFields.locationId as number;
						}
						if (additionalFields.note) {
							body.note = additionalFields.note as string;
						}
						if (additionalFields.sendFulfillmentReceipt) {
							body.send_fulfillment_receipt = additionalFields.sendFulfillmentReceipt as boolean;
						}
						if (additionalFields.sendReceipt) {
							body.send_receipt = additionalFields.sendReceipt as boolean;
						}
						if (additionalFields.sendReceipt) {
							body.send_receipt = additionalFields.sendReceipt as boolean;
						}
						if (additionalFields.sourceName) {
							body.source_name = additionalFields.sourceName as string;
						}
						if (additionalFields.tags) {
							body.tags = additionalFields.tags as string;
						}
						if (additionalFields.test) {
							body.test = additionalFields.test as boolean;
						}
						if (additionalFields.email) {
							body.email = additionalFields.email as string;
						}
						if (discount) {
							body.discount_codes = discount.discountCodesValues as IDiscountCode[];
						}
						if (billing) {
							body.billing_address = keysToSnakeCase(billing.billingAddressValues as IDataObject)[0] as IAddress;
						}
						if (shipping) {
							body.shipping_address = keysToSnakeCase(shipping.shippingAddressValues as IDataObject)[0] as IAddress;
						}
						responseData = await shopifyApiRequest.call(this, 'POST', '/orders.json', { order: body });
						responseData = responseData.order;
					}
					//https://shopify.dev/docs/admin-api/rest/reference/orders/order#destroy-2020-04
					if (operation === 'delete') {
						const orderId = this.getNodeParameter('orderId', i) as string;
						responseData = await shopifyApiRequest.call(this, 'DELETE', `/orders/${orderId}.json`);
						responseData = { success: true };
					}
					//https://shopify.dev/docs/admin-api/rest/reference/orders/order#show-2020-04
					if (operation === 'get') {
						const orderId = this.getNodeParameter('orderId', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						if (options.fields) {
							qs.fields = options.fields as string;
						}
						responseData = await shopifyApiRequest.call(this, 'GET', `/orders/${orderId}.json`, {}, qs);
						responseData = responseData.order;
					}
					//https://shopify.dev/docs/admin-api/rest/reference/orders/order#index-2020-04
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const options = this.getNodeParameter('options', i) as IDataObject;
						if (options.fields) {
							qs.fields = options.fields as string;
						}
						if (options.attributionAppId) {
							qs.attribution_app_id = options.attributionAppId as string;
						}
						if (options.createdAtMin) {
							qs.created_at_min = options.createdAtMin as string;
						}
						if (options.createdAtMax) {
							qs.created_at_max = options.createdAtMax as string;
						}
						if (options.updatedAtMax) {
							qs.updated_at_max = options.updatedAtMax as string;
						}
						if (options.updatedAtMin) {
							qs.updated_at_min = options.updatedAtMin as string;
						}
						if (options.processedAtMin) {
							qs.processed_at_min = options.processedAtMin as string;
						}
						if (options.processedAtMax) {
							qs.processed_at_max = options.processedAtMax as string;
						}
						if (options.sinceId) {
							qs.since_id = options.sinceId as string;
						}
						if (options.ids) {
							qs.ids = options.ids as string;
						}
						if (options.status) {
							qs.status = options.status as string;
						}
						if (options.financialStatus) {
							qs.financial_status = options.financialStatus as string;
						}
						if (options.fulfillmentStatus) {
							qs.fulfillment_status = options.fulfillmentStatus as string;
						}

						if (returnAll === true) {
							responseData = await shopifyApiRequestAllItems.call(this, 'orders', 'GET', '/orders.json', {}, qs);
						} else {
							qs.limit = this.getNodeParameter('limit', i) as number;
							responseData = await shopifyApiRequest.call(this, 'GET', '/orders.json', {}, qs);
							responseData = responseData.orders;
						}
					}
					//https://shopify.dev/docs/admin-api/rest/reference/orders/order#update-2019-10
					if (operation === 'update') {
						const orderId = this.getNodeParameter('orderId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
						const shipping = updateFields.shippingAddressUi as IDataObject;
						const body: IOrder = {};
						if (updateFields.locationId) {
							body.location_id = updateFields.locationId as number;
						}
						if (updateFields.note) {
							body.note = updateFields.note as string;
						}
						if (updateFields.sourceName) {
							body.source_name = updateFields.sourceName as string;
						}
						if (updateFields.tags) {
							body.tags = updateFields.tags as string;
						}
						if (updateFields.email) {
							body.email = updateFields.email as string;
						}
						if (shipping) {
							body.shipping_address = keysToSnakeCase(shipping.shippingAddressValues as IDataObject)[0] as IAddress;
						}
						responseData = await shopifyApiRequest.call(this, 'PUT', `/orders/${orderId}.json`, { order: body });
						responseData = responseData.order;
					}
				} else if (resource === 'product') {
					const productId = this.getNodeParameter('productId', i, '') as string;
					let body: IProduct = {};
					//https://shopify.dev/docs/admin-api/rest/reference/products/product#create-2020-04
					if (operation === 'create') {
						const title = this.getNodeParameter('title', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

						if (additionalFields.productOptions) {
							const metadata = (additionalFields.productOptions as IDataObject).option as IDataObject[];
							additionalFields.options = {};
							for (const data of metadata) {
								//@ts-ignore
								additionalFields.options[data.name as string] = data.value;
							}
							delete additionalFields.productOptions;
						}

						body = additionalFields;

						body.title = title;

						responseData = await shopifyApiRequest.call(this, 'POST', '/products.json', { product: body });
						responseData = responseData.product;
					}
					if (operation === 'delete') {
						//https://shopify.dev/docs/admin-api/rest/reference/products/product#destroy-2020-04
						responseData = await shopifyApiRequest.call(this, 'DELETE', `/products/${productId}.json`);
						responseData = { success: true };
					}
					if (operation === 'get') {
						//https://shopify.dev/docs/admin-api/rest/reference/products/product#show-2020-04
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
						Object.assign(qs, additionalFields);
						responseData = await shopifyApiRequest.call(this, 'GET', `/products/${productId}.json`, {}, qs);
						responseData = responseData.product;
					}
					if (operation === 'getAll') {
						//https://shopify.dev/docs/admin-api/rest/reference/products/product#index-2020-04
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						Object.assign(qs, additionalFields);

						if (returnAll === true) {
							responseData = await shopifyApiRequestAllItems.call(this, 'products', 'GET', '/products.json', {}, qs);
						} else {
							qs.limit = this.getNodeParameter('limit', i) as number;
							responseData = await shopifyApiRequest.call(this, 'GET', '/products.json', {}, qs);
							responseData = responseData.products;
						}
					}
					if (operation === 'update') {
						//https://shopify.dev/docs/admin-api/rest/reference/products/product?api[version]=2020-07#update-2020-07
						const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;

						if (updateFields.productOptions) {
							const metadata = (updateFields.productOptions as IDataObject).option as IDataObject[];
							updateFields.options = {};
							for (const data of metadata) {
								//@ts-ignore
								updateFields.options[data.name as string] = data.value;
							}
							delete updateFields.productOptions;
						}

						body = updateFields;

						responseData = await shopifyApiRequest.call(this, 'PUT', `/products/${productId}.json`, { product: body });

						responseData = responseData.product;
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
