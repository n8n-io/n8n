import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest, pipedriveGetCustomProperties } from '../../transport';
import { encodeCustomFieldsV2, resolveCustomFieldsV2, addFieldsToBody } from '../../helpers';
import { customFieldsCollection, rawCustomFieldKeysOption, visibleToOption, } from '../common.description';
const properties = [
    {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        default: '',
        required: true,
        description: 'The name of the product',
    },
    {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        options: [
            {
                displayName: 'Code',
                name: 'code',
                type: 'string',
                default: '',
                description: 'The product code',
            },
            {
                displayName: 'Owner ID',
                name: 'owner_id',
                type: 'number',
                default: 0,
                description: 'ID of the user who will be marked as the owner of this product',
            },
            {
                displayName: 'Prices',
                name: 'prices',
                type: 'fixedCollection',
                default: {},
                typeOptions: {
                    multipleValues: true,
                },
                placeholder: 'Add Price',
                options: [
                    {
                        displayName: 'Price',
                        name: 'pricesValues',
                        values: [
                            {
                                displayName: 'Price',
                                name: 'price',
                                type: 'number',
                                default: 0,
                                typeOptions: {
                                    numberPrecision: 2,
                                },
                                description: 'The price of the product',
                            },
                            {
                                displayName: 'Currency',
                                name: 'currency',
                                type: 'string',
                                default: 'USD',
                                description: 'The currency of the price (3-letter code, e.g. USD, EUR)',
                            },
                            {
                                displayName: 'Cost',
                                name: 'cost',
                                type: 'number',
                                default: 0,
                                typeOptions: {
                                    numberPrecision: 2,
                                },
                                description: 'The cost of the product',
                            },
                        ],
                    },
                ],
            },
            {
                displayName: 'Tax',
                name: 'tax',
                type: 'number',
                default: 0,
                description: 'The tax percentage',
                typeOptions: {
                    minValue: 0,
                    maxValue: 100,
                },
            },
            {
                displayName: 'Unit',
                name: 'unit',
                type: 'string',
                default: '',
                description: 'The unit in which this product is sold',
            },
            visibleToOption,
            customFieldsCollection,
        ],
    },
    rawCustomFieldKeysOption,
];
const displayOptions = {
    show: {
        resource: ['product'],
        operation: ['create'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute() {
    const items = this.getInputData();
    const returnData = [];
    const rawKeys = this.getNodeParameter('rawCustomFieldKeys', 0, false);
    let customProperties;
    if (!rawKeys) {
        customProperties = await pipedriveGetCustomProperties.call(this, 'product');
    }
    for (let i = 0; i < items.length; i++) {
        try {
            const body = {};
            body.name = this.getNodeParameter('name', i);
            const additionalFields = this.getNodeParameter('additionalFields', i);
            addFieldsToBody(body, additionalFields);
            // Unpack the prices fixed-collection into the format the API expects
            if (body.prices && body.prices.pricesValues) {
                body.prices = body.prices.pricesValues;
            }
            if (customProperties) {
                encodeCustomFieldsV2(customProperties, body);
            }
            const responseData = await pipedriveApiRequest.call(this, 'POST', '/products', body);
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData.data), { itemData: { item: i } });
            if (customProperties) {
                for (const item of executionData) {
                    resolveCustomFieldsV2(customProperties, item);
                }
            }
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
    return returnData;
}
//# sourceMappingURL=create.operation.js.map