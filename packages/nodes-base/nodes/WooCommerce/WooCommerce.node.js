import { NodeConnectionTypes, NodeOperationError, } from 'n8n-workflow';
import { customerFields, customerOperations } from './descriptions';
import { adjustMetadata, setFields, setMetadata, toSnakeCase, woocommerceApiRequest, woocommerceApiRequestAllItems, } from './GenericFunctions';
import { orderFields, orderOperations } from './OrderDescription';
import { productFields, productOperations } from './ProductDescription';
function assertResourceId(context, id, displayName, itemIndex) {
    if (id === undefined || id === null || String(id).trim() === '') {
        throw new NodeOperationError(context.getNode(), `${displayName} must not be empty`, {
            itemIndex,
        });
    }
}
export class WooCommerce {
    description = {
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
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        usableAsTool: true,
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
                noDataExpression: true,
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
            // Get all the available categories to display them to user so that they can
            // select them easily
            async getCategories() {
                const returnData = [];
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
            // Get all the available tags to display them to user so that they can
            // select them easily
            async getTags() {
                const returnData = [];
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
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            const qs = {};
            try {
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
                        };
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        if (Object.keys(additionalFields).length) {
                            Object.assign(body, adjustMetadata(additionalFields));
                        }
                        responseData = await woocommerceApiRequest.call(this, 'POST', '/customers', body);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------------
                        //             customer: delete
                        // ----------------------------------------
                        // https://woocommerce.github.io/woocommerce-rest-api-docs/?javascript#delete-a-customer
                        const customerId = this.getNodeParameter('customerId', i);
                        assertResourceId(this, customerId, 'Customer ID', i);
                        qs.force = true; // required, customers do not support trashing
                        const endpoint = `/customers/${customerId}`;
                        responseData = await woocommerceApiRequest.call(this, 'DELETE', endpoint, {}, qs);
                    }
                    else if (operation === 'get') {
                        // ----------------------------------------
                        //              customer: get
                        // ----------------------------------------
                        // https://woocommerce.github.io/woocommerce-rest-api-docs/?javascript#retrieve-a-customer
                        const customerId = this.getNodeParameter('customerId', i);
                        assertResourceId(this, customerId, 'Customer ID', i);
                        const endpoint = `/customers/${customerId}`;
                        responseData = await woocommerceApiRequest.call(this, 'GET', endpoint);
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------------
                        //             customer: getAll
                        // ----------------------------------------
                        // https://woocommerce.github.io/woocommerce-rest-api-docs/?javascript#list-all-customers
                        const filters = this.getNodeParameter('filters', i);
                        const returnAll = this.getNodeParameter('returnAll', i);
                        if (Object.keys(filters).length) {
                            Object.assign(qs, filters);
                        }
                        if (returnAll) {
                            responseData = await woocommerceApiRequestAllItems.call(this, 'GET', '/customers', {}, {});
                        }
                        else {
                            qs.per_page = this.getNodeParameter('limit', i);
                            responseData = await woocommerceApiRequest.call(this, 'GET', '/customers', {}, qs);
                        }
                    }
                    else if (operation === 'update') {
                        // ----------------------------------------
                        //             customer: update
                        // ----------------------------------------
                        // https://woocommerce.github.io/woocommerce-rest-api-docs/?javascript#update-a-customer
                        const body = {};
                        const updateFields = this.getNodeParameter('updateFields', i);
                        if (Object.keys(updateFields).length) {
                            Object.assign(body, adjustMetadata(updateFields));
                        }
                        const customerId = this.getNodeParameter('customerId', i);
                        assertResourceId(this, customerId, 'Customer ID', i);
                        const endpoint = `/customers/${customerId}`;
                        responseData = await woocommerceApiRequest.call(this, 'PUT', endpoint, body);
                    }
                }
                else if (resource === 'product') {
                    //https://woocommerce.github.io/woocommerce-rest-api-docs/#create-a-product
                    if (operation === 'create') {
                        const name = this.getNodeParameter('name', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {
                            name,
                        };
                        setFields(additionalFields, body);
                        if (additionalFields.categories) {
                            body.categories = additionalFields.categories.map((category) => ({
                                id: parseInt(category, 10),
                            }));
                        }
                        const images = this.getNodeParameter('imagesUi', i)
                            .imagesValues;
                        if (images) {
                            body.images = images;
                        }
                        const dimension = this.getNodeParameter('dimensionsUi', i)
                            .dimensionsValues;
                        if (dimension) {
                            body.dimensions = dimension;
                        }
                        const metadata = this.getNodeParameter('metadataUi', i)
                            .metadataValues;
                        if (metadata) {
                            body.meta_data = metadata;
                        }
                        responseData = await woocommerceApiRequest.call(this, 'POST', '/products', body);
                    }
                    //https://woocommerce.github.io/woocommerce-rest-api-docs/#update-a-product
                    if (operation === 'update') {
                        const productId = this.getNodeParameter('productId', i);
                        assertResourceId(this, productId, 'Product ID', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const body = {};
                        setFields(updateFields, body);
                        const images = this.getNodeParameter('imagesUi', i)
                            .imagesValues;
                        if (images) {
                            body.images = images;
                        }
                        const dimension = this.getNodeParameter('dimensionsUi', i)
                            .dimensionsValues;
                        if (dimension) {
                            body.dimensions = dimension;
                        }
                        const metadata = this.getNodeParameter('metadataUi', i)
                            .metadataValues;
                        if (metadata) {
                            body.meta_data = metadata;
                        }
                        responseData = await woocommerceApiRequest.call(this, 'PUT', `/products/${productId}`, body);
                    }
                    //https://woocommerce.github.io/woocommerce-rest-api-docs/#retrieve-a-product
                    if (operation === 'get') {
                        const productId = this.getNodeParameter('productId', i);
                        assertResourceId(this, productId, 'Product ID', i);
                        responseData = await woocommerceApiRequest.call(this, 'GET', `/products/${productId}`, {}, qs);
                    }
                    //https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-products
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        if (options.after) {
                            qs.after = options.after;
                        }
                        if (options.before) {
                            qs.before = options.before;
                        }
                        if (options.category) {
                            qs.category = options.category;
                        }
                        if (options.context) {
                            qs.context = options.context;
                        }
                        if (options.featured) {
                            qs.featured = options.featured;
                        }
                        if (options.maxPrice) {
                            qs.max_price = options.maxPrice;
                        }
                        if (options.minPrice) {
                            qs.min_price = options.minPrice;
                        }
                        if (options.order) {
                            qs.order = options.order;
                        }
                        if (options.orderBy) {
                            qs.orderby = options.orderBy;
                        }
                        if (options.search) {
                            qs.search = options.search;
                        }
                        if (options.sku) {
                            qs.sku = options.sku;
                        }
                        if (options.slug) {
                            qs.slug = options.slug;
                        }
                        if (options.status) {
                            qs.status = options.status;
                        }
                        if (options.stockStatus) {
                            qs.stock_status = options.stockStatus;
                        }
                        if (options.tag) {
                            qs.tag = options.tag;
                        }
                        if (options.taxClass) {
                            qs.tax_class = options.taxClass;
                        }
                        if (options.type) {
                            qs.type = options.type;
                        }
                        if (returnAll) {
                            responseData = await woocommerceApiRequestAllItems.call(this, 'GET', '/products', {}, qs);
                        }
                        else {
                            qs.per_page = this.getNodeParameter('limit', i);
                            responseData = await woocommerceApiRequest.call(this, 'GET', '/products', {}, qs);
                        }
                    }
                    //https://woocommerce.github.io/woocommerce-rest-api-docs/#delete-a-product
                    if (operation === 'delete') {
                        const productId = this.getNodeParameter('productId', i);
                        assertResourceId(this, productId, 'Product ID', i);
                        responseData = await woocommerceApiRequest.call(this, 'DELETE', `/products/${productId}`, {}, { force: true });
                    }
                }
                if (resource === 'order') {
                    //https://woocommerce.github.io/woocommerce-rest-api-docs/#create-an-order
                    if (operation === 'create') {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {};
                        setFields(additionalFields, body);
                        const billing = this.getNodeParameter('billingUi', i)
                            .billingValues;
                        if (billing !== undefined) {
                            body.billing = billing;
                            toSnakeCase(billing);
                        }
                        const shipping = this.getNodeParameter('shippingUi', i)
                            .shippingValues;
                        if (shipping !== undefined) {
                            body.shipping = shipping;
                            toSnakeCase(shipping);
                        }
                        const couponLines = this.getNodeParameter('couponLinesUi', i)
                            .couponLinesValues;
                        if (couponLines) {
                            body.coupon_lines = couponLines;
                            setMetadata(couponLines);
                            toSnakeCase(couponLines);
                        }
                        const feeLines = this.getNodeParameter('feeLinesUi', i)
                            .feeLinesValues;
                        if (feeLines) {
                            body.fee_lines = feeLines;
                            setMetadata(feeLines);
                            toSnakeCase(feeLines);
                        }
                        const lineItems = this.getNodeParameter('lineItemsUi', i)
                            .lineItemsValues;
                        if (lineItems) {
                            body.line_items = lineItems;
                            setMetadata(lineItems);
                            toSnakeCase(lineItems);
                        }
                        const metadata = this.getNodeParameter('metadataUi', i)
                            .metadataValues;
                        if (metadata) {
                            body.meta_data = metadata;
                        }
                        const shippingLines = this.getNodeParameter('shippingLinesUi', i)
                            .shippingLinesValues;
                        if (shippingLines) {
                            body.shipping_lines = shippingLines;
                            setMetadata(shippingLines);
                            toSnakeCase(shippingLines);
                        }
                        responseData = await woocommerceApiRequest.call(this, 'POST', '/orders', body);
                    }
                    //https://woocommerce.github.io/woocommerce-rest-api-docs/#update-an-order
                    if (operation === 'update') {
                        const orderId = this.getNodeParameter('orderId', i);
                        assertResourceId(this, orderId, 'Order ID', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const body = {};
                        if (updateFields.currency) {
                            body.currency = updateFields.currency;
                        }
                        if (updateFields.customerId) {
                            body.customer_id = parseInt(updateFields.customerId, 10);
                        }
                        if (updateFields.customerNote) {
                            body.customer_note = updateFields.customerNote;
                        }
                        if (updateFields.parentId) {
                            body.parent_id = parseInt(updateFields.parentId, 10);
                        }
                        if (updateFields.paymentMethodId) {
                            body.payment_method = updateFields.paymentMethodId;
                        }
                        if (updateFields.paymentMethodTitle) {
                            body.payment_method_title = updateFields.paymentMethodTitle;
                        }
                        if (updateFields.status) {
                            body.status = updateFields.status;
                        }
                        if (updateFields.transactionID) {
                            body.transaction_id = updateFields.transactionID;
                        }
                        const billing = this.getNodeParameter('billingUi', i)
                            .billingValues;
                        if (billing !== undefined) {
                            body.billing = billing;
                            toSnakeCase(billing);
                        }
                        const shipping = this.getNodeParameter('shippingUi', i)
                            .shippingValues;
                        if (shipping !== undefined) {
                            body.shipping = shipping;
                            toSnakeCase(shipping);
                        }
                        const couponLines = this.getNodeParameter('couponLinesUi', i)
                            .couponLinesValues;
                        if (couponLines) {
                            body.coupon_lines = couponLines;
                            setMetadata(couponLines);
                            toSnakeCase(couponLines);
                        }
                        const feeLines = this.getNodeParameter('feeLinesUi', i)
                            .feeLinesValues;
                        if (feeLines) {
                            body.fee_lines = feeLines;
                            setMetadata(feeLines);
                            toSnakeCase(feeLines);
                        }
                        const lineItems = this.getNodeParameter('lineItemsUi', i)
                            .lineItemsValues;
                        if (lineItems) {
                            body.line_items = lineItems;
                            setMetadata(lineItems);
                            toSnakeCase(lineItems);
                        }
                        const metadata = this.getNodeParameter('metadataUi', i)
                            .metadataValues;
                        if (metadata) {
                            body.meta_data = metadata;
                        }
                        const shippingLines = this.getNodeParameter('shippingLinesUi', i)
                            .shippingLinesValues;
                        if (shippingLines) {
                            body.shipping_lines = shippingLines;
                            setMetadata(shippingLines);
                            toSnakeCase(shippingLines);
                        }
                        responseData = await woocommerceApiRequest.call(this, 'PUT', `/orders/${orderId}`, body);
                    }
                    //https://woocommerce.github.io/woocommerce-rest-api-docs/#retrieve-an-order
                    if (operation === 'get') {
                        const orderId = this.getNodeParameter('orderId', i);
                        assertResourceId(this, orderId, 'Order ID', i);
                        responseData = await woocommerceApiRequest.call(this, 'GET', `/orders/${orderId}`, {}, qs);
                    }
                    //https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-orders
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        if (options.after) {
                            qs.after = options.after;
                        }
                        if (options.before) {
                            qs.before = options.before;
                        }
                        if (options.category) {
                            qs.category = options.category;
                        }
                        if (options.customer) {
                            qs.customer = parseInt(options.customer, 10);
                        }
                        if (options.decimalPoints) {
                            qs.dp = options.decimalPoints;
                        }
                        if (options.product) {
                            qs.product = parseInt(options.product, 10);
                        }
                        if (options.order) {
                            qs.order = options.order;
                        }
                        if (options.orderBy) {
                            qs.orderby = options.orderBy;
                        }
                        if (options.search) {
                            qs.search = options.search;
                        }
                        if (options.status) {
                            qs.status = options.status;
                        }
                        if (returnAll) {
                            responseData = await woocommerceApiRequestAllItems.call(this, 'GET', '/orders', {}, qs);
                        }
                        else {
                            qs.per_page = this.getNodeParameter('limit', i);
                            responseData = await woocommerceApiRequest.call(this, 'GET', '/orders', {}, qs);
                        }
                    }
                    //https://woocommerce.github.io/woocommerce-rest-api-docs/#delete-an-order
                    if (operation === 'delete') {
                        const orderId = this.getNodeParameter('orderId', i);
                        assertResourceId(this, orderId, 'Order ID', i);
                        responseData = await woocommerceApiRequest.call(this, 'DELETE', `/orders/${orderId}`, {}, { force: true });
                    }
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push(...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } }));
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=WooCommerce.node.js.map