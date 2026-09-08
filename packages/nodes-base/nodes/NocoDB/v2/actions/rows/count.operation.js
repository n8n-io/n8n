import { NodeApiError, updateDisplayOptions } from 'n8n-workflow';
import { apiRequest } from '../../transport';
export const description = updateDisplayOptions({
    show: {
        operation: ['count'],
    },
}, [
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        default: {},
        placeholder: 'Add option',
        options: [
            {
                displayName: 'Filter By Formula',
                name: 'where',
                type: 'string',
                default: '',
                placeholder: '(name,like,example%)~or(name,eq,test)',
                description: 'A formula used to filter rows',
            },
        ],
    },
]);
export async function execute() {
    const items = this.getInputData();
    const returnData = [];
    let responseData;
    let requestMethod;
    let endPoint = '';
    let qs = {};
    const baseId = this.getNodeParameter('projectId', 0, undefined, {
        extractValue: true,
    });
    for (let i = 0; i < items.length; i++) {
        try {
            const table = this.getNodeParameter('table', i, undefined, {
                extractValue: true,
            });
            endPoint = `/api/v3/data/${baseId}/${table}/count`;
            requestMethod = 'GET';
            qs = this.getNodeParameter('options', i, {});
            responseData = await apiRequest.call(this, requestMethod, endPoint, {}, qs);
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
            returnData.push.apply(returnData, executionData);
        }
        catch (error) {
            if (this.continueOnFail()) {
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.toString() }), { itemData: { item: i } });
                returnData.push.apply(returnData, executionData);
            }
            else {
                throw new NodeApiError(this.getNode(), error);
            }
        }
    }
    return [returnData];
}
//# sourceMappingURL=count.operation.js.map