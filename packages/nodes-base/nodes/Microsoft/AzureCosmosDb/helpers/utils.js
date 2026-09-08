import { jsonParse, NodeOperationError, OperationalError } from 'n8n-workflow';
import { HeaderConstants } from './constants';
import { ErrorMap } from './errorHandler';
import { azureCosmosDbApiRequest } from '../transport';
export async function getPartitionKey() {
    const container = this.getNodeParameter('container', undefined, {
        extractValue: true,
    });
    let partitionKeyField = undefined;
    try {
        const responseData = (await azureCosmosDbApiRequest.call(this, 'GET', `/colls/${container}`));
        partitionKeyField = responseData.partitionKey?.paths[0]?.replace('/', '');
    }
    catch (error) {
        const err = error;
        if (err.httpCode === '404') {
            err.message = ErrorMap.Container.NotFound.getMessage(container);
            err.description = ErrorMap.Container.NotFound.description;
        }
        throw err;
    }
    if (!partitionKeyField) {
        throw new NodeOperationError(this.getNode(), 'Partition key not found', {
            description: 'Failed to determine the partition key for this collection',
        });
    }
    return partitionKeyField;
}
export async function simplifyData(items, _response) {
    const simple = this.getNodeParameter('simple');
    if (!simple) {
        return items;
    }
    const simplifyFields = (data) => {
        const simplifiedData = Object.keys(data)
            .filter((key) => !key.startsWith('_'))
            .reduce((acc, key) => {
            acc[key] = data[key];
            return acc;
        }, {});
        return simplifiedData;
    };
    return items.map((item) => {
        const simplifiedData = simplifyFields(item.json);
        return { json: simplifiedData };
    });
}
export async function validateQueryParameters(requestOptions) {
    const query = this.getNodeParameter('query', '');
    const queryOptions = this.getNodeParameter('options.queryOptions');
    const parameterNames = query.replace(/\$(\d+)/g, '@Param$1').match(/@\w+/g) ?? [];
    const queryParamsJson = queryOptions?.queryParametersJson;
    const queryParamsString = queryOptions?.queryParameters;
    let parameterValues;
    if (queryParamsJson) {
        const parsed = jsonParse(queryParamsJson, {
            errorMessage: 'Query Parameters (JSON) must be a valid JSON array',
        });
        if (!Array.isArray(parsed)) {
            throw new NodeOperationError(this.getNode(), 'Query Parameters (JSON) must be a JSON array', {
                description: 'Provide values as a JSON array, e.g. [1737062400000, "01234", true, null]',
            });
        }
        parameterValues = parsed;
    }
    else {
        parameterValues = queryParamsString
            ? queryParamsString.split(',').map((param) => param.trim())
            : [];
    }
    if (parameterNames.length !== parameterValues.length) {
        throw new NodeOperationError(this.getNode(), 'Empty parameter value provided', {
            description: 'Please provide non-empty values for the query parameters',
        });
    }
    requestOptions.body = {
        ...requestOptions.body,
        parameters: parameterNames.map((name, index) => ({
            name,
            value: parameterValues[index],
        })),
    };
    return requestOptions;
}
export function processJsonInput(jsonData, inputName, fallbackValue = undefined, disallowSpacesIn) {
    let values = {};
    const input = inputName ? `'${inputName}' ` : '';
    if (typeof jsonData === 'string') {
        try {
            values = jsonParse(jsonData, { fallbackValue });
        }
        catch (error) {
            throw new OperationalError(`Input ${input}must contain a valid JSON`, { level: 'warning' });
        }
    }
    else if (jsonData && typeof jsonData === 'object') {
        values = jsonData;
    }
    else {
        throw new OperationalError(`Input ${input}must contain a valid JSON`, { level: 'warning' });
    }
    disallowSpacesIn?.forEach((key) => {
        const value = values[key];
        if (typeof value === 'string' && value.includes(' ')) {
            throw new OperationalError(`${inputName ? `'${inputName}'` : ''} property '${key}' should not contain spaces (received "${value}")`, { level: 'warning' });
        }
    });
    return values;
}
export async function validatePartitionKey(requestOptions) {
    const operation = this.getNodeParameter('operation');
    let customProperties = this.getNodeParameter('customProperties', {});
    const partitionKey = await getPartitionKey.call(this);
    if (typeof customProperties === 'string') {
        try {
            customProperties = jsonParse(customProperties);
        }
        catch (error) {
            throw new NodeOperationError(this.getNode(), 'Invalid JSON format in "Item Contents"', {
                description: 'Ensure the "Item Contents" field contains a valid JSON object',
            });
        }
    }
    let partitionKeyValue = '';
    const needsPartitionKey = ['update', 'delete', 'get'].includes(operation);
    if (operation === 'create') {
        if (!(partitionKey in customProperties) || !customProperties[partitionKey]) {
            throw new NodeOperationError(this.getNode(), "Partition key not found in 'Item Contents'", {
                description: `Partition key '${partitionKey}' must be present and have a valid, non-empty value in 'Item Contents'.`,
            });
        }
        partitionKeyValue = customProperties[partitionKey];
    }
    else if (needsPartitionKey) {
        try {
            partitionKeyValue =
                partitionKey === 'id'
                    ? String(this.getNodeParameter('item', undefined, { extractValue: true }) ?? '')
                    : String(this.getNodeParameter('additionalFields.partitionKey', undefined) ?? '');
            if (!partitionKeyValue) {
                throw new NodeOperationError(this.getNode(), 'Partition key is empty', {
                    description: 'Ensure the "Partition Key" field has a valid, non-empty value.',
                });
            }
        }
        catch (error) {
            throw new NodeOperationError(this.getNode(), 'Partition key is missing or empty', {
                description: 'Ensure the "Partition Key" field exists and has a valid, non-empty value.',
            });
        }
        if (operation === 'update') {
            const idValue = String(this.getNodeParameter('item', undefined, { extractValue: true }) ?? '');
            requestOptions.body.id = idValue;
            requestOptions.body[partitionKey] = partitionKeyValue;
        }
    }
    requestOptions.headers = {
        ...requestOptions.headers,
        [HeaderConstants.X_MS_DOCUMENTDB_PARTITIONKEY]: `["${partitionKeyValue}"]`,
    };
    return requestOptions;
}
export async function validateCustomProperties(requestOptions) {
    const rawCustomProperties = this.getNodeParameter('customProperties');
    const customProperties = processJsonInput(rawCustomProperties, 'Item Contents');
    if (Object.keys(customProperties).length === 0 ||
        Object.values(customProperties).every((val) => val === undefined || val === null || val === '')) {
        throw new NodeOperationError(this.getNode(), 'Item contents are empty', {
            description: 'Ensure the "Item Contents" field contains at least one valid property.',
        });
    }
    requestOptions.body = {
        ...requestOptions.body,
        ...customProperties,
    };
    return requestOptions;
}
export const untilContainerSelected = { container: [''] };
export const untilItemSelected = { item: [''] };
//# sourceMappingURL=utils.js.map