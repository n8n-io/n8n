import { NodeOperationError, jsonParse } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { theHiveApiRequest } from '../../transport';
const properties = [
    {
        displayName: 'Query',
        name: 'queryJson',
        type: 'json',
        required: true,
        default: '=[\n  {\n    "_name": "listOrganisation"\n  }\n]',
        description: 'Search for objects with filtering and sorting capabilities',
        hint: 'The query should be an array of operations with the required selection and optional filtering, sorting, and pagination. See <a href="https://docs.strangebee.com/thehive/api-docs/#operation/Query%20API" target="_blank">Query API</a> for more information.',
        typeOptions: {
            rows: 10,
        },
    },
];
const displayOptions = {
    show: {
        resource: ['query'],
        operation: ['executeQuery'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    let responseData = [];
    const queryJson = this.getNodeParameter('queryJson', i);
    let query = {};
    if (typeof queryJson === 'object') {
        query = queryJson;
    }
    else {
        query = jsonParse(queryJson, {
            errorMessage: 'Query JSON must be a valid JSON object',
        });
    }
    if (query.query) {
        query = query.query;
    }
    if (!Array.isArray(query)) {
        throw new NodeOperationError(this.getNode(), 'The query should be an array of operations with the required selection and optional filtering, sorting, and pagination');
    }
    const body = {
        query,
    };
    responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body);
    if (typeof responseData !== 'object') {
        responseData = { queryResult: responseData };
    }
    const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=executeQuery.operation.js.map