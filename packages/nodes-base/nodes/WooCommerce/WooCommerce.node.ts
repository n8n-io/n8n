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
} from 'n8n-workflow';
import {
	adjustMetadata,
	setFields,
	setMetadata,
	toSnakeCase,
	woocommerceApiRequest,
	woocommerceApiRequestAllItems,
} from './GenericFunctions';
import {
	productFields,
	productOperations,
} from './ProductDescription';
import {
	orderFields,
	orderOperations,
} from './OrderDescription';
import {
	IDimension,
	IImage,
	IProduct,
} from './ProductInterface';
import {
	IAddress,
	ICouponLine,
	IFeeLine,
	ILineItem,
	IOrder,
	IShoppingLine,
} from './OrderInterface';

import {
	customerFields,
	customerOperations,
} from './descriptions';

export class WooCommerce implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WooCommerce',
		name: 'wooCommerce',
		icon: 'file:wooCommerce.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume WooCommerce API',
		defaults: {
			name: 'WooCommerce',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'wooCommerceApi',
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
						name: 'Customer',
						value: 'customer',
					},
					{
						name: 'Order',
						value: 'order',
					},
					{
						name: 'Product',
						value: 'product',
					},
				],
				default: 'product',
				description: 'Resource to consume.',
			},
			...customerOperations,
			...customerFields,
			...productOperations,
			...productFields,
			...orderOperations,
			...orderFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available categories to display them to user so that he can
			// select them easily
			async getCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const categories = await woocommerceApiRequestAllItems.call(this, 'GET', '/products/categories', {});
				for (const category of categories) {
					const categoryName = category.name;
					const categoryId = category.id;
					returnData.push({
						name: categoryName,
						value: categoryId,
					});
				}
				return returnData;
			},
			// Get all the available tags to display them to user so that he can
			// select them easily
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const tags = await woocommerceApiRequestAllItems.call(this, 'GET', '/products/tags', {});
				for (const tag of tags) {
					const tagName = tag.name;
					const tagId = tag.id;
					returnData.push({
						name: tagName,
						value: tagId,
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

			if (resource === 'customer') {

				// **********************************************************************
				//                                customer
				// **********************************************************************

				// https://woocommerce.github.io/woocommerce-rest-api-docs/?shell#customer-properties

				if (operation === 'create') {

					// ----------------------------------------
					//             customer: create
					// ----------------------------------------

					// https://woocommerce.github.io/woocommerce-rest-api-docs/?javascript#create-a-customer

					const body = {
						email: this.getNodeParameter('email', i),
					} as IDataObject;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (Object.keys(additionalFields).length) {
						Object.assign(body, adjustMetadata(additionalFields));
					}

					responseData = await woocommerceApiRequest.call(this, 'POST', '/customers', body);

				} else if (operation === 'delete') {

					// ----------------------------------------
					//             customer: delete
					// ----------------------------------------

					// https://woocommerce.github.io/woocommerce-rest-api-docs/?javascript#delete-a-customer

					const customerId = this.getNodeParameter('customerId', i);

					const qs: IDataObject = {
						force: true, // required, customers do not support trashing
					};

					const endpoint = `/customers/${customerId}`;
					responseData = await woocommerceApiRequest.call(this, 'DELETE', endpoint, {}, qs);

				} else if (operation === 'get') {

					// ----------------------------------------
					//              customer: get
					// ----------------------------------------

					// https://woocommerce.github.io/woocommerce-rest-api-docs/?javascript#retrieve-a-customer

					const customerId = this.getNodeParameter('customerId', i);

					const endpoint = `/customers/${customerId}`;
					responseData = await woocommerceApiRequest.call(this, 'GET', endpoint);

				} else if (operation === 'getAll') {

					// ----------------------------------------
					//             customer: getAll
					// ----------------------------------------

					// https://woocommerce.github.io/woocommerce-rest-api-docs/?javascript#list-all-customers

					const qs = {} as IDataObject;
					const filters = this.getNodeParameter('filters', i) as IDataObject;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					if (Object.keys(filters).length) {
						Object.assign(qs, filters);
					}

					if (returnAll) {
						responseData = await woocommerceApiRequestAllItems.call(this, 'GET', '/customers', {}, qs);
					} else {
						qs.per_page = this.getNodeParameter('limit', i) as number;
						responseData = await woocommerceApiRequest.call(this, 'GET', '/customers', {}, qs);
					}

				} else if (operation === 'update') {

					// ----------------------------------------
					//             customer: update
					// ----------------------------------------

					// https://woocommerce.github.io/woocommerce-rest-api-docs/?javascript#update-a-customer

					const body = {} as IDataObject;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					if (Object.keys(updateFields).length) {
						Object.assign(body, adjustMetadata(updateFields));
					}

					const customerId = this.getNodeParameter('customerId', i);

					const endpoint = `/customers/${customerId}`;
					responseData = await woocommerceApiRequest.call(this, 'PUT', endpoint, body);

				}

			} else if (resource === 'product') {
				//https://woocommerce.github.io/woocommerce-rest-api-docs/#create-a-product
				if (operation === 'create') {
					const name = this.getNodeParameter('name', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IProduct = {
						name,
					};

					setFields(additionalFields, body);

					if (additionalFields.categories) {
						body.categories = (additionalFields.categories as string[]).map(category => ({ id: parseInt(category, 10) })) as unknown as IDataObject[];
					}

					const images = (this.getNodeParameter('imagesUi', i) as IDataObject).imagesValues as IImage[];
					if (images) {
						body.images = images;
					}
					const dimension = (this.getNodeParameter('dimensionsUi', i) as IDataObject).dimensionsValues as IDimension;
					if (dimension) {
						body.dimensions = dimension;
					}
					const metadata = (this.getNodeParameter('metadataUi', i) as IDataObject).metadataValues as IDataObject[];
					if (metadata) {
						body.meta_data = metadata;
					}
					responseData = await woocommerceApiRequest.call(this, 'POST', '/products', body);
				}
				//https://woocommerce.github.io/woocommerce-rest-api-docs/#update-a-product
				if (operation === 'update') {
					const productId = this.getNodeParameter('productId', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					const body: IProduct = {};

					setFields(updateFields, body);

					const images = (this.getNodeParameter('imagesUi', i) as IDataObject).imagesValues as IImage[];
					if (images) {
						body.images = images;
					}
					const dimension = (this.getNodeParameter('dimensionsUi', i) as IDataObject).dimensionsValues as IDimension;
					if (dimension) {
						body.dimensions = dimension;
					}
					const metadata = (this.getNodeParameter('metadataUi', i) as IDataObject).metadataValues as IDataObject[];
					if (metadata) {
						body.meta_data = metadata;
					}
					responseData = await woocommerceApiRequest.call(this, 'PUT', `/products/${productId}`, body);
				}
				//https://woocommerce.github.io/woocommerce-rest-api-docs/#retrieve-a-product
				if (operation === 'get') {
					const productId = this.getNodeParameter('productId', i) as string;
					responseData = await woocommerceApiRequest.call(this, 'GET', `/products/${productId}`, {}, qs);
				}
				//https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-products
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const options = this.getNodeParameter('options', i) as IDataObject;
					if (options.after) {
						qs.after = options.after as string;
					}
					if (options.before) {
						qs.before = options.before as string;
					}
					if (options.category) {
						qs.category = options.category as string;
					}
					if (options.context) {
						qs.context = options.context as string;
					}
					if (options.featured) {
						qs.featured = options.featured as boolean;
					}
					if (options.maxPrice) {
						qs.max_price = options.maxPrice as string;
					}
					if (options.minPrice) {
						qs.max_price = options.minPrice as string;
					}
					if (options.order) {
						qs.order = options.order as string;
					}
					if (options.orderBy) {
						qs.orderby = options.orderBy as string;
					}
					if (options.search) {
						qs.search = options.search as string;
					}
					if (options.sku) {
						qs.sku = options.sku as string;
					}
					if (options.slug) {
						qs.slug = options.slug as string;
					}
					if (options.status) {
						qs.status = options.status as string;
					}
					if (options.stockStatus) {
						qs.stock_status = options.stockStatus as string;
					}
					if (options.tag) {
						qs.tag = options.tag as string;
					}
					if (options.taxClass) {
						qs.tax_class = options.taxClass as string;
					}
					if (options.type) {
						qs.type = options.type as string;
					}
					if (returnAll === true) {
						responseData = await woocommerceApiRequestAllItems.call(this, 'GET', '/products', {}, qs);
					} else {
						qs.per_page = this.getNodeParameter('limit', i) as number;
						responseData = await woocommerceApiRequest.call(this, 'GET', '/products', {}, qs);
					}
				}
				//https://woocommerce.github.io/woocommerce-rest-api-docs/#delete-a-product
				if (operation === 'delete') {
					const productId = this.getNodeParameter('productId', i) as string;
					responseData = await woocommerceApiRequest.call(this, 'DELETE', `/products/${productId}`, {}, { force: true });
				}
			}
			if (resource === 'order') {
				//https://woocommerce.github.io/woocommerce-rest-api-docs/#create-an-order
				if (operation === 'create') {
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IOrder = {};

					setFields(additionalFields, body);

					const billing = (this.getNodeParameter('billingUi', i) as IDataObject).billingValues as IAddress;
					if (billing !== undefined) {
						body.billing = billing;
						toSnakeCase(billing as IDataObject);
					}
					const shipping = (this.getNodeParameter('shippingUi', i) as IDataObject).shippingValues as IAddress;
					if (shipping !== undefined) {
						body.shipping = shipping;
						toSnakeCase(shipping as IDataObject);
					}
					const couponLines = (this.getNodeParameter('couponLinesUi', i) as IDataObject).couponLinesValues as ICouponLine[];
					if (couponLines) {
						body.coupon_lines = couponLines;
						setMetadata(couponLines);
						toSnakeCase(couponLines);
					}
					const feeLines = (this.getNodeParameter('feeLinesUi', i) as IDataObject).feeLinesValues as IFeeLine[];
					if (feeLines) {
						body.fee_lines = feeLines;
						setMetadata(feeLines);
						toSnakeCase(feeLines);
					}
					const lineItems = (this.getNodeParameter('lineItemsUi', i) as IDataObject).lineItemsValues as ILineItem[];
					if (lineItems) {
						body.line_items = lineItems;
						setMetadata(lineItems);
						toSnakeCase(lineItems);
						//@ts-ignore
					}
					const metadata = (this.getNodeParameter('metadataUi', i) as IDataObject).metadataValues as IDataObject[];
					if (metadata) {
						body.meta_data = metadata;
					}
					const shippingLines = (this.getNodeParameter('shippingLinesUi', i) as IDataObject).shippingLinesValues as IShoppingLine[];
					if (shippingLines) {
						body.shipping_lines = shippingLines;
						setMetadata(shippingLines);
						toSnakeCase(shippingLines);
					}
					responseData = await woocommerceApiRequest.call(this, 'POST', '/orders', body);
				}
				//https://woocommerce.github.io/woocommerce-rest-api-docs/#update-an-order
				if (operation === 'update') {
					const orderId = this.getNodeParameter('orderId', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					const body: IOrder = {};

					if (updateFields.currency) {
						body.currency = updateFields.currency as string;
					}
					if (updateFields.customerId) {
						body.customer_id = parseInt(updateFields.customerId as string, 10);
					}
					if (updateFields.customerNote) {
						body.customer_note = updateFields.customerNote as string;
					}
					if (updateFields.parentId) {
						body.parent_id = parseInt(updateFields.parentId as string, 10);
					}
					if (updateFields.paymentMethodId) {
						body.payment_method = updateFields.paymentMethodId as string;
					}
					if (updateFields.paymentMethodTitle) {
						body.payment_method_title = updateFields.paymentMethodTitle as string;
					}

					if (updateFields.status) {
						body.status = updateFields.status as string;
					}
					if (updateFields.transactionID) {
						body.transaction_id = updateFields.transactionID as string;
					}
					const billing = (this.getNodeParameter('billingUi', i) as IDataObject).billingValues as IAddress;
					if (billing !== undefined) {
						body.billing = billing;
						toSnakeCase(billing as IDataObject);
					}
					const shipping = (this.getNodeParameter('shippingUi', i) as IDataObject).shippingValues as IAddress;
					if (shipping !== undefined) {
						body.shipping = shipping;
						toSnakeCase(shipping as IDataObject);
					}
					const couponLines = (this.getNodeParameter('couponLinesUi', i) as IDataObject).couponLinesValues as ICouponLine[];
					if (couponLines) {
						body.coupon_lines = couponLines;
						setMetadata(couponLines);
						toSnakeCase(couponLines);
					}
					const feeLines = (this.getNodeParameter('feeLinesUi', i) as IDataObject).feeLinesValues as IFeeLine[];
					if (feeLines) {
						body.fee_lines = feeLines;
						setMetadata(feeLines);
						toSnakeCase(feeLines);
					}
					const lineItems = (this.getNodeParameter('lineItemsUi', i) as IDataObject).lineItemsValues as ILineItem[];
					if (lineItems) {
						body.line_items = lineItems;
						setMetadata(lineItems);
						toSnakeCase(lineItems);
					}
					const metadata = (this.getNodeParameter('metadataUi', i) as IDataObject).metadataValues as IDataObject[];
					if (metadata) {
						body.meta_data = metadata;
					}
					const shippingLines = (this.getNodeParameter('shippingLinesUi', i) as IDataObject).shippingLinesValues as IShoppingLine[];
					if (shippingLines) {
						body.shipping_lines = shippingLines;
						setMetadata(shippingLines);
						toSnakeCase(shippingLines);
					}

					responseData = await woocommerceApiRequest.call(this, 'PUT', `/orders/${orderId}`, body);
				}
				//https://woocommerce.github.io/woocommerce-rest-api-docs/#retrieve-an-order
				if (operation === 'get') {
					const orderId = this.getNodeParameter('orderId', i) as string;
					responseData = await woocommerceApiRequest.call(this, 'GET', `/orders/${orderId}`, {}, qs);
				}
				//https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-orders
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const options = this.getNodeParameter('options', i) as IDataObject;
					if (options.after) {
						qs.after = options.after as string;
					}
					if (options.before) {
						qs.before = options.before as string;
					}
					if (options.category) {
						qs.category = options.category as string;
					}
					if (options.customer) {
						qs.customer = parseInt(options.customer as string, 10);
					}
					if (options.decimalPoints) {
						qs.dp = options.decimalPoints as number;
					}
					if (options.product) {
						qs.product = parseInt(options.product as string, 10);
					}
					if (options.order) {
						qs.order = options.order as string;
					}
					if (options.orderBy) {
						qs.orderby = options.orderBy as string;
					}
					if (options.search) {
						qs.search = options.search as string;
					}
					if (options.status) {
						qs.status = options.status as string;
					}
					if (returnAll === true) {
						responseData = await woocommerceApiRequestAllItems.call(this, 'GET', '/orders', {}, qs);
					} else {
						qs.per_page = this.getNodeParameter('limit', i) as number;
						responseData = await woocommerceApiRequest.call(this, 'GET', '/orders', {}, qs);
					}
				}
				//https://woocommerce.github.io/woocommerce-rest-api-docs/#delete-an-order
				if (operation === 'delete') {
					const orderId = this.getNodeParameter('orderId', i) as string;
					responseData = await woocommerceApiRequest.call(this, 'DELETE', `/orders/${orderId}`, {}, { force: true });
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
