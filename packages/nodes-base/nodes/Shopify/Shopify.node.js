import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { keysToSnakeCase, shopifyApiRequest, shopifyApiRequestAllItems } from './GenericFunctions';
import { orderFields, orderOperations } from './OrderDescription';
import { productFields, productOperations } from './ProductDescription';
export class Shopify {
    description = {
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
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
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
        properties: [
            {
                displayName: 'Shopify API Version: 2024-07',
                type: 'notice',
                name: 'apiVersion',
                default: '',
                isNodeSetting: true,
            },
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
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
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
            // Get all the available products to display them to user so that they can
            // select them easily
            async getProducts() {
                const returnData = [];
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
            // Get all the available locations to display them to user so that they can
            // select them easily
            async getLocations() {
                const returnData = [];
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
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        let responseData;
        const qs = {};
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            try {
                if (resource === 'order') {
                    //https://shopify.dev/docs/admin-api/rest/reference/orders/order#create-2020-04
                    if (operation === 'create') {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const discount = additionalFields.discountCodesUi;
                        const billing = additionalFields.billingAddressUi;
                        const shipping = additionalFields.shippingAddressUi;
                        const lineItem = this.getNodeParameter('limeItemsUi', i)
                            .lineItemValues;
                        if (lineItem === undefined) {
                            throw new NodeOperationError(this.getNode(), 'At least one line item has to be added', { itemIndex: i });
                        }
                        const body = {
                            test: true,
                            line_items: keysToSnakeCase(lineItem),
                        };
                        if (additionalFields.fulfillmentStatus) {
                            body.fulfillment_status = additionalFields.fulfillmentStatus;
                        }
                        if (additionalFields.inventoryBehaviour) {
                            body.inventory_behaviour = additionalFields.inventoryBehaviour;
                        }
                        if (additionalFields.locationId) {
                            body.location_id = additionalFields.locationId;
                        }
                        if (additionalFields.note) {
                            body.note = additionalFields.note;
                        }
                        if (additionalFields.sendFulfillmentReceipt) {
                            body.send_fulfillment_receipt = additionalFields.sendFulfillmentReceipt;
                        }
                        if (additionalFields.sendReceipt) {
                            body.send_receipt = additionalFields.sendReceipt;
                        }
                        if (additionalFields.sendReceipt) {
                            body.send_receipt = additionalFields.sendReceipt;
                        }
                        if (additionalFields.sourceName) {
                            body.source_name = additionalFields.sourceName;
                        }
                        if (additionalFields.tags) {
                            body.tags = additionalFields.tags;
                        }
                        if (additionalFields.test) {
                            body.test = additionalFields.test;
                        }
                        if (additionalFields.email) {
                            body.email = additionalFields.email;
                        }
                        if (discount) {
                            body.discount_codes = discount.discountCodesValues;
                        }
                        if (billing) {
                            body.billing_address = keysToSnakeCase(billing.billingAddressValues)[0];
                        }
                        if (shipping) {
                            body.shipping_address = keysToSnakeCase(shipping.shippingAddressValues)[0];
                        }
                        responseData = await shopifyApiRequest.call(this, 'POST', '/orders.json', {
                            order: body,
                        });
                        responseData = responseData.order;
                    }
                    //https://shopify.dev/docs/admin-api/rest/reference/orders/order#destroy-2020-04
                    if (operation === 'delete') {
                        const orderId = this.getNodeParameter('orderId', i);
                        responseData = await shopifyApiRequest.call(this, 'DELETE', `/orders/${orderId}.json`);
                        responseData = { success: true };
                    }
                    //https://shopify.dev/docs/admin-api/rest/reference/orders/order#show-2020-04
                    if (operation === 'get') {
                        const orderId = this.getNodeParameter('orderId', i);
                        const options = this.getNodeParameter('options', i);
                        if (options.fields) {
                            qs.fields = options.fields;
                        }
                        responseData = await shopifyApiRequest.call(this, 'GET', `/orders/${orderId}.json`, {}, qs);
                        responseData = responseData.order;
                    }
                    //https://shopify.dev/docs/admin-api/rest/reference/orders/order#index-2020-04
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const options = this.getNodeParameter('options', i);
                        if (options.fields) {
                            qs.fields = options.fields;
                        }
                        if (options.attributionAppId) {
                            qs.attribution_app_id = options.attributionAppId;
                        }
                        if (options.createdAtMin) {
                            qs.created_at_min = options.createdAtMin;
                        }
                        if (options.createdAtMax) {
                            qs.created_at_max = options.createdAtMax;
                        }
                        if (options.updatedAtMax) {
                            qs.updated_at_max = options.updatedAtMax;
                        }
                        if (options.updatedAtMin) {
                            qs.updated_at_min = options.updatedAtMin;
                        }
                        if (options.processedAtMin) {
                            qs.processed_at_min = options.processedAtMin;
                        }
                        if (options.processedAtMax) {
                            qs.processed_at_max = options.processedAtMax;
                        }
                        if (options.sinceId) {
                            qs.since_id = options.sinceId;
                        }
                        if (options.ids) {
                            qs.ids = options.ids;
                        }
                        if (options.status) {
                            qs.status = options.status;
                        }
                        if (options.financialStatus) {
                            qs.financial_status = options.financialStatus;
                        }
                        if (options.fulfillmentStatus) {
                            qs.fulfillment_status = options.fulfillmentStatus;
                        }
                        if (returnAll) {
                            responseData = await shopifyApiRequestAllItems.call(this, 'orders', 'GET', '/orders.json', {}, qs);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            responseData = await shopifyApiRequest.call(this, 'GET', '/orders.json', {}, qs);
                            responseData = responseData.orders;
                        }
                    }
                    //https://shopify.dev/docs/admin-api/rest/reference/orders/order#update-2019-10
                    if (operation === 'update') {
                        const orderId = this.getNodeParameter('orderId', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const shipping = updateFields.shippingAddressUi;
                        const body = {};
                        if (updateFields.locationId) {
                            body.location_id = updateFields.locationId;
                        }
                        if (updateFields.note) {
                            body.note = updateFields.note;
                        }
                        if (updateFields.sourceName) {
                            body.source_name = updateFields.sourceName;
                        }
                        if (updateFields.tags) {
                            body.tags = updateFields.tags;
                        }
                        if (updateFields.email) {
                            body.email = updateFields.email;
                        }
                        if (shipping) {
                            body.shipping_address = keysToSnakeCase(shipping.shippingAddressValues)[0];
                        }
                        responseData = await shopifyApiRequest.call(this, 'PUT', `/orders/${orderId}.json`, {
                            order: body,
                        });
                        responseData = responseData.order;
                    }
                }
                else if (resource === 'product') {
                    const productId = this.getNodeParameter('productId', i, '');
                    let body = {};
                    //https://shopify.dev/docs/admin-api/rest/reference/products/product#create-2020-04
                    if (operation === 'create') {
                        const title = this.getNodeParameter('title', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i, {});
                        if (additionalFields.productOptions) {
                            const metadata = additionalFields.productOptions
                                .option;
                            additionalFields.options = {};
                            for (const data of metadata) {
                                //@ts-ignore
                                additionalFields.options[data.name] = data.value;
                            }
                            delete additionalFields.productOptions;
                        }
                        body = additionalFields;
                        body.title = title;
                        responseData = await shopifyApiRequest.call(this, 'POST', '/products.json', {
                            product: body,
                        });
                        responseData = responseData.product;
                    }
                    if (operation === 'delete') {
                        //https://shopify.dev/docs/admin-api/rest/reference/products/product#destroy-2020-04
                        responseData = await shopifyApiRequest.call(this, 'DELETE', `/products/${productId}.json`);
                        responseData = { success: true };
                    }
                    if (operation === 'get') {
                        //https://shopify.dev/docs/admin-api/rest/reference/products/product#show-2020-04
                        const additionalFields = this.getNodeParameter('additionalFields', i, {});
                        Object.assign(qs, additionalFields);
                        responseData = await shopifyApiRequest.call(this, 'GET', `/products/${productId}.json`, {}, qs);
                        responseData = responseData.product;
                    }
                    if (operation === 'getAll') {
                        //https://shopify.dev/docs/admin-api/rest/reference/products/product#index-2020-04
                        const additionalFields = this.getNodeParameter('additionalFields', i, {});
                        const returnAll = this.getNodeParameter('returnAll', i);
                        Object.assign(qs, additionalFields);
                        if (returnAll) {
                            responseData = await shopifyApiRequestAllItems.call(this, 'products', 'GET', '/products.json', {}, qs);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', i);
                            responseData = await shopifyApiRequest.call(this, 'GET', '/products.json', {}, qs);
                            responseData = responseData.products;
                        }
                    }
                    if (operation === 'update') {
                        //https://shopify.dev/docs/admin-api/rest/reference/products/product?api[version]=2020-07#update-2020-07
                        const updateFields = this.getNodeParameter('updateFields', i, {});
                        if (updateFields.productOptions) {
                            const metadata = updateFields.productOptions.option;
                            updateFields.options = {};
                            for (const data of metadata) {
                                //@ts-ignore
                                updateFields.options[data.name] = data.value;
                            }
                            delete updateFields.productOptions;
                        }
                        body = updateFields;
                        responseData = await shopifyApiRequest.call(this, 'PUT', `/products/${productId}.json`, { product: body });
                        responseData = responseData.product;
                    }
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                    returnData.push(...executionErrorData);
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=Shopify.node.js.map