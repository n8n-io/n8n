import { NodeApiError } from 'n8n-workflow';
export function FormatDueDatetime(isoString) {
    // Assuming that the problem with incorrect date format was caused by milliseconds
    // Replacing the last 5 characters of ISO-formatted string with just Z char
    return isoString.replace(new RegExp('.000Z$'), 'Z');
}
export async function todoistApiRequest(method, resource, body = {}, qs = {}) {
    const authentication = this.getNodeParameter('authentication', 0);
    const nodeVersion = this.getNode().typeVersion;
    const endpoint = nodeVersion >= 2.2 ? 'api.todoist.com/api/v1' : 'api.todoist.com/rest/v2';
    const options = {
        method,
        qs,
        uri: `https://${endpoint}${resource}`,
        json: true,
    };
    if (Object.keys(body).length !== 0) {
        options.body = body;
    }
    try {
        const credentialType = authentication === 'apiKey' ? 'todoistApi' : 'todoistOAuth2Api';
        return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function todoistSyncRequest(body = {}, qs = {}, endpoint = '/sync') {
    const authentication = this.getNodeParameter('authentication', 0, 'oAuth2');
    const nodeVersion = this.getNode().typeVersion;
    const baseUrl = nodeVersion >= 2.2 ? 'https://api.todoist.com/api/v1' : 'https://api.todoist.com/sync/v9';
    const options = {
        headers: {},
        method: 'POST',
        qs,
        uri: `${baseUrl}${endpoint}`,
        json: true,
    };
    if (Object.keys(body).length !== 0) {
        options.body = body;
    }
    try {
        const credentialType = authentication === 'oAuth2' ? 'todoistOAuth2Api' : 'todoistApi';
        return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function todoistApiGetAllRequest(ctx, resource, qs = {}, limit) {
    const nodeVersion = ctx.getNode().typeVersion;
    if (nodeVersion < 2.2) {
        let response = await todoistApiRequest.call(ctx, 'GET', resource, {}, qs);
        if (limit)
            response = response.splice(0, limit);
        return response;
    }
    if (limit !== undefined && limit <= 0)
        return [];
    const results = [];
    let nextCursor = null;
    do {
        const requestQs = { ...qs };
        if (nextCursor)
            requestQs.cursor = nextCursor;
        if (limit !== undefined && limit > 0) {
            const remainingItems = limit - results.length;
            if (remainingItems <= 0)
                break;
            requestQs.limit = Math.min(remainingItems, 200);
        }
        const response = await todoistApiRequest.call(ctx, 'GET', resource, {}, requestQs);
        if (response?.results && Array.isArray(response.results)) {
            if (limit !== undefined && limit > 0) {
                const remainingItems = limit - results.length;
                const itemsToAdd = response.results.slice(0, remainingItems);
                results.push(...itemsToAdd);
                if (results.length >= limit)
                    break;
            }
            else {
                results.push(...response.results);
            }
            nextCursor = response.next_cursor ?? null;
        }
        else {
            break;
        }
    } while (nextCursor !== null);
    return results;
}
//# sourceMappingURL=GenericFunctions.js.map