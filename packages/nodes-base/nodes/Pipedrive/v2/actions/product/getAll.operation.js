import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest, pipedriveApiRequestAllItemsCursor, pipedriveGetCustomProperties, } from '../../transport';
import { resolveCustomFieldsV2 } from '../../helpers';
import { rawCustomFieldOutputOption } from '../common.description';
const properties = [
    {
        displayName: 'Return All',
        name: 'returnAll',
        type: 'boolean',
        default: false,
        description: 'Whether to return all results or only up to a given limit',
    },
    {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        displayOptions: {
            show: {
                returnAll: [false],
            },
        },
        typeOptions: {
            minValue: 1,
            maxValue: 500,
        },
        default: 100,
        description: 'Max number of results to return',
    },
    rawCustomFieldOutputOption,
];
const displayOptions = {
    show: {
        resource: ['product'],
        operation: ['getAll'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute() {
    const items = this.getInputData();
    const returnData = [];
    const rawOutput = this.getNodeParameter('rawCustomFieldOutput', 0, false);
    let customProperties;
    if (!rawOutput) {
        customProperties = await pipedriveGetCustomProperties.call(this, 'product');
    }
    for (let i = 0; i < items.length; i++) {
        try {
            const returnAll = this.getNodeParameter('returnAll', i);
            const qs = {};
            if (!returnAll) {
                qs.limit = this.getNodeParameter('limit', i);
            }
            let responseData;
            if (returnAll) {
                responseData = await pipedriveApiRequestAllItemsCursor.call(this, 'GET', '/products', {}, qs);
            }
            else {
                responseData = await pipedriveApiRequest.call(this, 'GET', '/products', {}, qs);
            }
            const data = Array.isArray(responseData.data) ? responseData.data : [responseData.data];
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(data), { itemData: { item: i } });
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
//# sourceMappingURL=getAll.operation.js.map