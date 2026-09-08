import { NodeApiError, NodeOperationError } from 'n8n-workflow';
export async function pipedriveApiRequest(method, endpoint, body, query = {}, option = {}) {
    const apiVersion = option.apiVersion ?? 'v2';
    const baseUrl = apiVersion === 'v1' ? 'https://api.pipedrive.com/v1' : 'https://api.pipedrive.com/api/v2';
    const authenticationMethod = this.getNodeParameter('authentication', 0);
    const options = {
        headers: {
            Accept: 'application/json',
        },
        method,
        qs: query,
        uri: `${baseUrl}${endpoint}`,
    };
    if (option.downloadFile === true) {
        options.encoding = null;
    }
    else {
        options.json = true;
    }
    if (Object.keys(body).length !== 0) {
        options.body = body;
    }
    if (option.formData !== undefined && Object.keys(option.formData).length !== 0) {
        options.formData = option.formData;
    }
    try {
        const credentialType = authenticationMethod === 'apiToken' ? 'pipedriveApi' : 'pipedriveOAuth2Api';
        const responseData = await this.helpers.requestWithAuthentication.call(this, credentialType, options);
        if (option.downloadFile === true) {
            return {
                additionalData: {},
                data: responseData,
            };
        }
        if (responseData.success === false) {
            throw new NodeApiError(this.getNode(), responseData);
        }
        return {
            additionalData: responseData.additional_data ?? {},
            data: responseData.data ?? [],
        };
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function pipedriveApiRequestAllItemsCursor(method, endpoint, body, query = {}) {
    query.limit = 500;
    const returnData = [];
    let responseData;
    do {
        responseData = await pipedriveApiRequest.call(this, method, endpoint, body, query);
        const data = Array.isArray(responseData.data) ? responseData.data : [];
        returnData.push(...data);
        const nextCursor = responseData.additionalData?.next_cursor;
        if (nextCursor) {
            query.cursor = nextCursor;
        }
        else {
            break;
        }
    } while (true);
    return { data: returnData };
}
export async function pipedriveApiRequestAllItemsOffset(method, endpoint, body, query = {}) {
    query.limit = 100;
    query.start = 0;
    const returnData = [];
    let responseData;
    do {
        responseData = await pipedriveApiRequest.call(this, method, endpoint, body, query, {
            apiVersion: 'v1',
        });
        const data = responseData.data;
        if (Array.isArray(data)) {
            if (data.length > 0 && data[0].item !== undefined) {
                returnData.push(...data);
            }
            else if (data.length > 0 && data[0].items !== undefined) {
                returnData.push(...data);
            }
            else {
                returnData.push(...data);
            }
        }
        else if (data && typeof data === 'object' && 'items' in data) {
            returnData.push(...data.items);
        }
        const pagination = responseData.additionalData?.pagination;
        if (pagination?.more_items_in_collection === true) {
            query.start = pagination.next_start;
        }
        else {
            break;
        }
    } while (true);
    return { data: returnData };
}
export async function pipedriveGetCustomProperties(resource) {
    const v2Endpoints = {
        activity: '/activityFields',
        deal: '/dealFields',
        organization: '/organizationFields',
        person: '/personFields',
        product: '/productFields',
    };
    const v1Endpoints = {
        lead: '/leadFields',
    };
    let responseData;
    if (v2Endpoints[resource] !== undefined) {
        responseData = await pipedriveApiRequestAllItemsCursor.call(this, 'GET', v2Endpoints[resource], {});
    }
    else if (v1Endpoints[resource] !== undefined) {
        responseData = await pipedriveApiRequestAllItemsOffset.call(this, 'GET', v1Endpoints[resource], {});
    }
    else {
        throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not supported for resolving custom values!`);
    }
    const customProperties = {};
    for (const field of responseData.data) {
        // v2 Fields API uses field_code/field_name, v1 uses key/name
        const fieldKey = (field.field_code ?? field.key);
        const fieldName = (field.field_name ?? field.name);
        if (fieldKey && fieldName) {
            customProperties[fieldKey] = {
                name: fieldName,
                key: fieldKey,
                field_type: field.field_type,
                options: field.options,
            };
        }
    }
    return customProperties;
}
export function sortOptionParameters(optionParameters) {
    optionParameters.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        if (aName < bName)
            return -1;
        if (aName > bName)
            return 1;
        return 0;
    });
    return optionParameters;
}
//# sourceMappingURL=pipedrive.api.js.map