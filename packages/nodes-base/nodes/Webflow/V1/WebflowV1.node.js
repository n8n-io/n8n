import { NodeConnectionTypes, } from 'n8n-workflow';
import { itemFields, itemOperations } from './ItemDescription';
import { webflowApiRequest, webflowApiRequestAllItems, getSites, getCollections, getFields, } from '../GenericFunctions';
export class WebflowV1 {
    description;
    constructor(baseDescription) {
        this.description = {
            ...baseDescription,
            version: 1,
            description: 'Consume the Webflow API',
            subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
            defaults: {
                name: 'Webflow',
            },
            inputs: [NodeConnectionTypes.Main],
            outputs: [NodeConnectionTypes.Main],
            credentials: [
                {
                    name: 'webflowApi',
                    required: true,
                    displayOptions: {
                        show: {
                            authentication: ['accessToken'],
                        },
                    },
                },
                {
                    name: 'webflowOAuth2Api',
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
                    ],
                    default: 'accessToken',
                },
                {
                    displayName: 'Resource',
                    name: 'resource',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        {
                            name: 'Item',
                            value: 'item',
                        },
                    ],
                    default: 'item',
                },
                ...itemOperations,
                ...itemFields,
            ],
        };
    }
    methods = {
        loadOptions: {
            getSites,
            getCollections,
            getFields,
        },
    };
    async execute() {
        const items = this.getInputData();
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        let responseData;
        const returnData = [];
        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'item') {
                    // *********************************************************************
                    //                             item
                    // *********************************************************************
                    // https://developers.webflow.com/#item-model
                    if (operation === 'create') {
                        // ----------------------------------
                        //         item: create
                        // ----------------------------------
                        // https://developers.webflow.com/#create-new-collection-item
                        const collectionId = this.getNodeParameter('collectionId', i);
                        const properties = this.getNodeParameter('fieldsUi.fieldValues', i, []);
                        const live = this.getNodeParameter('live', i);
                        const fields = {};
                        properties.forEach((data) => (fields[data.fieldId] = data.fieldValue));
                        const body = {
                            fields,
                        };
                        responseData = await webflowApiRequest.call(this, 'POST', `/collections/${collectionId}/items`, body, { live });
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         item: delete
                        // ----------------------------------
                        // https://developers.webflow.com/#remove-collection-item
                        const collectionId = this.getNodeParameter('collectionId', i);
                        const itemId = this.getNodeParameter('itemId', i);
                        responseData = await webflowApiRequest.call(this, 'DELETE', `/collections/${collectionId}/items/${itemId}`);
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         item: get
                        // ----------------------------------
                        // https://developers.webflow.com/#get-single-item
                        const collectionId = this.getNodeParameter('collectionId', i);
                        const itemId = this.getNodeParameter('itemId', i);
                        responseData = await webflowApiRequest.call(this, 'GET', `/collections/${collectionId}/items/${itemId}`);
                        responseData = responseData.items;
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         item: getAll
                        // ----------------------------------
                        // https://developers.webflow.com/#get-all-items-for-a-collection
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        const collectionId = this.getNodeParameter('collectionId', i);
                        const qs = {};
                        if (returnAll) {
                            responseData = await webflowApiRequestAllItems.call(this, 'GET', `/collections/${collectionId}/items`, {}, qs);
                        }
                        else {
                            qs.limit = this.getNodeParameter('limit', 0);
                            responseData = await webflowApiRequest.call(this, 'GET', `/collections/${collectionId}/items`, {}, qs);
                            responseData = responseData.items;
                        }
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //         item: update
                        // ----------------------------------
                        // https://developers.webflow.com/#update-collection-item
                        const collectionId = this.getNodeParameter('collectionId', i);
                        const itemId = this.getNodeParameter('itemId', i);
                        const properties = this.getNodeParameter('fieldsUi.fieldValues', i, []);
                        const live = this.getNodeParameter('live', i);
                        const fields = {};
                        properties.forEach((data) => (fields[data.fieldId] = data.fieldValue));
                        const body = {
                            fields,
                        };
                        responseData = await webflowApiRequest.call(this, 'PUT', `/collections/${collectionId}/items/${itemId}`, body, { live });
                    }
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message } });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=WebflowV1.node.js.map