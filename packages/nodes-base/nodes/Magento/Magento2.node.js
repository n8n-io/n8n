import { capitalCase } from 'change-case';
import { NodeConnectionTypes, NodeApiError } from 'n8n-workflow';
import { customerFields, customerOperations } from './CustomerDescription';
import { adjustAddresses, getFilterQuery, getOrderFields, getProductAttributes, magentoApiRequest, magentoApiRequestAllItems, sort, validateJSON, } from './GenericFunctions';
import { invoiceFields, invoiceOperations } from './InvoiceDescription';
import { orderFields, orderOperations } from './OrderDescription';
import { productFields, productOperations } from './ProductDescription';
export class Magento2 {
    description = {
        displayName: 'Magento 2',
        name: 'magento2',
        icon: 'file:magento.svg',
        group: ['input'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Magento API',
        defaults: {
            name: 'Magento 2',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'magento2Api',
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
                        name: 'Invoice',
                        value: 'invoice',
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
                default: 'customer',
            },
            ...customerOperations,
            ...customerFields,
            ...invoiceOperations,
            ...invoiceFields,
            ...orderOperations,
            ...orderFields,
            ...productOperations,
            ...productFields,
        ],
    };
    methods = {
        loadOptions: {
            async getCountries() {
                //https://magento.redoc.ly/2.3.7-admin/tag/directorycountries
                const countries = await magentoApiRequest.call(this, 'GET', '/rest/default/V1/directory/countries');
                const returnData = [];
                for (const country of countries) {
                    returnData.push({
                        name: country.full_name_english,
                        value: country.id,
                    });
                }
                returnData.sort(sort);
                return returnData;
            },
            async getGroups() {
                //https://magento.redoc.ly/2.3.7-admin/tag/customerGroupsdefault#operation/customerGroupManagementV1GetDefaultGroupGet
                const group = await magentoApiRequest.call(this, 'GET', '/rest/default/V1/customerGroups/default');
                const returnData = [];
                returnData.push({
                    name: group.code,
                    value: group.id,
                });
                returnData.sort(sort);
                return returnData;
            },
            async getStores() {
                //https://magento.redoc.ly/2.3.7-admin/tag/storestoreConfigs
                const stores = await magentoApiRequest.call(this, 'GET', '/rest/default/V1/store/storeConfigs');
                const returnData = [];
                for (const store of stores) {
                    returnData.push({
                        name: store.base_url,
                        value: store.id,
                    });
                }
                returnData.sort(sort);
                return returnData;
            },
            async getWebsites() {
                //https://magento.redoc.ly/2.3.7-admin/tag/storewebsites
                const websites = await magentoApiRequest.call(this, 'GET', '/rest/default/V1/store/websites');
                const returnData = [];
                for (const website of websites) {
                    returnData.push({
                        name: website.name,
                        value: website.id,
                    });
                }
                returnData.sort(sort);
                return returnData;
            },
            async getCustomAttributes() {
                //https://magento.redoc.ly/2.3.7-admin/tag/attributeMetadatacustomer#operation/customerCustomerMetadataV1GetAllAttributesMetadataGet
                const resource = this.getCurrentNodeParameter('resource');
                const attributes = (await magentoApiRequest.call(this, 'GET', `/rest/default/V1/attributeMetadata/${resource}`));
                const returnData = [];
                for (const attribute of attributes) {
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-boolean-literal-compare
                    if (attribute.system === false && attribute.frontend_label !== '') {
                        returnData.push({
                            name: attribute.frontend_label,
                            value: attribute.attribute_code,
                        });
                    }
                }
                returnData.sort(sort);
                return returnData;
            },
            async getSystemAttributes() {
                //https://magento.redoc.ly/2.3.7-admin/tag/attributeMetadatacustomer#operation/customerCustomerMetadataV1GetAllAttributesMetadataGet
                const resource = this.getCurrentNodeParameter('resource');
                const attributes = (await magentoApiRequest.call(this, 'GET', `/rest/default/V1/attributeMetadata/${resource}`));
                const returnData = [];
                for (const attribute of attributes) {
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-boolean-literal-compare
                    if (attribute.system === true && attribute.frontend_label !== null) {
                        returnData.push({
                            name: attribute.frontend_label,
                            value: attribute.attribute_code,
                        });
                    }
                }
                returnData.sort(sort);
                return returnData;
            },
            async getProductTypes() {
                //https://magento.redoc.ly/2.3.7-admin/tag/productslinkstypes
                const types = (await magentoApiRequest.call(this, 'GET', '/rest/default/V1/products/types'));
                const returnData = [];
                for (const type of types) {
                    returnData.push({
                        name: type.label,
                        value: type.name,
                    });
                }
                returnData.sort(sort);
                return returnData;
            },
            async getCategories() {
                //https://magento.redoc.ly/2.3.7-admin/tag/categories#operation/catalogCategoryManagementV1GetTreeGet
                const { items: categories } = (await magentoApiRequest.call(this, 'GET', '/rest/default/V1/categories/list', {}, {
                    search_criteria: {
                        filter_groups: [
                            {
                                filters: [
                                    {
                                        field: 'is_active',
                                        condition_type: 'eq',
                                        value: 1,
                                    },
                                ],
                            },
                        ],
                    },
                }));
                const returnData = [];
                for (const category of categories) {
                    returnData.push({
                        name: category.name,
                        value: category.id,
                    });
                }
                returnData.sort(sort);
                return returnData;
            },
            async getAttributeSets() {
                //https://magento.redoc.ly/2.3.7-admin/tag/productsattribute-setssetslist#operation/catalogAttributeSetRepositoryV1GetListGet
                const { items: attributeSets } = (await magentoApiRequest.call(this, 'GET', '/rest/default/V1/products/attribute-sets/sets/list', {}, {
                    search_criteria: 0,
                }));
                const returnData = [];
                for (const attributeSet of attributeSets) {
                    returnData.push({
                        name: attributeSet.attribute_set_name,
                        value: attributeSet.attribute_set_id,
                    });
                }
                returnData.sort(sort);
                return returnData;
            },
            async getFilterableCustomerAttributes() {
                return await getProductAttributes.call(this, (attribute) => attribute.is_filterable);
            },
            async getProductAttributes() {
                return await getProductAttributes.call(this);
            },
            // async getProductAttributesFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
            // 	return getProductAttributes.call(this, undefined, { name: '*', value: '*', description: 'All properties' });
            // },
            async getFilterableProductAttributes() {
                return await getProductAttributes.call(this, (attribute) => attribute.is_searchable === '1');
            },
            async getSortableProductAttributes() {
                return await getProductAttributes.call(this, (attribute) => attribute.used_for_sort_by);
            },
            async getOrderAttributes() {
                return getOrderFields()
                    .map((field) => ({ name: capitalCase(field), value: field }))
                    .sort(sort);
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
            try {
                if (resource === 'customer') {
                    if (operation === 'create') {
                        // https://magento.redoc.ly/2.3.7-admin/tag/customerscustomerId#operation/customerCustomerRepositoryV1SavePut
                        const email = this.getNodeParameter('email', i);
                        const firstname = this.getNodeParameter('firstname', i);
                        const lastname = this.getNodeParameter('lastname', i);
                        const { addresses, customAttributes, password, ...rest } = this.getNodeParameter('additionalFields', i);
                        const body = {
                            customer: {
                                email,
                                firstname,
                                lastname,
                            },
                        };
                        body.customer.addresses = adjustAddresses(addresses?.address || []);
                        body.customer.custom_attributes = customAttributes?.customAttribute || [];
                        body.customer.extension_attributes = [
                            'amazon_id',
                            'is_subscribed',
                            'vertex_customer_code',
                            'vertex_customer_country',
                        ].reduce((obj, value) => {
                            if (rest.hasOwnProperty(value)) {
                                const data = Object.assign(obj, { [value]: rest[value] });
                                delete rest[value];
                                return data;
                            }
                            else {
                                return obj;
                            }
                        }, {});
                        if (password) {
                            body.password = password;
                        }
                        Object.assign(body.customer, rest);
                        responseData = await magentoApiRequest.call(this, 'POST', '/rest/V1/customers', body);
                    }
                    if (operation === 'delete') {
                        //https://magento.redoc.ly/2.3.7-admin/tag/customerscustomerId#operation/customerCustomerRepositoryV1SavePut
                        const customerId = this.getNodeParameter('customerId', i);
                        responseData = await magentoApiRequest.call(this, 'DELETE', `/rest/default/V1/customers/${customerId}`);
                        responseData = { success: true };
                    }
                    if (operation === 'get') {
                        //https://magento.redoc.ly/2.3.7-admin/tag/customerscustomerId#operation/customerCustomerRepositoryV1GetByIdGet
                        const customerId = this.getNodeParameter('customerId', i);
                        responseData = await magentoApiRequest.call(this, 'GET', `/rest/default/V1/customers/${customerId}`);
                    }
                    if (operation === 'getAll') {
                        //https://magento.redoc.ly/2.3.7-admin/tag/customerssearch
                        const filterType = this.getNodeParameter('filterType', i);
                        const sortOption = this.getNodeParameter('options.sort', i, {});
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        let qs = {};
                        if (filterType === 'manual') {
                            const filters = this.getNodeParameter('filters', i);
                            const matchType = this.getNodeParameter('matchType', i);
                            qs = getFilterQuery(Object.assign(filters, { matchType }, sortOption));
                        }
                        else if (filterType === 'json') {
                            const filterJson = this.getNodeParameter('filterJson', i);
                            if (validateJSON(filterJson) !== undefined) {
                                qs = JSON.parse(filterJson);
                            }
                            else {
                                throw new NodeApiError(this.getNode(), {
                                    message: 'Filter (JSON) must be a valid json',
                                });
                            }
                        }
                        else {
                            qs = {
                                search_criteria: {},
                            };
                            if (Object.keys(sortOption).length !== 0) {
                                qs.search_criteria = {
                                    sort_orders: sortOption.sort,
                                };
                            }
                        }
                        if (returnAll) {
                            qs.search_criteria.page_size = 100;
                            responseData = await magentoApiRequestAllItems.call(this, 'items', 'GET', '/rest/default/V1/customers/search', {}, qs);
                        }
                        else {
                            const limit = this.getNodeParameter('limit', 0);
                            qs.search_criteria.page_size = limit;
                            responseData = await magentoApiRequest.call(this, 'GET', '/rest/default/V1/customers/search', {}, qs);
                            responseData = responseData.items;
                        }
                    }
                    if (operation === 'update') {
                        //https://magento.redoc.ly/2.3.7-admin/tag/customerscustomerId#operation/customerCustomerRepositoryV1SavePut
                        const customerId = this.getNodeParameter('customerId', i);
                        const firstName = this.getNodeParameter('firstName', i);
                        const lastName = this.getNodeParameter('lastName', i);
                        const email = this.getNodeParameter('email', i);
                        const { addresses, customAttributes, password, ...rest } = this.getNodeParameter('updateFields', i);
                        const body = {
                            customer: {
                                email,
                                firstname: firstName,
                                lastname: lastName,
                                id: parseInt(customerId, 10),
                                website_id: 0,
                            },
                        };
                        body.customer.addresses = adjustAddresses(addresses?.address || []);
                        body.customer.custom_attributes = customAttributes?.customAttribute || [];
                        body.customer.extension_attributes = [
                            'amazon_id',
                            'is_subscribed',
                            'vertex_customer_code',
                            'vertex_customer_country',
                        ].reduce((obj, value) => {
                            if (rest.hasOwnProperty(value)) {
                                const data = Object.assign(obj, { [value]: rest[value] });
                                delete rest[value];
                                return data;
                            }
                            else {
                                return obj;
                            }
                        }, {});
                        if (password) {
                            body.password = password;
                        }
                        Object.assign(body.customer, rest);
                        responseData = await magentoApiRequest.call(this, 'PUT', `/rest/V1/customers/${customerId}`, body);
                    }
                }
                if (resource === 'invoice') {
                    if (operation === 'create') {
                        ///https://magento.redoc.ly/2.3.7-admin/tag/orderorderIdinvoice
                        const orderId = this.getNodeParameter('orderId', i);
                        responseData = await magentoApiRequest.call(this, 'POST', `/rest/default/V1/order/${orderId}/invoice`);
                        responseData = { success: true };
                    }
                }
                if (resource === 'order') {
                    if (operation === 'cancel') {
                        //https://magento.redoc.ly/2.3.7-admin/tag/ordersidcancel
                        const orderId = this.getNodeParameter('orderId', i);
                        responseData = await magentoApiRequest.call(this, 'POST', `/rest/default/V1/orders/${orderId}/cancel`);
                        responseData = { success: true };
                    }
                    if (operation === 'get') {
                        //https://magento.redoc.ly/2.3.7-admin/tag/ordersid#operation/salesOrderRepositoryV1GetGet
                        const orderId = this.getNodeParameter('orderId', i);
                        responseData = await magentoApiRequest.call(this, 'GET', `/rest/default/V1/orders/${orderId}`);
                    }
                    if (operation === 'ship') {
                        ///https://magento.redoc.ly/2.3.7-admin/tag/orderorderIdship#operation/salesShipOrderV1ExecutePost
                        const orderId = this.getNodeParameter('orderId', i);
                        responseData = await magentoApiRequest.call(this, 'POST', `/rest/default/V1/order/${orderId}/ship`);
                        responseData = { success: true };
                    }
                    if (operation === 'getAll') {
                        //https://magento.redoc.ly/2.3.7-admin/tag/orders#operation/salesOrderRepositoryV1GetListGet
                        const filterType = this.getNodeParameter('filterType', i);
                        const sortOption = this.getNodeParameter('options.sort', i, {});
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        let qs = {};
                        if (filterType === 'manual') {
                            const filters = this.getNodeParameter('filters', i);
                            const matchType = this.getNodeParameter('matchType', i);
                            qs = getFilterQuery(Object.assign(filters, { matchType }, sortOption));
                        }
                        else if (filterType === 'json') {
                            const filterJson = this.getNodeParameter('filterJson', i);
                            if (validateJSON(filterJson) !== undefined) {
                                qs = JSON.parse(filterJson);
                            }
                            else {
                                throw new NodeApiError(this.getNode(), {
                                    message: 'Filter (JSON) must be a valid json',
                                });
                            }
                        }
                        else {
                            qs = {
                                search_criteria: {},
                            };
                            if (Object.keys(sortOption).length !== 0) {
                                qs.search_criteria = {
                                    sort_orders: sortOption.sort,
                                };
                            }
                        }
                        if (returnAll) {
                            qs.search_criteria.page_size = 100;
                            responseData = await magentoApiRequestAllItems.call(this, 'items', 'GET', '/rest/default/V1/orders', {}, qs);
                        }
                        else {
                            const limit = this.getNodeParameter('limit', 0);
                            qs.search_criteria.page_size = limit;
                            responseData = await magentoApiRequest.call(this, 'GET', '/rest/default/V1/orders', {}, qs);
                            responseData = responseData.items;
                        }
                    }
                }
                if (resource === 'product') {
                    if (operation === 'create') {
                        // https://magento.redoc.ly/2.3.7-admin/tag/products#operation/catalogProductRepositoryV1SavePost
                        const sku = this.getNodeParameter('sku', i);
                        const name = this.getNodeParameter('name', i);
                        const attributeSetId = this.getNodeParameter('attributeSetId', i);
                        const price = this.getNodeParameter('price', i);
                        const { customAttributes, category: _category, ...rest } = this.getNodeParameter('additionalFields', i);
                        const body = {
                            product: {
                                sku,
                                name,
                                attribute_set_id: parseInt(attributeSetId, 10),
                                price,
                            },
                        };
                        body.product.custom_attributes = customAttributes?.customAttribute || [];
                        Object.assign(body.product, rest);
                        responseData = await magentoApiRequest.call(this, 'POST', '/rest/default/V1/products', body);
                    }
                    if (operation === 'delete') {
                        //https://magento.redoc.ly/2.3.7-admin/tag/productssku#operation/catalogProductRepositoryV1DeleteByIdDelete
                        const sku = this.getNodeParameter('sku', i);
                        responseData = await magentoApiRequest.call(this, 'DELETE', `/rest/default/V1/products/${sku}`);
                        responseData = { success: true };
                    }
                    if (operation === 'get') {
                        //https://magento.redoc.ly/2.3.7-admin/tag/productssku#operation/catalogProductRepositoryV1GetGet
                        const sku = this.getNodeParameter('sku', i);
                        responseData = await magentoApiRequest.call(this, 'GET', `/rest/default/V1/products/${sku}`);
                    }
                    if (operation === 'getAll') {
                        //https://magento.redoc.ly/2.3.7-admin/tag/customerssearch
                        const filterType = this.getNodeParameter('filterType', i);
                        const sortOption = this.getNodeParameter('options.sort', i, {});
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        let qs = {};
                        if (filterType === 'manual') {
                            const filters = this.getNodeParameter('filters', i);
                            const matchType = this.getNodeParameter('matchType', i);
                            qs = getFilterQuery(Object.assign(filters, { matchType }, sortOption));
                        }
                        else if (filterType === 'json') {
                            const filterJson = this.getNodeParameter('filterJson', i);
                            if (validateJSON(filterJson) !== undefined) {
                                qs = JSON.parse(filterJson);
                            }
                            else {
                                throw new NodeApiError(this.getNode(), {
                                    message: 'Filter (JSON) must be a valid json',
                                });
                            }
                        }
                        else {
                            qs = {
                                search_criteria: {},
                            };
                            if (Object.keys(sortOption).length !== 0) {
                                qs.search_criteria = {
                                    sort_orders: sortOption.sort,
                                };
                            }
                        }
                        if (returnAll) {
                            qs.search_criteria.page_size = 100;
                            responseData = await magentoApiRequestAllItems.call(this, 'items', 'GET', '/rest/default/V1/products', {}, qs);
                        }
                        else {
                            const limit = this.getNodeParameter('limit', 0);
                            qs.search_criteria.page_size = limit;
                            responseData = await magentoApiRequest.call(this, 'GET', '/rest/default/V1/products', {}, qs);
                            responseData = responseData.items;
                        }
                    }
                    if (operation === 'update') {
                        //https://magento.redoc.ly/2.3.7-admin/tag/productssku#operation/catalogProductRepositoryV1SavePut
                        const sku = this.getNodeParameter('sku', i);
                        const { customAttributes, ...rest } = this.getNodeParameter('updateFields', i);
                        if (!Object.keys(rest).length) {
                            throw new NodeApiError(this.getNode(), {
                                message: 'At least one parameter has to be updated',
                            });
                        }
                        const body = {
                            product: {
                                sku,
                            },
                        };
                        body.product.custom_attributes = customAttributes?.customAttribute || [];
                        Object.assign(body.product, rest);
                        responseData = await magentoApiRequest.call(this, 'PUT', `/rest/default/V1/products/${sku}`, body);
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
//# sourceMappingURL=Magento2.node.js.map