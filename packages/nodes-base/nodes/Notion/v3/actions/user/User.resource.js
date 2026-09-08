import { returnAllOrLimit } from '../common.descriptions';
import { handleOperationError } from '../../helpers/utils';
import { notionApiRequestAllItemsV3, notionApiRequestV3 } from '../../transport';
export const description = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['user'] } },
        options: [
            { name: 'Get', value: 'get', description: 'Get a user', action: 'Get a user' },
            {
                name: 'Get Many',
                value: 'getAll',
                description: 'Get many users',
                action: 'Get many users',
            },
        ],
        default: 'get',
    },
    {
        displayName: 'User ID',
        name: 'userId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['user'], operation: ['get'] } },
    },
    ...returnAllOrLimit('user', 'getAll'),
];
export async function get(items) {
    const returnData = [];
    for (let i = 0; i < items.length; i++) {
        try {
            const userId = this.getNodeParameter('userId', i);
            const response = await notionApiRequestV3.call(this, 'GET', `/users/${userId}`);
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(response), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        catch (error) {
            handleOperationError.call(this, returnData, error, i);
        }
    }
    return returnData;
}
export async function getAll(items) {
    const returnData = [];
    for (let i = 0; i < items.length; i++) {
        try {
            const returnAll = this.getNodeParameter('returnAll', i);
            const limit = returnAll ? undefined : this.getNodeParameter('limit', i);
            const response = await notionApiRequestAllItemsV3.call(this, 'results', 'GET', '/users', {}, limit ? { limit } : {});
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(response), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        catch (error) {
            handleOperationError.call(this, returnData, error, i);
        }
    }
    return returnData;
}
//# sourceMappingURL=User.resource.js.map