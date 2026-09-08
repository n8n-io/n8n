import { NodeApiError, NodeOperationError, jsonParse } from 'n8n-workflow';
import { URL } from 'url';
export async function mispApiRequest(method, endpoint, body = {}, qs = {}) {
    const { baseUrl, allowUnauthorizedCerts } = await this.getCredentials('mispApi');
    const options = {
        method,
        body,
        qs,
        uri: `${baseUrl}${endpoint}`,
        json: true,
        rejectUnauthorized: !allowUnauthorizedCerts,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    if (!Object.keys(qs).length) {
        delete options.qs;
    }
    try {
        return await this.helpers.requestWithAuthentication.call(this, 'mispApi', options);
    }
    catch (error) {
        // MISP API wrongly returns 403 for malformed requests
        if (error.statusCode === 403) {
            error.statusCode = 400;
        }
        const errors = error?.error?.errors;
        if (errors) {
            const key = Object.keys(errors)[0];
            if (key !== undefined) {
                let message = errors[key].join();
                if (message.includes(' nter')) {
                    message = message.replace(' nter', ' enter');
                }
                error.error.message = `${error.error.message}: ${message}`;
            }
        }
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function mispApiRequestAllItems(endpoint) {
    const responseData = await mispApiRequest.call(this, 'GET', endpoint);
    const returnAll = this.getNodeParameter('returnAll', 0);
    if (!returnAll) {
        const limit = this.getNodeParameter('limit', 0);
        return responseData.slice(0, limit);
    }
    return responseData;
}
export async function mispApiRestSearch(resource, itemIndex) {
    let body = {};
    const useJson = this.getNodeParameter('useJson', itemIndex);
    if (useJson) {
        const json = this.getNodeParameter('jsonOutput', itemIndex);
        if (typeof json === 'string') {
            body = jsonParse(json);
        }
        else {
            body = json;
        }
    }
    else {
        const value = this.getNodeParameter('value', itemIndex);
        const additionalFields = this.getNodeParameter('additionalFields', itemIndex);
        body.value = value;
        if (Object.keys(additionalFields).length) {
            if (additionalFields.tags) {
                additionalFields.tags = additionalFields.tags
                    .split(',')
                    .map((tag) => tag.trim());
            }
            Object.assign(body, additionalFields);
        }
    }
    const endpoint = `/${resource}/restSearch`;
    const { response } = await mispApiRequest.call(this, 'POST', endpoint, body);
    if (response) {
        if (resource === 'attributes') {
            return response.Attribute;
        }
        if (resource === 'events') {
            return response.map((event) => event.Event);
        }
        if (resource === 'objects') {
            return response.map((obj) => obj.Object);
        }
    }
    else {
        return [];
    }
}
export function throwOnEmptyUpdate(resource, updateFields) {
    if (!Object.keys(updateFields).length) {
        throw new NodeOperationError(this.getNode(), `Please enter at least one field to update for the ${resource}.`);
    }
}
const SHARING_GROUP_OPTION_ID = 4;
export function throwOnMissingSharingGroup(fields) {
    if (fields.distribution === SHARING_GROUP_OPTION_ID && !fields.sharing_group_id) {
        throw new NodeOperationError(this.getNode(), 'Please specify a sharing group');
    }
}
const isValidUrl = (str) => {
    try {
        new URL(str);
        return true;
    }
    catch (error) {
        return false;
    }
};
export function throwOnInvalidUrl(str) {
    if (!isValidUrl(str)) {
        throw new NodeOperationError(this.getNode(), 'Please specify a valid URL, protocol included. Example: https://site.com');
    }
}
//# sourceMappingURL=GenericFunctions.js.map