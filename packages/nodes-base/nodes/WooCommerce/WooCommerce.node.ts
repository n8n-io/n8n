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

export class WooCommerce implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WooCommerce',
		name: 'wooCommerce',
		icon: 'file:wooCommerce.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume WooCommerce API',
		defaults: {
			name: 'WooCommerce',
			color: '#96588a',
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
			if (resource === 'product') {
				//https://woocommerce.github.io/woocommerce-rest-api-docs/#create-a-product
				if (operation === 'create') {
					const name = this.getNodeParameter('name', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IProduct = {
						name,
					};
					if (additionalFields.backorders) {
						body.backorders = additionalFields.backorders as string;
					}
					if (additionalFields.buttonText) {
						body.button_text = additionalFields.buttonText as string;
					}
					if (additionalFields.catalogVisibility) {
						body.catalog_visibility = additionalFields.catalogVisibility as string;
					}
					if (additionalFields.categories) {
						body.categories = (additionalFields.categories as string[]).map(category => ({ id: parseInt(category, 10) })) as unknown as IDataObject[];
					}
					if (additionalFields.crossSellIds) {
						body.cross_sell_ids = (additionalFields.crossSellIds as string).split(',') as string[];
					}
					if (additionalFields.dateOnSaleFrom) {
						body.date_on_sale_from = additionalFields.dateOnSaleFrom as string;
					}
					if (additionalFields.dateOnSaleTo) {
						body.date_on_sale_to = additionalFields.dateOnSaleTo as string;
					}
					if (additionalFields.description) {
						body.description = additionalFields.description as string;
					}
					if (additionalFields.downloadable) {
						body.downloadable = additionalFields.downloadable as boolean;
					}
					if (additionalFields.externalUrl) {
						body.external_url = additionalFields.externalUrl as string;
					}
					if (additionalFields.featured) {
						body.featured = additionalFields.featured as boolean;
					}
					if (additionalFields.manageStock) {
						body.manage_stock = additionalFields.manageStock as boolean;
					}
					if (additionalFields.parentId) {
						body.parent_id = additionalFields.parentId as string;
					}
					if (additionalFields.purchaseNote) {
						body.purchase_note = additionalFields.purchaseNote as string;
					}
					if (additionalFields.regularPrice) {
						body.regular_price = additionalFields.regularPrice as string;
					}
					if (additionalFields.reviewsAllowed) {
						body.reviews_allowed = additionalFields.reviewsAllowed as boolean;
					}
					if (additionalFields.salePrice) {
						body.sale_price = additionalFields.salePrice as string;
					}
					if (additionalFields.shippingClass) {
						body.shipping_class = additionalFields.shippingClass as string;
					}
					if (additionalFields.shortDescription) {
						body.short_description = additionalFields.shortDescription as string;
					}
					if (additionalFields.sku) {
						body.sku = additionalFields.sku as string;
					}
					if (additionalFields.slug) {
						body.slug = additionalFields.slug as string;
					}
					if (additionalFields.soldIndividually) {
						body.sold_individually = additionalFields.soldIndividually as boolean;
					}
					if (additionalFields.status) {
						body.status = additionalFields.status as string;
					}
					if (additionalFields.stockQuantity) {
						body.stock_quantity = additionalFields.stockQuantity as number;
					}
					if (additionalFields.stockStatus) {
						body.stock_status = additionalFields.stockStatus as string;
					}
					if (additionalFields.tags) {
						body.tags = (additionalFields.tags as string[]).map(tag => ({ 'id': parseInt(tag, 10) })) as unknown as IDataObject[];
					}
					if (additionalFields.taxClass) {
						body.tax_class = additionalFields.taxClass as string;
					}
					if (additionalFields.taxStatus) {
						body.tax_status = additionalFields.taxStatus as string;
					}
					if (additionalFields.type) {
						body.type = additionalFields.type as string;
					}
					if (additionalFields.upsellIds) {
						body.upsell_ids = (additionalFields.upsellIds as string).split(',') as string[];
					}
					if (additionalFields.virtual) {
						body.virtual = additionalFields.virtual as boolean;
					}
					if (additionalFields.weight) {
						body.weight = additionalFields.weight as string;
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
					if (updateFields.name) {
						body.name = updateFields.name as string;
					}
					if (updateFields.backorders) {
						body.backorders = updateFields.backorders as string;
					}
					if (updateFields.buttonText) {
						body.button_text = updateFields.buttonText as string;
					}
					if (updateFields.catalogVisibility) {
						body.catalog_visibility = updateFields.catalogVisibility as string;
					}
					if (updateFields.categories) {
						body.categories = (updateFields.categories as string[]).map(category => ({ id: parseInt(category, 10) })) as unknown as IDataObject[];
					}
					if (updateFields.crossSellIds) {
						body.cross_sell_ids = (updateFields.crossSellIds as string).split(',') as string[];
					}
					if (updateFields.dateOnSaleFrom) {
						body.date_on_sale_from = updateFields.dateOnSaleFrom as string;
					}
					if (updateFields.dateOnSaleTo) {
						body.date_on_sale_to = updateFields.dateOnSaleTo as string;
					}
					if (updateFields.description) {
						body.description = updateFields.description as string;
					}
					if (updateFields.downloadable) {
						body.downloadable = updateFields.downloadable as boolean;
					}
					if (updateFields.externalUrl) {
						body.external_url = updateFields.externalUrl as string;
					}
					if (updateFields.featured) {
						body.featured = updateFields.featured as boolean;
					}
					if (updateFields.manageStock) {
						body.manage_stock = updateFields.manageStock as boolean;
					}
					if (updateFields.parentId) {
						body.parent_id = updateFields.parentId as string;
					}
					if (updateFields.purchaseNote) {
						body.purchase_note = updateFields.purchaseNote as string;
					}
					if (updateFields.regularPrice) {
						body.regular_price = updateFields.regularPrice as string;
					}
					if (updateFields.reviewsAllowed) {
						body.reviews_allowed = updateFields.reviewsAllowed as boolean;
					}
					if (updateFields.salePrice) {
						body.sale_price = updateFields.salePrice as string;
					}
					if (updateFields.shippingClass) {
						body.shipping_class = updateFields.shippingClass as string;
					}
					if (updateFields.shortDescription) {
						body.short_description = updateFields.shortDescription as string;
					}
					if (updateFields.sku) {
						body.sku = updateFields.sku as string;
					}
					if (updateFields.slug) {
						body.slug = updateFields.slug as string;
					}
					if (updateFields.soldIndividually) {
						body.sold_individually = updateFields.soldIndividually as boolean;
					}
					if (updateFields.status) {
						body.status = updateFields.status as string;
					}
					if (updateFields.stockQuantity) {
						body.stock_quantity = updateFields.stockQuantity as number;
					}
					if (updateFields.stockStatus) {
						body.stock_status = updateFields.stockStatus as string;
					}
					if (updateFields.tags) {
						body.tags = (updateFields.tags as string[]).map(tag => ({ id: parseInt(tag, 10) })) as unknown as IDataObject[];
					}
					if (updateFields.taxClass) {
						body.tax_class = updateFields.taxClass as string;
					}
					if (updateFields.taxStatus) {
						body.tax_status = updateFields.taxStatus as string;
					}
					if (updateFields.type) {
						body.type = updateFields.type as string;
					}
					if (updateFields.upsellIds) {
						body.upsell_ids = (updateFields.upsellIds as string).split(',') as string[];
					}
					if (updateFields.virtual) {
						body.virtual = updateFields.virtual as boolean;
					}
					if (updateFields.weight) {
						body.weight = updateFields.weight as string;
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
					responseData = await woocommerceApiRequest.call(this, 'PUT', `/products/${productId}`, body);
				}
				//https://woocommerce.github.io/woocommerce-rest-api-docs/#retrieve-a-product
				if (operation === 'get') {
					const productId = this.getNodeParameter('productId', i) as string;
					responseData = await woocommerceApiRequest.call(this,'GET', `/products/${productId}`, {}, qs);
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
						qs.stock_status	 = options.stockStatus as string;
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
					responseData = await woocommerceApiRequest.call(this,'DELETE', `/products/${productId}`, {}, { force: true });
				}
			}
			if (resource === 'order') {
				//https://woocommerce.github.io/woocommerce-rest-api-docs/#create-an-order
				if (operation === 'create') {
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: IOrder = {};
					if (additionalFields.currency) {
						body.currency = additionalFields.currency as string;
					}
					if (additionalFields.customerId) {
						body.customer_id = parseInt(additionalFields.customerId as string, 10);
					}
					if (additionalFields.customerNote) {
						body.customer_note = additionalFields.customerNote as string;
					}
					if (additionalFields.parentId) {
						body.parent_id = parseInt(additionalFields.parentId as string, 10);
					}
					if (additionalFields.paymentMethodId) {
						body.payment_method = additionalFields.paymentMethodId as string;
					}
					if (additionalFields.paymentMethodTitle) {
						body.payment_method_title = additionalFields.paymentMethodTitle as string;
					}
					if (additionalFields.setPaid) {
						body.set_paid = additionalFields.setPaid as boolean;
					}
					if (additionalFields.status) {
						body.status = additionalFields.status as string;
					}
					if (additionalFields.transactionID) {
						body.transaction_id = additionalFields.transactionID as string;
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
					responseData = await woocommerceApiRequest.call(this,'GET', `/orders/${orderId}`, {}, qs);
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
					responseData = await woocommerceApiRequest.call(this,'DELETE', `/orders/${orderId}`, {}, { force: true });
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
