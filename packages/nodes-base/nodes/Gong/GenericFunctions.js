import get from 'lodash/get';
import { NodeApiError } from 'n8n-workflow';
export async function gongApiRequest(method, endpoint, body = {}, query = {}) {
    const authentication = this.getNodeParameter('authentication', 0);
    const credentialsType = authentication === 'oAuth2' ? 'gongOAuth2Api' : 'gongApi';
    const { baseUrl } = await this.getCredentials(credentialsType);
    const options = {
        method,
        url: baseUrl.replace(new RegExp('/$'), '') + endpoint,
        json: true,
        headers: {
            'Content-Type': 'application/json',
        },
        body,
        qs: query,
    };
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    return await this.helpers.requestWithAuthentication.call(this, credentialsType, options);
}
export async function gongApiPaginateRequest(method, endpoint, body = {}, query = {}, itemIndex = 0, rootProperty = undefined) {
    const authentication = this.getNodeParameter('authentication', 0);
    const credentialsType = authentication === 'oAuth2' ? 'gongOAuth2Api' : 'gongApi';
    const { baseUrl } = await this.getCredentials(credentialsType);
    const options = {
        method,
        url: baseUrl.replace(new RegExp('/$'), '') + endpoint,
        json: true,
        headers: {
            'Content-Type': 'application/json',
        },
        body,
        qs: query,
    };
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    const pages = await this.helpers.requestWithAuthenticationPaginated.call(this, options, itemIndex, {
        requestInterval: 340, // Rate limit 3 calls per second
        continue: '={{ $response.body.records.cursor }}',
        request: {
            [method === 'POST' ? 'body' : 'qs']: '={{ $if($response.body?.records.cursor, { cursor: $response.body.records.cursor }, {}) }}',
            url: options.url,
        },
    }, credentialsType);
    if (rootProperty) {
        let results = [];
        for (const page of pages) {
            const items = page.body[rootProperty];
            if (items) {
                results = results.concat(items);
            }
        }
        return results;
    }
    else {
        return pages.flat();
    }
}
const getCursorPaginator = (extractItems) => {
    return async function cursorPagination(requestOptions) {
        let executions = [];
        let responseData;
        let nextCursor = undefined;
        const returnAll = this.getNodeParameter('returnAll', true);
        do {
            requestOptions.options.body.cursor = nextCursor;
            responseData = await this.makeRoutingRequest(requestOptions);
            const lastItem = responseData[responseData.length - 1].json;
            nextCursor = lastItem.records?.cursor;
            executions = executions.concat(extractItems(responseData));
        } while (returnAll && nextCursor);
        return executions;
    };
};
export const extractCalls = (items) => {
    const calls = items.flatMap((item) => get(item.json, 'calls'));
    return calls.map((call) => {
        const { metaData, ...rest } = call ?? {};
        return { json: { ...metaData, ...rest } };
    });
};
export const extractUsers = (items) => {
    const users = items.flatMap((item) => get(item.json, 'users'));
    return users.map((user) => ({ json: user }));
};
export const getCursorPaginatorCalls = () => {
    return getCursorPaginator(extractCalls);
};
export const getCursorPaginatorUsers = () => {
    return getCursorPaginator(extractUsers);
};
export async function handleErrorPostReceive(data, response) {
    if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
        const { resource, operation } = this.getNode().parameters;
        if (resource === 'call') {
            if (operation === 'get') {
                if (response.statusCode === 404) {
                    throw new NodeApiError(this.getNode(), response, {
                        message: "The required call doesn't match any existing one",
                        description: "Double-check the value in the parameter 'Call to Get' and try again",
                    });
                }
            }
            else if (operation === 'getAll') {
                if (response.statusCode === 404) {
                    const primaryUserId = this.getNodeParameter('filters.primaryUserIds', {});
                    if (Object.keys(primaryUserId).length !== 0) {
                        return [{ json: {} }];
                    }
                }
                else if (response.statusCode === 400 || response.statusCode === 500) {
                    throw new NodeApiError(this.getNode(), response, {
                        description: 'Double-check the value(s) in the parameter(s)',
                    });
                }
            }
        }
        else if (resource === 'user') {
            if (operation === 'get') {
                if (response.statusCode === 404) {
                    throw new NodeApiError(this.getNode(), response, {
                        message: "The required user doesn't match any existing one",
                        description: "Double-check the value in the parameter 'User to Get' and try again",
                    });
                }
            }
            else if (operation === 'getAll') {
                if (response.statusCode === 404) {
                    const userIds = this.getNodeParameter('filters.userIds', '');
                    if (userIds) {
                        throw new NodeApiError(this.getNode(), response, {
                            message: "The Users IDs don't match any existing user",
                            description: "Double-check the values in the parameter 'Users IDs' and try again",
                        });
                    }
                }
            }
        }
        throw new NodeApiError(this.getNode(), response);
    }
    return data;
}
export function isValidNumberIds(value) {
    if (typeof value === 'number') {
        return true;
    }
    if (Array.isArray(value) && value.every((item) => typeof item === 'number')) {
        return true;
    }
    if (typeof value === 'string') {
        const parts = value.split(',');
        return parts.every((part) => !isNaN(Number(part.trim())));
    }
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
        return true;
    }
    return false;
}
//# sourceMappingURL=GenericFunctions.js.map